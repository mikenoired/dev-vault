use crate::domain::{SearchEngine, Storage};
use crate::models::*;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

pub struct AppState {
    pub storage: Arc<Mutex<Storage>>,
}

#[tauri::command]
pub async fn create_item(
    state: State<'_, AppState>,
    dto: CreateItemDto,
) -> Result<i64, String> {
    let storage = state.storage.lock().await;
    storage.create_item(dto).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_item(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Option<ItemWithTags>, String> {
    let storage = state.storage.lock().await;
    storage.get_item(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_item(
    state: State<'_, AppState>,
    dto: UpdateItemDto,
) -> Result<bool, String> {
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
pub async fn get_or_create_tag(
    state: State<'_, AppState>,
    name: String,
) -> Result<i64, String> {
    let storage = state.storage.lock().await;
    
    if let Some(tag) = storage.get_tag_by_name(&name).await.map_err(|e| e.to_string())? {
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
    let storage = state.storage.lock().await;
    let pool = storage.pool.clone();
    drop(storage);

    let search_engine = SearchEngine::new(pool);
    search_engine.search(query).await.map_err(|e| e.to_string())
}

