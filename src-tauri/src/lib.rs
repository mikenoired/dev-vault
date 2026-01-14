mod commands;
mod domain;
mod models;

use commands::AppState;
use domain::{DocumentationManager, Storage};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;
use tracing_subscriber::{fmt, EnvFilter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new("info")
            .add_directive("dev_vault_lib=debug".parse().unwrap())
            .add_directive("sqlx=warn".parse().unwrap())
            .add_directive("reqwest=info".parse().unwrap())
    });

    fmt()
        .with_env_filter(filter)
        .with_target(true)
        .with_thread_ids(false)
        .with_thread_names(false)
        .with_file(false)
        .with_line_number(true)
        .with_level(true)
        .with_ansi(true)
        .pretty()
        .init();

    tracing::info!("🚀 Dev Vault starting...");
    tracing::info!("📝 Log levels: TRACE < DEBUG < INFO < WARN < ERROR");
    tracing::info!("💡 Set RUST_LOG env var to change log level (e.g., RUST_LOG=debug)");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tracing::info!("⚙️  Setting up application...");

            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            tracing::info!("📁 App directory: {:?}", app_dir);

            std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

            let db_path = app_dir.join("dev-vault.db");
            tracing::info!("💾 Database path: {:?}", db_path);

            tracing::info!("🔌 Initializing storage...");
            let storage = tauri::async_runtime::block_on(async {
                Storage::new(db_path.clone())
                    .await
                    .expect("Failed to initialize storage")
            });
            tracing::info!("✅ Storage initialized successfully");

            tracing::info!("⚙️  Initializing config manager...");
            let config_manager = domain::ConfigManager::new(app_dir.clone());

            tracing::info!("📖 Initializing documentation manager...");
            let doc_manager = tauri::async_runtime::block_on(async {
                DocumentationManager::new(storage.pool.clone())
            });
            tracing::info!("✅ Documentation manager initialized");

            let state = AppState {
                storage: Arc::new(Mutex::new(storage)),
                config_manager: Arc::new(config_manager),
                doc_manager: Arc::new(Mutex::new(doc_manager)),
            };

            app.manage(state);
            tracing::info!("✅ Application state initialized");

            tracing::info!("🍎 Creating menu...");
            // Create Menu
            let settings_i =
                MenuItem::with_id(app, "settings", "Настройки", true, Some("CmdOrCtrl+,"))?;
            let search_i = MenuItem::with_id(app, "search", "Поиск", true, Some("CmdOrCtrl+F"))?;
            let new_tab_i =
                MenuItem::with_id(app, "new-tab", "Новая вкладка", true, Some("CmdOrCtrl+T"))?;

            let actions_menu =
                Submenu::with_items(app, "Действия", true, &[&search_i, &new_tab_i])?;

            let create_snippet_i =
                MenuItem::with_id(app, "create-snippet", "Сниппет", true, Some("CmdOrCtrl+N"))?;
            let create_note_i = MenuItem::with_id(
                app,
                "create-note",
                "Заметка",
                true,
                Some("CmdOrCtrl+Shift+N"),
            )?;
            let create_config_i = MenuItem::with_id(
                app,
                "create-config",
                "Конфиг",
                true,
                Some("CmdOrCtrl+Shift+G"),
            )?;
            let create_link_i = MenuItem::with_id(
                app,
                "create-link",
                "Ссылка",
                true,
                Some("CmdOrCtrl+Shift+H"),
            )?;

            let create_menu = Submenu::with_items(
                app,
                "Создать",
                true,
                &[
                    &create_snippet_i,
                    &create_note_i,
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
                            &settings_i,
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
            tracing::info!("✅ Menu created successfully");

            tracing::info!("🎉 Application setup complete!");
            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "settings" => {
                let _ = app.emit("menu-settings", ());
            }
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
            commands::get_config,
            commands::save_config,
            commands::list_available_docs,
            commands::list_installed_docs,
            commands::install_documentation,
            commands::update_documentation,
            commands::delete_documentation,
            commands::get_doc_entries,
            commands::get_doc_entry_by_path,
            commands::get_doc_tree,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
