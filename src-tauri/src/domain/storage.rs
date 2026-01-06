use crate::models::*;
use anyhow::{Context, Result};
use sqlx::{sqlite::SqlitePool, Pool, Row, Sqlite};
use std::path::PathBuf;

pub struct Storage {
    pub pool: Pool<Sqlite>,
}

impl Storage {
    pub async fn new(db_path: PathBuf) -> Result<Self> {
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        
        let pool = SqlitePool::connect(&db_url)
            .await
            .context("Failed to connect to database")?;

        sqlx::query("PRAGMA journal_mode=WAL")
            .execute(&pool)
            .await
            .context("Failed to set WAL mode")?;

        sqlx::query("PRAGMA foreign_keys=ON")
            .execute(&pool)
            .await
            .context("Failed to enable foreign keys")?;

        Self::run_migrations(&pool).await?;

        Ok(Self { pool })
    }

    async fn run_migrations(pool: &Pool<Sqlite>) -> Result<()> {
        let migration = include_str!("../../migrations/001_initial_schema.sql");
        
        sqlx::query(migration)
            .execute(pool)
            .await
            .context("Failed to run migrations")?;

        Ok(())
    }

    pub async fn create_item(&self, dto: CreateItemDto) -> Result<i64> {
        let now = chrono::Utc::now().timestamp();
        let metadata_json = serde_json::to_string(&dto.metadata.unwrap_or(serde_json::json!({})))?;
        let item_type_str = match dto.item_type {
            ItemType::Snippet => "snippet",
            ItemType::Doc => "doc",
            ItemType::Config => "config",
            ItemType::Note => "note",
            ItemType::Link => "link",
        };

        let result = sqlx::query(
            "INSERT INTO items (type, title, description, content, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )
        .bind(item_type_str)
        .bind(&dto.title)
        .bind(&dto.description)
        .bind(&dto.content)
        .bind(now)
        .bind(now)
        .bind(metadata_json)
        .execute(&self.pool)
        .await
        .context("Failed to create item")?;

        let item_id = result.last_insert_rowid();

        if let Some(tag_ids) = dto.tag_ids {
            for tag_id in tag_ids {
                sqlx::query("INSERT INTO item_tags (item_id, tag_id) VALUES (?1, ?2)")
                    .bind(item_id)
                    .bind(tag_id)
                    .execute(&self.pool)
                    .await
                    .context("Failed to link tags")?;
            }
        }

        Ok(item_id)
    }

    pub async fn get_item(&self, id: i64) -> Result<Option<ItemWithTags>> {
        let row = sqlx::query(
            "SELECT id, type, title, description, content, created_at, updated_at, metadata
             FROM items WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .context("Failed to get item")?;

        if let Some(row) = row {
            let item = Item {
                id: row.get("id"),
                item_type: Self::parse_item_type(row.get("type"))?,
                title: row.get("title"),
                description: row.get("description"),
                content: row.get("content"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                metadata: row.get::<String, _>("metadata").parse().ok(),
            };

            let tags = self.get_item_tags(id).await?;
            Ok(Some(ItemWithTags { item, tags }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_item(&self, dto: UpdateItemDto) -> Result<bool> {
        let now = chrono::Utc::now().timestamp();

        let existing = sqlx::query("SELECT id FROM items WHERE id = ?1")
            .bind(dto.id)
            .fetch_optional(&self.pool)
            .await
            .context("Failed to check item existence")?;

        if existing.is_none() {
            return Ok(false);
        }

        if dto.title.is_some() || dto.description.is_some() || dto.content.is_some() || dto.metadata.is_some() {
            let mut parts = vec![];
            if dto.title.is_some() { parts.push("t"); }
            if dto.description.is_some() { parts.push("d"); }
            if dto.content.is_some() { parts.push("c"); }
            if dto.metadata.is_some() { parts.push("m"); }
            let update_pattern = parts.join("");

            match update_pattern.as_str() {
                "t" => {
                    sqlx::query("UPDATE items SET title = ?1, updated_at = ?2 WHERE id = ?3")
                        .bind(dto.title.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "d" => {
                    sqlx::query("UPDATE items SET description = ?1, updated_at = ?2 WHERE id = ?3")
                        .bind(dto.description.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "c" => {
                    sqlx::query("UPDATE items SET content = ?1, updated_at = ?2 WHERE id = ?3")
                        .bind(dto.content.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "m" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.unwrap())?;
                    sqlx::query("UPDATE items SET metadata = ?1, updated_at = ?2 WHERE id = ?3")
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "td" => {
                    sqlx::query("UPDATE items SET title = ?1, description = ?2, updated_at = ?3 WHERE id = ?4")
                        .bind(dto.title.unwrap())
                        .bind(dto.description.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "tc" => {
                    sqlx::query("UPDATE items SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4")
                        .bind(dto.title.unwrap())
                        .bind(dto.content.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "tm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET title = ?1, metadata = ?2, updated_at = ?3 WHERE id = ?4")
                        .bind(dto.title.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "dc" => {
                    sqlx::query("UPDATE items SET description = ?1, content = ?2, updated_at = ?3 WHERE id = ?4")
                        .bind(dto.description.unwrap())
                        .bind(dto.content.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "dm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET description = ?1, metadata = ?2, updated_at = ?3 WHERE id = ?4")
                        .bind(dto.description.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "cm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET content = ?1, metadata = ?2, updated_at = ?3 WHERE id = ?4")
                        .bind(dto.content.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "tdc" => {
                    sqlx::query("UPDATE items SET title = ?1, description = ?2, content = ?3, updated_at = ?4 WHERE id = ?5")
                        .bind(dto.title.unwrap())
                        .bind(dto.description.unwrap())
                        .bind(dto.content.unwrap())
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "tdm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET title = ?1, description = ?2, metadata = ?3, updated_at = ?4 WHERE id = ?5")
                        .bind(dto.title.unwrap())
                        .bind(dto.description.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "tcm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET title = ?1, content = ?2, metadata = ?3, updated_at = ?4 WHERE id = ?5")
                        .bind(dto.title.unwrap())
                        .bind(dto.content.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "dcm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET description = ?1, content = ?2, metadata = ?3, updated_at = ?4 WHERE id = ?5")
                        .bind(dto.description.unwrap())
                        .bind(dto.content.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                "tdcm" => {
                    let metadata_json = serde_json::to_string(&dto.metadata.as_ref().unwrap())?;
                    sqlx::query("UPDATE items SET title = ?1, description = ?2, content = ?3, metadata = ?4, updated_at = ?5 WHERE id = ?6")
                        .bind(dto.title.unwrap())
                        .bind(dto.description.unwrap())
                        .bind(dto.content.unwrap())
                        .bind(metadata_json)
                        .bind(now)
                        .bind(dto.id)
                        .execute(&self.pool)
                        .await?;
                }
                _ => {}
            }
        }

        if let Some(tag_ids) = dto.tag_ids {
            sqlx::query("DELETE FROM item_tags WHERE item_id = ?1")
                .bind(dto.id)
                .execute(&self.pool)
                .await
                .context("Failed to remove old tags")?;

            for tag_id in tag_ids {
                sqlx::query("INSERT INTO item_tags (item_id, tag_id) VALUES (?1, ?2)")
                    .bind(dto.id)
                    .bind(tag_id)
                    .execute(&self.pool)
                    .await
                    .context("Failed to link new tags")?;
            }
        }

        Ok(true)
    }

    pub async fn delete_item(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM items WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await
            .context("Failed to delete item")?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn list_items(&self, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<ItemWithTags>> {
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let rows = sqlx::query(
            "SELECT id, type, title, description, content, created_at, updated_at, metadata
             FROM items ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .context("Failed to list items")?;

        let mut result = Vec::new();
        for row in rows {
            let item = Item {
                id: row.get("id"),
                item_type: Self::parse_item_type(row.get("type"))?,
                title: row.get("title"),
                description: row.get("description"),
                content: row.get("content"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                metadata: row.get::<String, _>("metadata").parse().ok(),
            };

            let tags = self.get_item_tags(item.id).await?;
            result.push(ItemWithTags { item, tags });
        }

        Ok(result)
    }

    pub async fn create_tag(&self, name: String) -> Result<i64> {
        let result = sqlx::query("INSERT INTO tags (name) VALUES (?1)")
            .bind(name)
            .execute(&self.pool)
            .await
            .context("Failed to create tag")?;

        Ok(result.last_insert_rowid())
    }

    pub async fn get_tag_by_name(&self, name: &str) -> Result<Option<Tag>> {
        let row = sqlx::query("SELECT id, name FROM tags WHERE name = ?1")
            .bind(name)
            .fetch_optional(&self.pool)
            .await
            .context("Failed to get tag by name")?;

        Ok(row.map(|r| Tag {
            id: r.get("id"),
            name: r.get("name"),
        }))
    }

    pub async fn list_tags(&self) -> Result<Vec<Tag>> {
        let rows = sqlx::query("SELECT id, name FROM tags ORDER BY name")
            .fetch_all(&self.pool)
            .await
            .context("Failed to list tags")?;

        Ok(rows.iter().map(|r| Tag {
            id: r.get("id"),
            name: r.get("name"),
        }).collect())
    }

    async fn get_item_tags(&self, item_id: i64) -> Result<Vec<Tag>> {
        let rows = sqlx::query(
            "SELECT t.id, t.name
             FROM tags t
             INNER JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id = ?1
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
}
