pub mod doc_registry;
pub mod github_parser;
pub mod url_scraper;

pub use doc_registry::{
    get_available_documentations, get_doc_metadata_by_name, scrape_documentation_with_progress,
};
pub use url_scraper::{ProgressSender, ScrapeProgress};
