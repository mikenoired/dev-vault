use crate::models::config::{
    AppConfig, MAX_FONT_SIZE, MAX_READING_SPEED_WPM, MIN_FONT_SIZE, MIN_READING_SPEED_WPM,
};
use anyhow::Result;
use std::path::PathBuf;
use tokio::fs;

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_dir: PathBuf) -> Self {
        let config_path = app_dir.join("config.toml");
        Self { config_path }
    }

    fn validate_config_internal(config: &AppConfig) -> Result<()> {
        if config.search.fts_weight < 0.0 || config.search.semantic_weight < 0.0 {
            return Err(anyhow::anyhow!("search weights must be non-negative"));
        }

        let sum = config.search.fts_weight + config.search.semantic_weight;
        if sum <= f64::EPSILON {
            return Err(anyhow::anyhow!("at least one search weight must be > 0"));
        }

        if config.search.results_limit == 0 {
            return Err(anyhow::anyhow!("results limit must be > 0"));
        }

        if !(MIN_FONT_SIZE..=MAX_FONT_SIZE).contains(&config.ui.editor_font_size) {
            return Err(anyhow::anyhow!(
                "editor font size must be between {} and {}",
                MIN_FONT_SIZE,
                MAX_FONT_SIZE
            ));
        }

        if !(MIN_READING_SPEED_WPM..=MAX_READING_SPEED_WPM).contains(&config.ui.reading_speed_wpm) {
            return Err(anyhow::anyhow!(
                "reading speed must be between {} and {}",
                MIN_READING_SPEED_WPM,
                MAX_READING_SPEED_WPM
            ));
        }

        Ok(())
    }

    fn normalize_config(mut config: AppConfig) -> AppConfig {
        let sum = config.search.fts_weight + config.search.semantic_weight;

        if sum > 0.0 {
            config.search.fts_weight /= sum;
            config.search.semantic_weight /= sum;
        }

        config
    }

    pub async fn load_config(&self) -> Result<AppConfig> {
        if fs::metadata(&self.config_path).await.is_err() {
            let default_config = AppConfig::default();
            self.save_config(&default_config).await?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(&self.config_path).await?;
        let config: AppConfig = toml::from_str(&content)?;

        Self::validate_config_internal(&config)?;

        let normalized = Self::normalize_config(config);

        Ok(normalized)
    }

    pub async fn save_config(&self, config: &AppConfig) -> Result<()> {
        Self::validate_config_internal(config)?;

        let content = toml::to_string_pretty(config)?;
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await?;
        }
        fs::write(&self.config_path, content).await?;
        Ok(())
    }
}
