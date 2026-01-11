use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub search: SearchConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchConfig {
    pub fts_weight: f64,
    pub semantic_weight: f64,
    pub results_limit: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Dark,
    Light,
    System,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UiConfig {
    pub theme: Theme,
    pub editor_font_size: u16,
    pub compact_mode: bool,
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            fts_weight: 0.6,
            semantic_weight: 0.4,
            results_limit: 50,
        }
    }
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            theme: Theme::Dark,
            editor_font_size: 14,
            compact_mode: false,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            search: SearchConfig::default(),
            ui: UiConfig::default(),
        }
    }
}
