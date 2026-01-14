use crate::domain::parsers::url_scraper::{ContentSelectors, DocDefinition, ScraperOptions};
use regex::Regex;
use std::collections::HashSet;

pub fn rust_definition() -> DocDefinition {
    let mut skip_patterns = vec![];
    if let Ok(re) = Regex::new(r"src/") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"\.rs\.html$") {
        skip_patterns.push(re);
    }

    DocDefinition {
        name: "rust".to_string(),
        display_name: "Rust".to_string(),
        version: "1.84.0".to_string(),
        base_url: "https://doc.rust-lang.org/std/".to_string(),
        description: "Документация стандартной библиотеки Rust".to_string(),
        options: ScraperOptions {
            initial_paths: vec!["index.html".to_string()],
            skip_patterns,
            skip_paths: HashSet::new(),
            only_patterns: None,
            max_depth: Some(2),
            max_pages: Some(50),
            follow_links: true,
            concurrent_requests: 4,
            delay_ms: 100,
            ..Default::default()
        },
        selectors: ContentSelectors {
            title: "h1.fqn, h1".to_string(),
            content: "#main-content, .docblock, .content".to_string(),
            links: ".item-table a, .sidebar-elems a, .content a".to_string(),
            entry_type_attr: None,
            remove_selectors: vec![
                ".sidebar".to_string(),
                ".source".to_string(),
                "nav".to_string(),
            ],
        },
        attribution: Some(
            "© The Rust Project Developers. Licensed under Apache 2.0 or MIT.".to_string(),
        ),
    }
}
