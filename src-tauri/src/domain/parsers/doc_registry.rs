use super::url_scraper::{DocDefinition, ProgressSender, UrlScraper};
use crate::models::ParsedDocEntry;
use anyhow::Result;
use crate::domain::docs::python::python_definition;
use crate::domain::docs::rust::rust_definition;
use crate::domain::docs::react::react_definition;
use crate::domain::docs::typescript::typescript_definition;
use crate::domain::docs::nodejs::nodejs_definition;
use crate::domain::docs::mdn::mdn_javascript_definition;

pub fn get_doc_definitions() -> Vec<DocDefinition> {
    vec![
        python_definition(),
        rust_definition(),
        react_definition(),
        typescript_definition(),
        nodejs_definition(),
        mdn_javascript_definition(),
    ]
}

pub fn get_definition_by_name(name: &str) -> Option<DocDefinition> {
    get_doc_definitions().into_iter().find(|d| d.name == name)
}

pub async fn scrape_documentation(name: &str) -> Result<Vec<ParsedDocEntry>> {
    let definition = get_definition_by_name(name)
        .ok_or_else(|| anyhow::anyhow!("Documentation not found: {}", name))?;

    let scraper = UrlScraper::new(definition)?;
    scraper.scrape().await
}

pub async fn scrape_documentation_with_progress(
    name: &str,
    progress_tx: ProgressSender,
) -> Result<Vec<ParsedDocEntry>> {
    let definition = get_definition_by_name(name)
        .ok_or_else(|| anyhow::anyhow!("Documentation not found: {}", name))?;

    let scraper = UrlScraper::new(definition)?;
    scraper.scrape_with_progress(progress_tx).await
}
