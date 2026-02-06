mod test_support;

use anyhow::Result;
use dev_vault_lib::models::SearchQuery;
use std::time::Instant;
use test_support::{read_max_search_ms, seed_mock_items, TestDb};

#[tokio::test]
async fn creates_and_finds_mock_items() -> Result<()> {
    let db = TestDb::new("mock_items").await?;
    let token = "alpha";
    let count = 1000usize;

    let (ids, seed_ms) = seed_mock_items(&db.storage, count, token).await?;
    println!(
        "[mock_items] created {}/{} items in {}ms",
        ids.len(),
        count,
        seed_ms
    );

    let search_engine = db.search_engine();
    let query = SearchQuery {
        query: token.to_string(),
        item_type: None,
        tag_ids: None,
        limit: Some(count as i64),
        offset: Some(0),
    };

    let started = Instant::now();
    let result = search_engine.search(query).await?;
    let elapsed_ms = started.elapsed().as_millis();
    println!("[mock_items] search result in {}ms", elapsed_ms);
    assert_eq!(result.total, count as i64);

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
    println!("[mock_items] cleanup in {}ms", cleanup_ms);
    assert_eq!(db.count_items().await?, 0);

    let db_path = db.db_path.clone();
    drop(db);
    test_support::remove_db_file(db_path)?;
    Ok(())
}
