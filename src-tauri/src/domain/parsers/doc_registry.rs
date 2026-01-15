use super::github_parser::{GitHubDocConfig, GitHubParser};
use super::url_scraper::{DocDefinition, ProgressSender, UrlScraper};
use crate::domain::docs::github_docs::get_all_github_configs;
use crate::domain::docs::nodejs::nodejs_definition;
use crate::domain::docs::react::react_definition;
use crate::domain::docs::rust::rust_definition;
use crate::models::{AvailableDocumentation, ParsedDocEntry};
use anyhow::Result;

pub fn get_doc_definitions() -> Vec<DocDefinition> {
    vec![rust_definition(), react_definition(), nodejs_definition()]
}

pub fn get_definition_by_name(name: &str) -> Option<DocDefinition> {
    get_doc_definitions().into_iter().find(|d| d.name == name)
}

pub fn get_github_config_by_name(name: &str) -> Option<GitHubDocConfig> {
    get_all_github_configs()
        .into_iter()
        .find(|config| config.name == name)
}

#[derive(Debug, Clone)]
pub struct DocMetadata {
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub base_url: String,
}

pub fn get_doc_metadata_by_name(name: &str) -> Option<DocMetadata> {
    if let Some(config) = get_github_config_by_name(name) {
        return Some(DocMetadata {
            name: config.name,
            display_name: config.display_name,
            version: config.version,
            base_url: config.base_url,
        });
    }

    if let Some(definition) = get_definition_by_name(name) {
        return Some(DocMetadata {
            name: definition.name,
            display_name: definition.display_name,
            version: definition.version,
            base_url: definition.base_url,
        });
    }

    None
}

pub fn get_available_documentations() -> Vec<AvailableDocumentation> {
    let mut docs = Vec::new();

    for d in get_doc_definitions() {
        docs.push(AvailableDocumentation {
            name: d.name,
            display_name: d.display_name,
            version: d.version,
            description: d.description,
            source_url: d.base_url,
        });
    }

    for config in get_all_github_configs() {
        let repo_name = config
            .base_url
            .split('/')
            .skip(3)
            .take(2)
            .collect::<Vec<_>>()
            .join("/");

        docs.push(AvailableDocumentation {
            name: config.name.clone(),
            display_name: config.display_name.clone(),
            version: config.version.clone(),
            description: format!("Оффициальная документация {}", repo_name),
            source_url: config.base_url.clone(),
        });
    }

    docs
}

pub async fn scrape_documentation_with_progress(
    name: &str,
    progress_tx: ProgressSender,
) -> Result<Vec<ParsedDocEntry>> {
    if let Some(config) = get_github_config_by_name(name) {
        let parser = GitHubParser::new(config)?;
        return parser.scrape_with_progress(progress_tx).await;
    }

    let definition = get_definition_by_name(name)
        .ok_or_else(|| anyhow::anyhow!("Documentation not found: {}", name))?;

    let scraper = UrlScraper::new(definition)?;
    scraper.scrape_with_progress(progress_tx).await
}
