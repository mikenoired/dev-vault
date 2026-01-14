pub mod doc_registry;
pub mod url_scraper;

pub use doc_registry::{
    get_definition_by_name, get_doc_definitions, scrape_documentation,
    scrape_documentation_with_progress,
};
pub use url_scraper::{HtmlFilter, ProgressSender, ScrapeProgress};

use crate::models::{AvailableDocumentation, ParsedDocEntry};
use anyhow::Result;

pub fn get_available_documentations() -> Vec<AvailableDocumentation> {
    get_doc_definitions()
        .into_iter()
        .map(|d| AvailableDocumentation {
            name: d.name,
            display_name: d.display_name,
            version: d.version,
            description: d.description,
            source_url: d.base_url,
        })
        .collect()
}

pub async fn scrape_by_name(name: &str) -> Result<Vec<ParsedDocEntry>> {
    scrape_documentation(name).await
}
