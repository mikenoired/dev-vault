use anyhow::{Context, Result};
use dev_vault_lib::domain::{SearchEngine, Storage};
use dev_vault_lib::models::{CreateItemDto, ItemType};
use sqlx::Row;
use std::path::PathBuf;
use uuid::Uuid;

pub struct TestDb {
    pub storage: Storage,
    pub db_path: PathBuf,
}

impl TestDb {
    pub async fn new(test_name: &str) -> Result<Self> {
        let db_path = temp_db_path(test_name);
        let storage = Storage::new(db_path.clone()).await?;
        Ok(Self { storage, db_path })
    }

    pub fn search_engine(&self) -> SearchEngine {
        SearchEngine::new(self.storage.pool.clone())
    }

    pub async fn cleanup(&self) -> Result<()> {
        sqlx::query("DELETE FROM item_tags").execute(&self.storage.pool).await?;
        sqlx::query("DELETE FROM tags").execute(&self.storage.pool).await?;
        sqlx::query("DELETE FROM items").execute(&self.storage.pool).await?;
        Ok(())
    }

    pub async fn count_items(&self) -> Result<i64> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM items")
            .fetch_one(&self.storage.pool)
            .await?;
        Ok(row.get::<i64, _>("count"))
    }
}

pub fn temp_db_path(test_name: &str) -> PathBuf {
    let file_name = format!("devvault_test_{}_{}.db", test_name, Uuid::new_v4());
    std::env::temp_dir().join(file_name)
}

pub async fn seed_mock_items(
    storage: &Storage,
    count: usize,
    token: &str,
) -> Result<(Vec<i64>, u128)> {
    let mut ids = Vec::with_capacity(count);
    let started = std::time::Instant::now();
    let blob = build_large_content(token);
    for i in 0..count {
        let dto = CreateItemDto {
            item_type: ItemType::Note,
            title: format!("Mock Item {}", i),
            description: Some(format!("desc {}", i)),
            content: format!("{}\n\nItem {} payload:\n{}", token, i, blob),
            metadata: None,
            tag_ids: None,
        };
        let id = storage.create_item(dto).await?;
        ids.push(id);
    }
    let elapsed_ms = started.elapsed().as_millis();
    Ok((ids, elapsed_ms))
}

fn build_large_content(token: &str) -> String {
    let mut content = String::with_capacity(16 * 1024);
    for i in 0..64 {
        content.push_str(token);
        content.push_str(" lorem ipsum dolor sit amet, consectetur adipiscing elit. ");
        content.push_str("sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ");
        content.push_str("ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. ");
        content.push_str("section ");
        content.push_str(&i.to_string());
        content.push('\n');
    }
    content
}

pub fn read_max_search_ms() -> u128 {
    std::env::var("DEVVAULT_TEST_MAX_SEARCH_MS")
        .ok()
        .and_then(|v| v.parse::<u128>().ok())
        .unwrap_or(500)
}

pub fn remove_db_file(path: PathBuf) -> Result<()> {
    if path.exists() {
        std::fs::remove_file(&path).with_context(|| format!("Failed to remove db file: {:?}", path))?;
    }
    Ok(())
}
