mod commands;
mod domain;
mod models;

use commands::AppState;
use domain::Storage;
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};
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

            // Create Menu
            let search_i = MenuItem::with_id(app, "search", "Поиск", true, Some("CmdOrCtrl+F"))?;
            let new_tab_i =
                MenuItem::with_id(app, "new-tab", "Новая вкладка", true, Some("CmdOrCtrl+T"))?;

            let actions_menu = Submenu::with_items(app, "Действия", true, &[&search_i, &new_tab_i])?;

            let create_snippet_i =
                MenuItem::with_id(app, "create-snippet", "Сниппет", true, Some("CmdOrCtrl+N"))?;
            let create_note_i = MenuItem::with_id(
                app,
                "create-note",
                "Заметка",
                true,
                Some("CmdOrCtrl+Shift+N"),
            )?;
            let create_doc_i = MenuItem::with_id(app, "create-doc", "Документ", true, Some("CmdOrCtrl+Shift+D"))?;
            let create_config_i = MenuItem::with_id(app, "create-config", "Конфиг", true, Some("CmdOrCtrl+Shift+G"))?;
            let create_link_i = MenuItem::with_id(app, "create-link", "Ссылка", true, Some("CmdOrCtrl+Shift+H"))?;

            let create_menu = Submenu::with_items(
                app,
                "Создать",
                true,
                &[
                    &create_snippet_i,
                    &create_note_i,
                    &create_doc_i,
                    &create_config_i,
                    &create_link_i,
                ],
            )?;

            let menu = Menu::with_items(
                app,
                &[
                    &Submenu::with_items(
                        app,
                        "Dev Vault",
                        true,
                        &[
                            &PredefinedMenuItem::about(app, None, None)?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::hide(app, None)?,
                            &PredefinedMenuItem::hide_others(app, None)?,
                            &PredefinedMenuItem::show_all(app, None)?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::quit(app, None)?,
                        ],
                    )?,
                    &actions_menu,
                    &create_menu,
                    &Submenu::with_items(
                        app,
                        "Правка",
                        true,
                        &[
                            &PredefinedMenuItem::undo(app, None)?,
                            &PredefinedMenuItem::redo(app, None)?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::cut(app, None)?,
                            &PredefinedMenuItem::copy(app, None)?,
                            &PredefinedMenuItem::paste(app, None)?,
                            &PredefinedMenuItem::select_all(app, None)?,
                        ],
                    )?,
                ],
            )?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "search" => {
                let _ = app.emit("menu-search", ());
            }
            "new-tab" => {
                let _ = app.emit("menu-new-tab", ());
            }
            "create-snippet" => {
                let _ = app.emit("menu-create-item", "snippet");
            }
            "create-note" => {
                let _ = app.emit("menu-create-item", "note");
            }
            "create-doc" => {
                let _ = app.emit("menu-create-item", "doc");
            }
            "create-config" => {
                let _ = app.emit("menu-create-item", "config");
            }
            "create-link" => {
                let _ = app.emit("menu-create-item", "link");
            }
            _ => {}
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
