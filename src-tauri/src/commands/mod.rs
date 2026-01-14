use crate::domain::parsers::ScrapeProgress;
use crate::domain::{ConfigManager, DocumentationManager, SearchEngine, Storage};
use crate::models::config::AppConfig;
use crate::models::*;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex};

pub struct AppState {
    pub storage: Arc<Mutex<Storage>>,
    pub config_manager: Arc<ConfigManager>,
    pub doc_manager: Arc<Mutex<DocumentationManager>>,
}

#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    state
        .config_manager
        .load_config()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    state
        .config_manager
        .save_config(&config)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_item(state: State<'_, AppState>, dto: CreateItemDto) -> Result<i64, String> {
    let storage = state.storage.lock().await;
    storage.create_item(dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_item(state: State<'_, AppState>, id: i64) -> Result<Option<ItemWithTags>, String> {
    let storage = state.storage.lock().await;
    storage.get_item(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_item(state: State<'_, AppState>, dto: UpdateItemDto) -> Result<bool, String> {
    let storage = state.storage.lock().await;
    storage.update_item(dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_item(state: State<'_, AppState>, id: i64) -> Result<bool, String> {
    let storage = state.storage.lock().await;
    storage.delete_item(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_items(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ItemWithTags>, String> {
    let storage = state.storage.lock().await;
    storage
        .list_items(limit, offset)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag(state: State<'_, AppState>, name: String) -> Result<i64, String> {
    let storage = state.storage.lock().await;
    storage.create_tag(name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_or_create_tag(state: State<'_, AppState>, name: String) -> Result<i64, String> {
    let storage = state.storage.lock().await;

    if let Some(tag) = storage
        .get_tag_by_name(&name)
        .await
        .map_err(|e| e.to_string())?
    {
        return Ok(tag.id);
    }

    storage.create_tag(name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let storage = state.storage.lock().await;
    storage.list_tags().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search(
    state: State<'_, AppState>,
    query: SearchQuery,
) -> Result<SearchResult, String> {
    tracing::info!("[Command] search called with query: {:?}", query);

    let storage = state.storage.lock().await;
    let pool = storage.pool.clone();
    drop(storage);

    let search_engine = SearchEngine::new(pool);
    let result = search_engine.search(query).await.map_err(|e| {
        tracing::error!("[Command] Search error: {}", e);
        e.to_string()
    })?;

    tracing::info!("[Command] Search result: {} items found", result.total);
    if !result.items.is_empty() {
        tracing::info!(
            "[Command] First item: {}, highlights: {:?}",
            result.items[0].item.title,
            result.items[0].highlights.as_ref().map(|h| h.len())
        );
    }

    Ok(result)
}

#[tauri::command]
pub async fn list_available_docs(
    state: State<'_, AppState>,
) -> Result<Vec<AvailableDocumentation>, String> {
    tracing::info!("[Command] list_available_docs called");
    let doc_manager = state.doc_manager.lock().await;

    match doc_manager.list_available_documentations().await {
        Ok(docs) => {
            tracing::info!("[Command] Returned {} available docs", docs.len());
            Ok(docs)
        }
        Err(e) => {
            tracing::error!("[Command] Failed to list available docs: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn list_installed_docs(state: State<'_, AppState>) -> Result<Vec<Documentation>, String> {
    tracing::info!("[Command] list_installed_docs called");
    let doc_manager = state.doc_manager.lock().await;

    match doc_manager.list_installed_documentations().await {
        Ok(docs) => {
            tracing::info!("[Command] Returned {} installed docs", docs.len());
            Ok(docs)
        }
        Err(e) => {
            tracing::error!("[Command] Failed to list installed docs: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn install_documentation(
    app: AppHandle,
    state: State<'_, AppState>,
    name: String,
) -> Result<Documentation, String> {
    tracing::info!("[Command] install_documentation called for: {}", name);

    let (progress_tx, mut progress_rx) = mpsc::channel::<ScrapeProgress>(100);

    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some(progress) = progress_rx.recv().await {
            let _ = app_clone.emit("doc-install-progress", &progress);
        }
    });

    let doc_manager = state.doc_manager.lock().await;

    match doc_manager
        .install_documentation_with_progress(&name, progress_tx)
        .await
    {
        Ok(doc) => {
            tracing::info!(
                "[Command] Documentation installed successfully: {}",
                doc.display_name
            );
            let _ = app.emit("doc-install-complete", &doc);
            Ok(doc)
        }
        Err(e) => {
            tracing::error!(
                "✗ [Command] Failed to install documentation '{}': {:?}",
                name,
                e
            );
            let _ = app.emit("doc-install-error", &e.to_string());
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn update_documentation(
    app: AppHandle,
    state: State<'_, AppState>,
    doc_id: i64,
) -> Result<Documentation, String> {
    tracing::info!(
        "🔄 [Command] update_documentation called for doc_id: {}",
        doc_id
    );

    let (progress_tx, mut progress_rx) = mpsc::channel::<ScrapeProgress>(100);

    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some(progress) = progress_rx.recv().await {
            let _ = app_clone.emit("doc-update-progress", &progress);
        }
    });

    let doc_manager = state.doc_manager.lock().await;

    match doc_manager
        .update_documentation_with_progress(doc_id, progress_tx)
        .await
    {
        Ok(doc) => {
            tracing::info!(
                "✓ [Command] Documentation updated successfully: {}",
                doc.display_name
            );
            let _ = app.emit("doc-update-complete", &doc);
            Ok(doc)
        }
        Err(e) => {
            tracing::error!(
                "✗ [Command] Failed to update documentation (id={}): {:?}",
                doc_id,
                e
            );
            let _ = app.emit("doc-update-error", &e.to_string());
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn delete_documentation(state: State<'_, AppState>, doc_id: i64) -> Result<(), String> {
    tracing::info!(
        "🗑️  [Command] delete_documentation called for doc_id: {}",
        doc_id
    );
    let doc_manager = state.doc_manager.lock().await;

    match doc_manager.delete_documentation(doc_id).await {
        Ok(()) => {
            tracing::info!(
                "✓ [Command] Documentation deleted successfully (id={})",
                doc_id
            );
            Ok(())
        }
        Err(e) => {
            tracing::error!(
                "✗ [Command] Failed to delete documentation (id={}): {:?}",
                doc_id,
                e
            );
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_doc_entries(
    state: State<'_, AppState>,
    doc_id: i64,
    parent_path: Option<String>,
) -> Result<Vec<DocEntry>, String> {
    let doc_manager = state.doc_manager.lock().await;
    doc_manager
        .get_doc_entries(doc_id, parent_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_doc_entry_by_path(
    state: State<'_, AppState>,
    doc_id: i64,
    path: String,
) -> Result<DocEntry, String> {
    let doc_manager = state.doc_manager.lock().await;
    doc_manager
        .get_doc_entry_by_path(doc_id, &path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_doc_tree(
    state: State<'_, AppState>,
    doc_id: i64,
    parent_path: Option<String>,
) -> Result<Vec<DocTreeNode>, String> {
    let doc_manager = state.doc_manager.lock().await;

    doc_manager
        .get_doc_tree_level(doc_id, parent_path)
        .await
        .map_err(|e| e.to_string())
}
