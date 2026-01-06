mod commands;
mod domain;
mod models;

use commands::AppState;
use domain::Storage;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;
use tracing_subscriber;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

            let db_path = app_dir.join("dev-vault.db");

            let storage = tauri::async_runtime::block_on(async {
                Storage::new(db_path)
                    .await
                    .expect("Failed to initialize storage")
            });

            let state = AppState {
                storage: Arc::new(Mutex::new(storage)),
            };

            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_item,
            commands::get_item,
            commands::update_item,
            commands::delete_item,
            commands::list_items,
            commands::create_tag,
            commands::get_or_create_tag,
            commands::list_tags,
            commands::search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
