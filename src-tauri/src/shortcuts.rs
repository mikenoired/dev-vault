use once_cell::sync::Lazy;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShortcutDefinition {
    id: String,
    tauri_accelerator: Option<String>,
}

static SHORTCUTS: Lazy<Vec<ShortcutDefinition>> = Lazy::new(|| {
    serde_json::from_str(include_str!("../../src/shared/shortcuts.json"))
        .expect("failed to parse shared shortcuts registry")
});

pub fn accelerator_by_id(id: &str) -> Option<&str> {
    SHORTCUTS
        .iter()
        .find(|shortcut| shortcut.id == id)
        .and_then(|shortcut| shortcut.tauri_accelerator.as_deref())
}
