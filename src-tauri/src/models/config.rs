use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub search: SearchConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchConfig {
    pub fts_weight: f32,
    pub semantic_weight: f32,
    pub results_limit: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UiConfig {
    pub theme: String,
    pub editor_font_size: i32,
    pub compact_mode: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            search: SearchConfig {
                fts_weight: 0.6,
                semantic_weight: 0.4,
                results_limit: 50,
            },
            ui: UiConfig {
                theme: "dark".to_string(),
                editor_font_size: 14,
                compact_mode: false,
            },
        }
    }
}

