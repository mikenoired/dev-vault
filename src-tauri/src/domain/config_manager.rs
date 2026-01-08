use crate::models::config::AppConfig;
use std::path::PathBuf;
use tokio::fs;
use anyhow::Result;

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_dir: PathBuf) -> Self {
        let config_path = app_dir.join("config.toml");
        Self { config_path }
    }

    pub async fn load_config(&self) -> Result<AppConfig> {
        if !self.config_path.exists() {
            let default_config = AppConfig::default();
            self.save_config(&default_config).await?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(&self.config_path).await?;
        let config: AppConfig = toml::from_str(&content)?;
        Ok(config)
    }

    pub async fn save_config(&self, config: &AppConfig) -> Result<()> {
        let content = toml::to_string_pretty(config)?;
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await?;
        }
        fs::write(&self.config_path, content).await?;
        Ok(())
    }
}

