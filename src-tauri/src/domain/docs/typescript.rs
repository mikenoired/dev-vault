use crate::domain::parsers::url_scraper::{ContentSelectors, DocDefinition, ScraperOptions};
use regex::Regex;
use std::collections::HashSet;

pub fn typescript_definition() -> DocDefinition {
    let mut skip_patterns = vec![];
    if let Ok(re) = Regex::new(r"^play") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"^community") {
        skip_patterns.push(re);
    }

    DocDefinition {
        name: "typescript".to_string(),
        display_name: "TypeScript".to_string(),
        version: "5.7".to_string(),
        base_url: "https://www.typescriptlang.org/docs/".to_string(),
        description: "Официальная документация TypeScript".to_string(),
        options: ScraperOptions {
            initial_paths: vec!["handbook/intro.html".to_string()],
            skip_patterns,
            skip_paths: HashSet::new(),
            only_patterns: Some(vec![Regex::new(r"^handbook").unwrap()]),
            max_depth: Some(3),
            max_pages: Some(100),
            follow_links: true,
            concurrent_requests: 2,
            delay_ms: 200,
            ..Default::default()
        },
        selectors: ContentSelectors {
            title: "h1, .article-heading".to_string(),
            content: "article, .markdown, #handbook-content".to_string(),
            links: "nav a, .toc a".to_string(),
            entry_type_attr: None,
            remove_selectors: vec!["nav".to_string(), ".playground".to_string()],
        },
        attribution: Some("© Microsoft. Licensed under Apache 2.0.".to_string()),
    }
}
