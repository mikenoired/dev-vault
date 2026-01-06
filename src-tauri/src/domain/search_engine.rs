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
        
        let mut sql = String::from(
            "SELECT i.id, i.type, i.title, i.description, i.content, 
                    i.created_at, i.updated_at, i.metadata
             FROM items i
             JOIN search_index ON i.id = search_index.rowid
             WHERE search_index MATCH ? "
        );

        if query.item_type.is_some() {
            sql.push_str(" AND i.type = ?");
        }

        if let Some(ref tag_ids) = query.tag_ids {
            if !tag_ids.is_empty() {
                let placeholders = tag_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                sql.push_str(&format!(
                    " AND EXISTS (SELECT 1 FROM item_tags it WHERE it.item_id = i.id AND it.tag_id IN ({}))",
                    placeholders
                ));
            }
        }

        sql.push_str(" ORDER BY i.updated_at DESC LIMIT ?");

        let mut query_builder = sqlx::query(&sql);
        query_builder = query_builder.bind(&search_query);

        if let Some(item_type) = &query.item_type {
            let item_type_str = match item_type {
                ItemType::Snippet => "snippet",
                ItemType::Doc => "doc",
                ItemType::Config => "config",
                ItemType::Note => "note",
                ItemType::Link => "link",
            };
            query_builder = query_builder.bind(item_type_str);
        }

        if let Some(tag_ids) = &query.tag_ids {
            for tag_id in tag_ids {
                query_builder = query_builder.bind(tag_id);
            }
        }

        query_builder = query_builder.bind(limit);

        let rows = query_builder.fetch_all(&self.pool).await
            .context("Failed to execute search query")?;

        let mut result_items = Vec::new();
        for row in rows {
            let metadata_str: Option<String> = row.get("metadata");
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());

            let item = Item {
                id: row.get("id"),
                item_type: Self::parse_item_type(row.get("type"))?,
                title: row.get("title"),
                description: row.get("description"),
                content: row.get("content"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                metadata,
            };

            let highlights = Self::extract_highlights(&item.content, &query.query);
            let tags = self.get_item_tags(item.id).await?;
            result_items.push(ItemWithTags { item, tags, highlights: Some(highlights) });
        }

        let total = result_items.len() as i64;

        Ok(SearchResult {
            items: result_items,
            total,
        })
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
            "doc" => Ok(ItemType::Doc),
            "config" => Ok(ItemType::Config),
            "note" => Ok(ItemType::Note),
            "link" => Ok(ItemType::Link),
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
