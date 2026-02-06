mod test_support;

use anyhow::Result;
use dev_vault_lib::models::SearchQuery;
use std::time::Instant;
use test_support::{read_max_search_ms, seed_mock_items, TestDb};

#[tokio::test]
async fn search_speed_for_mock_items() -> Result<()> {
    let db = TestDb::new("search_speed").await?;
    let token = "speed-token";
    let count = 1000usize;

    let (ids, seed_ms) = seed_mock_items(&db.storage, count, token).await?;
    println!(
        "[search_speed] created {}/{} items in {}ms",
        ids.len(),
        count,
        seed_ms
    );

    let search_engine = db.search_engine();
    let query = SearchQuery {
        query: token.to_string(),
        item_type: None,
        tag_ids: None,
        limit: Some(100),
        offset: Some(0),
    };

    let started = Instant::now();
    let result = search_engine.search(query).await?;
    let elapsed_ms = started.elapsed().as_millis();
    println!("[search_speed] search result in {}ms", elapsed_ms);

    assert!(result.total > 0);

    let max_ms = read_max_search_ms();
    assert!(
        elapsed_ms <= max_ms,
        "search took {}ms which exceeds max {}ms",
        elapsed_ms,
        max_ms
    );

    let cleanup_started = Instant::now();
    db.cleanup().await?;
    let cleanup_ms = cleanup_started.elapsed().as_millis();
    println!("[search_speed] cleanup in {}ms", cleanup_ms);
    let db_path = db.db_path.clone();
    drop(db);
    test_support::remove_db_file(db_path)?;
    Ok(())
}
