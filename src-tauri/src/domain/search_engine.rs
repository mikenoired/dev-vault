use crate::models::*;
use anyhow::{Context, Result};
use sqlx::{Pool, Row, Sqlite};

pub struct SearchEngine {
    pool: Pool<Sqlite>,
}

impl SearchEngine {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn search(&self, query: SearchQuery) -> Result<SearchResult> {
        let limit = query.limit.unwrap_or(50);
        let search_query = Self::prepare_fts_query(&query.query);
        
        // Получаем подходящие rowid из индекса
        // Мы берем чуть больше, чтобы после фильтрации по типу осталось достаточно
        let fts_rows = sqlx::query(
            "SELECT rowid FROM search_index WHERE search_index MATCH ? LIMIT ?"
        )
        .bind(&search_query)
        .bind(limit * 2) 
        .fetch_all(&self.pool)
        .await
        .context("Failed to search in FTS index")?;

        let mut result_items = Vec::new();
        for fts_row in fts_rows {
            let rowid: i64 = fts_row.get("rowid");
            
            if rowid > 0 {
                // Обычный айтем (snippet, note, etc.)
                if query.item_type.is_some() && !matches!(query.item_type, Some(ItemType::Snippet | ItemType::Config | ItemType::Note | ItemType::Link)) {
                    continue;
                }
                if let Some(item) = self.get_item_for_search(rowid, &query).await? {
                    result_items.push(item);
                }
            } else {
                // Запись документации
                if query.item_type.is_some() && !matches!(query.item_type, Some(ItemType::Documentation)) {
                    continue;
                }
                let doc_entry_id = -rowid;
                if let Some(item) = self.get_doc_entry_for_search(doc_entry_id, &query).await? {
                    result_items.push(item);
                }
            }

            if result_items.len() >= limit as usize {
                break;
            }
        }

        let total = result_items.len() as i64;

        Ok(SearchResult {
            items: result_items,
            total,
        })
    }

    async fn get_item_for_search(&self, id: i64, query: &SearchQuery) -> Result<Option<ItemWithTags>> {
        let mut sql = String::from(
            "SELECT id, type, title, description, content, created_at, updated_at, metadata
             FROM items WHERE id = ?"
        );

        if let Some(ref item_type) = query.item_type {
            let type_str = match item_type {
                ItemType::Snippet => "snippet",
                ItemType::Config => "config",
                ItemType::Note => "note",
                ItemType::Link => "link",
                _ => return Ok(None),
            };
            sql.push_str(" AND type = '");
            sql.push_str(type_str);
            sql.push_str("'");
        }

        let row = sqlx::query(&sql)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let item = Item {
                id: row.get("id"),
                item_type: Self::parse_item_type(row.get("type"))?,
                title: row.get("title"),
                description: row.get("description"),
                content: row.get("content"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                metadata: row.get::<Option<String>, _>("metadata").and_then(|s| serde_json::from_str(&s).ok()),
            };

            let tags = self.get_item_tags(id).await?;
            
            // Фильтрация по тегам если нужно
            if let Some(ref tag_ids) = query.tag_ids {
                if !tag_ids.is_empty() {
                    let has_tag = tags.iter().any(|t| tag_ids.contains(&t.id));
                    if !has_tag { return Ok(None); }
                }
            }

            let highlights = Self::extract_highlights(&item.content, &query.query);
            Ok(Some(ItemWithTags { item, tags, highlights: Some(highlights) }))
        } else {
            Ok(None)
        }
    }

    async fn get_doc_entry_for_search(&self, id: i64, query: &SearchQuery) -> Result<Option<ItemWithTags>> {
        let row = sqlx::query(
            "SELECT de.id, de.title, de.content, de.created_at, de.path, d.display_name, d.id as doc_real_id
             FROM doc_entries de
             JOIN documentations d ON de.doc_id = d.id
             WHERE de.id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let doc_name: String = row.get("display_name");
            let path: String = row.get("path");
            let doc_id: i64 = row.get("doc_real_id");

            let item = Item {
                id: -id, // Возвращаем отрицательный ID для фронтенда, чтобы он знал что это дока
                item_type: ItemType::Documentation,
                title: format!("{} > {}", doc_name, row.get::<String, _>("title")),
                description: Some(path),
                content: row.get("content"),
                created_at: row.get("created_at"),
                updated_at: row.get("created_at"),
                metadata: Some(serde_json::json!({ "docId": doc_id, "path": row.get::<String, _>("path") })),
            };

            // Для документации тегом выступает название самой доки
            let tags = vec![Tag { id: -doc_id, name: doc_name }];

            let highlights = Self::extract_highlights(&item.content, &query.query);
            Ok(Some(ItemWithTags { item, tags, highlights: Some(highlights) }))
        } else {
            Ok(None)
        }
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

    async fn get_item_tags(&self, item_id: i64) -> Result<Vec<Tag>> {
        let rows = sqlx::query(
            "SELECT t.id, t.name
             FROM tags t
             INNER JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id = ?
             ORDER BY t.name"
        )
        .bind(item_id)
        .fetch_all(&self.pool)
        .await
        .context("Failed to get item tags")?;

        Ok(rows.iter().map(|r| Tag {
            id: r.get("id"),
            name: r.get("name"),
        }).collect())
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

    fn extract_highlights(content: &str, query: &str) -> Vec<String> {
        let mut highlights = Vec::new();
        if query.is_empty() {
            return highlights;
        }

        let content_lower = content.to_lowercase();
        let query_lower = query.to_lowercase();
        
        let terms: Vec<&str> = query_lower.split_whitespace().collect();
        
        for term in terms {
            let mut start = 0;
            while let Some(pos) = content_lower[start..].find(term) {
                let actual_pos = start + pos;
                let before_start = actual_pos.saturating_sub(10);
                let after_end = (actual_pos + term.len() + 10).min(content.len());
                
                let before = &content[before_start..actual_pos];
                let matched = &content[actual_pos..actual_pos + term.len()];
                let after = &content[actual_pos + term.len()..after_end];
                
                let highlight = format!(
                    "{}**{}**{}",
                    before,
                    matched,
                    after
                );
                
                highlights.push(highlight);
                start = actual_pos + term.len();
                
                if highlights.len() >= 3 {
                    break;
                }
            }
            
            if highlights.len() >= 3 {
                break;
            }
        }
        
        highlights
    }
}
