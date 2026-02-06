mod test_support;

use anyhow::Result;
use std::time::Instant;
use test_support::{seed_mock_items, TestDb};

#[tokio::test]
async fn cleanup_removes_all_mock_items() -> Result<()> {
    let db = TestDb::new("cleanup").await?;
    let token = "cleanup-token";

    let (ids, seed_ms) = seed_mock_items(&db.storage, 1000, token).await?;
    println!(
        "[cleanup] created {}/{} items in {}ms",
        ids.len(),
        1000,
        seed_ms
    );
    assert!(db.count_items().await? > 0);

    let cleanup_started = Instant::now();
    db.cleanup().await?;
    let cleanup_ms = cleanup_started.elapsed().as_millis();
    println!("[cleanup] cleanup in {}ms", cleanup_ms);
    assert_eq!(db.count_items().await?, 0);

    let db_path = db.db_path.clone();
    drop(db);
    test_support::remove_db_file(db_path)?;
    Ok(())
}
