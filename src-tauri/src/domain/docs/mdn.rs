use crate::domain::parsers::url_scraper::{ContentSelectors, DocDefinition, ScraperOptions};
use regex::Regex;
use std::collections::HashSet;

pub fn mdn_javascript_definition() -> DocDefinition {
    let mut skip_patterns = vec![];
    if let Ok(re) = Regex::new(r"/.*/.*/.*/.*/") {
        skip_patterns.push(re);
    }

    DocDefinition {
        name: "mdn-javascript".to_string(),
        display_name: "MDN JavaScript".to_string(),
        version: "latest".to_string(),
        base_url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/".to_string(),
        description: "MDN Web Docs - JavaScript Reference".to_string(),
        options: ScraperOptions {
            initial_paths: vec!["Reference".to_string(), "Guide".to_string()],
            skip_patterns,
            skip_paths: HashSet::new(),
            only_patterns: Some(vec![
                Regex::new(r"^Reference").unwrap(),
                Regex::new(r"^Guide").unwrap(),
            ]),
            max_depth: Some(3),
            max_pages: Some(400),
            follow_links: true,
            concurrent_requests: 2,
            delay_ms: 300,
            ..Default::default()
        },
        selectors: ContentSelectors {
            title: "h1, .main-page-content h1".to_string(),
            content: ".main-page-content, article".to_string(),
            links: ".sidebar a, article a".to_string(),
            entry_type_attr: None,
            remove_selectors: vec![
                ".sidebar".to_string(),
                ".on-github".to_string(),
                ".bc-table".to_string(),
            ],
        },
        attribution: Some("© Mozilla Contributors. Licensed under CC-BY-SA 2.5.".to_string()),
    }
}
