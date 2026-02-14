use crate::models::*;
use anyhow::{Context, Result};
use sqlx::{Pool, QueryBuilder, Row, Sqlite};
use std::collections::HashMap;

pub struct SearchEngine {
    pool: Pool<Sqlite>,
}

impl SearchEngine {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn search(&self, query: SearchQuery) -> Result<SearchResult> {
        let limit = query.limit.unwrap_or(50);
        let offset = query.offset.unwrap_or(0);
        let search_query = Self::prepare_fts_query(&query.query);
        let use_rank_and_snippet = limit <= 100;

        let mut fts_builder = QueryBuilder::<Sqlite>::new("SELECT rowid, ");
        if use_rank_and_snippet {
            fts_builder.push("snippet(search_index, 1, '**', '**', '...', 10) AS snippet ");
        } else {
            fts_builder.push("NULL AS snippet ");
        }
        fts_builder.push("FROM search_index WHERE search_index MATCH ");
        fts_builder.push_bind(&search_query);

        match query.item_type {
            Some(ItemType::Documentation) => {
                fts_builder.push(" AND rowid < 0");
            }
            Some(ItemType::Snippet | ItemType::Config | ItemType::Note | ItemType::Link) => {
                fts_builder.push(" AND rowid IN (SELECT id FROM items WHERE type = ");
                let type_str = match query.item_type {
                    Some(ItemType::Snippet) => "snippet",
                    Some(ItemType::Config) => "config",
                    Some(ItemType::Note) => "note",
                    Some(ItemType::Link) => "link",
                    _ => "",
                };
                fts_builder.push_bind(type_str);
                fts_builder.push(")");
            }
            _ => {}
        }

        if let Some(ref tag_ids) = query.tag_ids {
            if !tag_ids.is_empty() {
                fts_builder.push(
                    " AND (rowid < 0 OR rowid IN (SELECT item_id FROM item_tags WHERE tag_id IN (",
                );
                let mut separated = fts_builder.separated(", ");
                for tag_id in tag_ids {
                    separated.push_bind(tag_id);
                }
                separated.push_unseparated(")))");
            }
        }

        if use_rank_and_snippet {
            fts_builder.push(" ORDER BY bm25(search_index) ");
        }
        fts_builder.push(" LIMIT ");
        fts_builder.push_bind(limit);
        fts_builder.push(" OFFSET ");
        fts_builder.push_bind(offset);

        let fts_rows = fts_builder
            .build()
            .fetch_all(&self.pool)
            .await
            .context("Failed to search in FTS index")?;

        let allow_items = matches!(
            query.item_type,
            None | Some(ItemType::Snippet | ItemType::Config | ItemType::Note | ItemType::Link)
        );
        let allow_docs = matches!(query.item_type, None | Some(ItemType::Documentation));

        let mut ordered_hits: Vec<(i64, Option<String>)> = Vec::with_capacity(fts_rows.len());
        let mut item_ids: Vec<i64> = Vec::new();
        let mut doc_ids: Vec<i64> = Vec::new();

        for fts_row in fts_rows {
            let rowid: i64 = fts_row.get("rowid");
            let snippet: Option<String> = fts_row.get("snippet");
            ordered_hits.push((rowid, snippet.clone()));

            if rowid > 0 {
                if allow_items {
                    item_ids.push(rowid);
                }
            } else if allow_docs {
                doc_ids.push(-rowid);
            }
        }

        let (items_map, tags_map) = if allow_items {
            let items_map = self.get_items_for_search(&item_ids, &query).await?;
            let tag_ids_for_items: Vec<i64> = items_map.keys().copied().collect();
            let tags_map = self.get_item_tags_map(&tag_ids_for_items).await?;
            (items_map, tags_map)
        } else {
            (HashMap::new(), HashMap::new())
        };

        let doc_map = if allow_docs {
            self.get_doc_entries_for_search(&doc_ids).await?
        } else {
            HashMap::new()
        };

        let mut result_items = Vec::new();
        for (rowid, snippet) in ordered_hits {
            if result_items.len() >= limit as usize {
                break;
            }

            if rowid > 0 {
                let Some(item) = items_map.get(&rowid).cloned() else {
                    continue;
                };
                let tags = tags_map.get(&rowid).cloned().unwrap_or_default();
                let highlights = snippet
                    .filter(|value| !value.is_empty())
                    .map(|value| vec![value])
                    .unwrap_or_default();
                result_items.push(ItemWithTags {
                    item,
                    tags,
                    highlights: Some(highlights),
                });
            } else {
                let doc_entry_id = -rowid;
                let Some((item, tags)) = doc_map.get(&doc_entry_id).cloned() else {
                    continue;
                };
                let highlights = snippet
                    .filter(|value| !value.is_empty())
                    .map(|value| vec![value])
                    .unwrap_or_default();
                result_items.push(ItemWithTags {
                    item,
                    tags,
                    highlights: Some(highlights),
                });
            }
        }

        let total = result_items.len() as i64;

        Ok(SearchResult {
            items: result_items,
            total,
        })
    }

    async fn get_items_for_search(
        &self,
        ids: &[i64],
        query: &SearchQuery,
    ) -> Result<HashMap<i64, Item>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut builder = QueryBuilder::<Sqlite>::new(
            "SELECT id, type, title, description, created_at, updated_at, metadata
             FROM items WHERE id IN (",
        );
        let mut separated = builder.separated(", ");
        for id in ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");

        if let Some(ref item_type) = query.item_type {
            let type_str = match item_type {
                ItemType::Snippet => "snippet",
                ItemType::Config => "config",
                ItemType::Note => "note",
                ItemType::Link => "link",
                _ => return Ok(HashMap::new()),
            };
            builder.push(" AND type = ");
            builder.push_bind(type_str);
        }

        if let Some(ref tag_ids) = query.tag_ids {
            if !tag_ids.is_empty() {
                builder.push(
                    " AND EXISTS (SELECT 1 FROM item_tags it WHERE it.item_id = items.id AND it.tag_id IN (",
                );
                let mut tag_separated = builder.separated(", ");
                for tag_id in tag_ids {
                    tag_separated.push_bind(tag_id);
                }
                tag_separated.push_unseparated("))");
            }
        }

        let rows = builder.build().fetch_all(&self.pool).await?;
        let mut map = HashMap::with_capacity(rows.len());
        for row in rows {
            let id: i64 = row.get("id");
            let item = Item {
                id,
                item_type: Self::parse_item_type(row.get("type"))?,
                title: row.get("title"),
                description: row.get("description"),
                content: String::new(),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                metadata: row
                    .get::<Option<String>, _>("metadata")
                    .and_then(|s| serde_json::from_str(&s).ok()),
            };
            map.insert(id, item);
        }

        Ok(map)
    }

    async fn get_doc_entries_for_search(
        &self,
        ids: &[i64],
    ) -> Result<HashMap<i64, (Item, Vec<Tag>)>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut builder = QueryBuilder::<Sqlite>::new(
            "SELECT de.id, de.title, de.created_at, de.path, d.display_name, d.id as doc_real_id
             FROM doc_entries de
             JOIN documentations d ON de.doc_id = d.id
             WHERE de.id IN (",
        );
        let mut separated = builder.separated(", ");
        for id in ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");

        let rows = builder.build().fetch_all(&self.pool).await?;
        let mut map = HashMap::with_capacity(rows.len());
        for row in rows {
            let entry_id: i64 = row.get("id");
            let doc_name: String = row.get("display_name");
            let path: String = row.get("path");
            let doc_id: i64 = row.get("doc_real_id");

            let item = Item {
                id: -entry_id, // use negative id for docs
                item_type: ItemType::Documentation,
                title: format!("{} > {}", doc_name, row.get::<String, _>("title")),
                description: Some(path),
                content: String::new(),
                created_at: row.get("created_at"),
                updated_at: row.get("created_at"),
                metadata: Some(
                    serde_json::json!({ "docId": doc_id, "path": row.get::<String, _>("path") }),
                ),
            };

            let tags = vec![Tag {
                id: -doc_id,
                name: doc_name,
            }];

            map.insert(entry_id, (item, tags));
        }

        Ok(map)
    }

    fn prepare_fts_query(query: &str) -> String {
        let terms: Vec<&str> = query.split_whitespace().collect();

        if terms.is_empty() {
            return String::from("*");
        }

        if terms.len() == 1 {
            return format!("\"{}\"*", terms[0]);
        }

        terms
            .iter()
            .map(|term| format!("\"{}\"*", term))
            .collect::<Vec<_>>()
            .join(" AND ")
    }

    async fn get_item_tags_map(&self, item_ids: &[i64]) -> Result<HashMap<i64, Vec<Tag>>> {
        if item_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut builder = QueryBuilder::<Sqlite>::new(
            "SELECT it.item_id, t.id, t.name
             FROM tags t
             INNER JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id IN (",
        );
        let mut separated = builder.separated(", ");
        for item_id in item_ids {
            separated.push_bind(item_id);
        }
        separated.push_unseparated(") ORDER BY t.name");

        let rows = builder.build().fetch_all(&self.pool).await?;
        let mut map: HashMap<i64, Vec<Tag>> = HashMap::new();
        for row in rows {
            let item_id: i64 = row.get("item_id");
            let tag = Tag {
                id: row.get("id"),
                name: row.get("name"),
            };
            map.entry(item_id).or_default().push(tag);
        }

        Ok(map)
    }

    fn parse_item_type(s: &str) -> Result<ItemType> {
        match s {
            "snippet" => Ok(ItemType::Snippet),
            "config" => Ok(ItemType::Config),
            "note" => Ok(ItemType::Note),
            "link" => Ok(ItemType::Link),
            "documentation" => Ok(ItemType::Documentation),
            _ => anyhow::bail!("Unknown item type: {}", s),
        }
    }
}
