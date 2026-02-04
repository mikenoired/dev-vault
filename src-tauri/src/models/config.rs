use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct AppConfig {
    pub search: SearchConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
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

pub const MAX_FONT_SIZE: u16 = 128;
pub const MIN_FONT_SIZE: u16 = 4;
pub const MAX_READING_SPEED_WPM: u16 = 1000;
pub const MIN_READING_SPEED_WPM: u16 = 50;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct UiConfig {
    pub theme: Theme,
    pub editor_font_size: u16,
    pub compact_mode: bool,
    pub reading_speed_wpm: u16,
    pub autosave_enabled: bool,
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
            reading_speed_wpm: 200,
            autosave_enabled: true,
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
