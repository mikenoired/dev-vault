use crate::models::{AvailableDocumentation, DocEntry, DocTreeNode, Documentation, ParsedDocEntry};
use anyhow::{Context, Result};
use sqlx::{Pool, Row, Sqlite};

use super::parsers::{
    get_available_documentations, get_doc_metadata_by_name, scrape_documentation_with_progress,
    ProgressSender,
};

pub struct DocumentationManager {
    pool: Pool<Sqlite>,
}

impl DocumentationManager {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn list_available_documentations(&self) -> Result<Vec<AvailableDocumentation>> {
        tracing::info!("Listing available documentations");
        let available = get_available_documentations();
        tracing::info!("Found {} available documentations", available.len());

        for doc in &available {
            tracing::debug!("  → {} ({})", doc.display_name, doc.name);
        }

        Ok(available)
    }

    pub async fn list_installed_documentations(&self) -> Result<Vec<Documentation>> {
        tracing::info!("Listing installed documentations from database");

        let rows = sqlx::query(
            "SELECT id, name, display_name, version, source_url, 
                    installed_at, updated_at, metadata
             FROM documentations
             ORDER BY display_name",
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to list installed documentations")?;

        tracing::info!("Found {} installed documentation(s)", rows.len());

        let mut docs = Vec::new();
        for row in rows {
            let metadata_str: String = row.get("metadata");
            let metadata = serde_json::from_str(&metadata_str).ok();

            let doc = Documentation {
                id: row.get("id"),
                name: row.get("name"),
                display_name: row.get("display_name"),
                version: row.get("version"),
                source_url: row.get("source_url"),
                installed_at: row.get("installed_at"),
                updated_at: row.get("updated_at"),
                metadata,
            };
            tracing::debug!(
                "  → {} (ID: {}, v{})",
                doc.display_name,
                doc.id,
                doc.version
            );
            docs.push(doc);
        }

        Ok(docs)
    }

    pub async fn install_documentation_with_progress(
        &self,
        name: &str,
        progress_tx: ProgressSender,
    ) -> Result<Documentation> {
        tracing::info!("=== Starting documentation installation for: {} ===", name);

        let entries = scrape_documentation_with_progress(name, progress_tx)
            .await
            .context("Failed to scrape documentation")?;

        self.install_documentation_with_entries(name, entries).await
    }

    async fn install_documentation_with_entries(
        &self,
        name: &str,
        entries: Vec<ParsedDocEntry>,
    ) -> Result<Documentation> {
        let metadata =
            get_doc_metadata_by_name(name).context(format!("Documentation not found: {}", name))?;

        let now = chrono::Utc::now().timestamp();

        let mut tx = self
            .pool
            .begin()
            .await
            .context("Failed to start transaction")?;

        tracing::info!("Step 1: Inserting documentation metadata");
        let doc_id = sqlx::query(
            "INSERT INTO documentations (name, display_name, version, source_url, installed_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             RETURNING id",
        )
        .bind(&metadata.name)
        .bind(&metadata.display_name)
        .bind(&metadata.version)
        .bind(&metadata.base_url)
        .bind(now)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?
        .get::<i64, _>(0);

        tracing::info!("Step 2: Inserting {} entries in bulk", entries.len());

        for chunk in entries.chunks(100) {
            for entry in chunk {
                sqlx::query(
                    "INSERT INTO doc_entries (doc_id, path, title, content, entry_type, parent_path, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
                )
                .bind(doc_id)
                .bind(&entry.path)
                .bind(&entry.title)
                .bind(&entry.content)
                .bind(&entry.entry_type)
                .bind(&entry.parent_path)
                .bind(now)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await.context("Failed to commit transaction")?;
        tracing::info!("✓ All entries inserted and transaction committed");

        self.get_documentation(doc_id).await
    }

    pub async fn update_documentation_with_progress(
        &self,
        doc_id: i64,
        progress_tx: ProgressSender,
    ) -> Result<Documentation> {
        tracing::info!(
            "=== Starting documentation update for doc_id: {} ===",
            doc_id
        );

        let doc = self.get_documentation(doc_id).await?;

        let entries = scrape_documentation_with_progress(&doc.name, progress_tx)
            .await
            .context("Failed to scrape documentation")?;

        self.update_documentation_with_entries(doc_id, entries)
            .await
    }

    async fn update_documentation_with_entries(
        &self,
        doc_id: i64,
        entries: Vec<ParsedDocEntry>,
    ) -> Result<Documentation> {
        let doc = self.get_documentation(doc_id).await?;
        let metadata = get_doc_metadata_by_name(&doc.name)
            .context(format!("Documentation not found: {}", doc.name))?;

        let now = chrono::Utc::now().timestamp();
        let mut tx = self.pool.begin().await?;

        tracing::info!("Step 1: Deleting old entries");
        sqlx::query("DELETE FROM doc_entries WHERE doc_id = ?1")
            .bind(doc_id)
            .execute(&mut *tx)
            .await?;

        tracing::info!("Step 2: Inserting {} new entries", entries.len());
        for chunk in entries.chunks(100) {
            for entry in chunk {
                sqlx::query(
                    "INSERT INTO doc_entries (doc_id, path, title, content, entry_type, parent_path, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                )
                .bind(doc_id)
                .bind(&entry.path)
                .bind(&entry.title)
                .bind(&entry.content)
                .bind(&entry.entry_type)
                .bind(&entry.parent_path)
                .bind(now)
                .execute(&mut *tx)
                .await?;
            }
        }

        tracing::info!("Step 3: Updating metadata");
        sqlx::query(
            "UPDATE documentations
             SET version = ?1, updated_at = ?2
             WHERE id = ?3",
        )
        .bind(&metadata.version)
        .bind(now)
        .bind(doc_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        tracing::info!("=== ✓ Documentation update complete ===");

        self.get_documentation(doc_id).await
    }

    pub async fn delete_documentation(&self, doc_id: i64) -> Result<()> {
        tracing::info!(
            "=== Starting documentation deletion for doc_id: {} ===",
            doc_id
        );

        tracing::info!("Step 1: Fetching documentation info");
        let doc = match self.get_documentation(doc_id).await {
            Ok(d) => {
                tracing::info!("✓ Found documentation: {} (id={})", d.display_name, d.id);
                Some(d)
            }
            Err(e) => {
                tracing::warn!("⚠ Could not fetch doc info: {:?}", e);
                None
            }
        };

        tracing::info!("Step 2: Deleting from database (will cascade to entries)");
        let result = sqlx::query("DELETE FROM documentations WHERE id = ?1")
            .bind(doc_id)
            .execute(&self.pool)
            .await
            .context("Failed to delete documentation")?;

        tracing::info!("✓ Deleted {} rows", result.rows_affected());

        if let Some(doc) = doc {
            tracing::info!(
                "=== ✓ Documentation '{}' deleted successfully ===",
                doc.display_name
            );
        } else {
            tracing::info!("=== ✓ Documentation (id={}) deleted ===", doc_id);
        }

        Ok(())
    }

    async fn get_documentation(&self, doc_id: i64) -> Result<Documentation> {
        let row = sqlx::query(
            "SELECT id, name, display_name, version, source_url, 
                    installed_at, updated_at, metadata
             FROM documentations WHERE id = ?1",
        )
        .bind(doc_id)
        .fetch_one(&self.pool)
        .await
        .context("Documentation not found")?;

        let metadata_str: String = row.get("metadata");
        let metadata = serde_json::from_str(&metadata_str).ok();

        Ok(Documentation {
            id: row.get("id"),
            name: row.get("name"),
            display_name: row.get("display_name"),
            version: row.get("version"),
            source_url: row.get("source_url"),
            installed_at: row.get("installed_at"),
            updated_at: row.get("updated_at"),
            metadata,
        })
    }

    pub async fn get_doc_entries(
        &self,
        doc_id: i64,
        parent_path: Option<String>,
    ) -> Result<Vec<DocEntry>> {
        let query = if parent_path.is_some() {
            "SELECT id, doc_id, path, title, content, entry_type, parent_path, created_at
             FROM doc_entries 
             WHERE doc_id = ?1 AND parent_path = ?2
             ORDER BY title"
        } else {
            "SELECT id, doc_id, path, title, content, entry_type, parent_path, created_at
             FROM doc_entries 
             WHERE doc_id = ?1 AND parent_path IS NULL
             ORDER BY title"
        };

        let mut query_builder = sqlx::query(query).bind(doc_id);

        if let Some(ref parent) = parent_path {
            query_builder = query_builder.bind(parent);
        }

        let rows = query_builder
            .fetch_all(&self.pool)
            .await
            .context("Failed to get doc entries")?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(DocEntry {
                id: row.get("id"),
                doc_id: row.get("doc_id"),
                path: row.get("path"),
                title: row.get("title"),
                content: row.get("content"),
                entry_type: row.get("entry_type"),
                parent_path: row.get("parent_path"),
                created_at: row.get("created_at"),
            });
        }

        Ok(entries)
    }

    pub async fn get_doc_entry_by_path(&self, doc_id: i64, path: &str) -> Result<DocEntry> {
        let row = sqlx::query(
            "SELECT id, doc_id, path, title, content, entry_type, parent_path, created_at
             FROM doc_entries 
             WHERE doc_id = ?1 AND path = ?2",
        )
        .bind(doc_id)
        .bind(path)
        .fetch_one(&self.pool)
        .await
        .context("Doc entry not found")?;

        Ok(DocEntry {
            id: row.get("id"),
            doc_id: row.get("doc_id"),
            path: row.get("path"),
            title: row.get("title"),
            content: row.get("content"),
            entry_type: row.get("entry_type"),
            parent_path: row.get("parent_path"),
            created_at: row.get("created_at"),
        })
    }

    pub async fn get_doc_tree_level(
        &self,
        doc_id: i64,
        parent_path: Option<String>,
    ) -> Result<Vec<DocTreeNode>> {
        let rows = if let Some(ref parent) = parent_path {
            sqlx::query(
                "SELECT path, title, entry_type, parent_path, (content != '') as has_content,
                        EXISTS(SELECT 1 FROM doc_entries de2 WHERE de2.parent_path = doc_entries.path) as has_children
                 FROM doc_entries 
                 WHERE doc_id = ?1 AND parent_path = ?2
                 ORDER BY title"
            )
            .bind(doc_id)
            .bind(parent)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                "SELECT path, title, entry_type, parent_path, (content != '') as has_content,
                        EXISTS(SELECT 1 FROM doc_entries de2 WHERE de2.parent_path = doc_entries.path) as has_children
                 FROM doc_entries 
                 WHERE doc_id = ?1 AND parent_path IS NULL
                 ORDER BY title"
            )
            .bind(doc_id)
            .fetch_all(&self.pool)
            .await?
        };

        let mut nodes = Vec::new();
        for row in rows {
            nodes.push(DocTreeNode {
                path: row.get("path"),
                title: row.get("title"),
                entry_type: row.get("entry_type"),
                children: Vec::new(),
                has_content: row.get("has_content"),
                has_children: row.get("has_children"),
            });
        }

        Ok(nodes)
    }
}
