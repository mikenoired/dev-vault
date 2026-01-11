use super::url_scraper::{ContentSelectors, DocDefinition, ProgressSender, ScraperOptions, UrlScraper};
use crate::models::ParsedDocEntry;
use anyhow::Result;
use regex::Regex;
use std::collections::HashSet;

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

fn python_definition() -> DocDefinition {
    let mut skip_patterns = vec![];
    if let Ok(re) = Regex::new(r"whatsnew") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"_sources") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"genindex") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"search\.html") {
        skip_patterns.push(re);
    }

    let mut skip_paths = HashSet::new();
    skip_paths.insert("library/2to3.html".to_string());
    skip_paths.insert("library/formatter.html".to_string());
    skip_paths.insert("library/intro.html".to_string());
    skip_paths.insert("library/undoc.html".to_string());
    skip_paths.insert("bugs.html".to_string());
    skip_paths.insert("about.html".to_string());
    skip_paths.insert("copyright.html".to_string());
    skip_paths.insert("license.html".to_string());

    DocDefinition {
        name: "python".to_string(),
        display_name: "Python".to_string(),
        version: "3.13".to_string(),
        base_url: "https://docs.python.org/3.13/".to_string(),
        description: "Официальная документация Python".to_string(),
        options: ScraperOptions {
            initial_paths: vec![
                "library/index.html".to_string(),
                "reference/index.html".to_string(),
            ],
            skip_patterns,
            skip_paths,
            only_patterns: Some(vec![
                Regex::new(r"^library/").unwrap(),
                Regex::new(r"^reference/").unwrap(),
            ]),
            max_depth: Some(2),
            max_pages: Some(50),
            follow_links: true,
            concurrent_requests: 4,
            delay_ms: 150,
            ..Default::default()
        },
        selectors: ContentSelectors {
            title: "h1".to_string(),
            content: ".body, article, main".to_string(),
            links: "a.reference.internal, .toctree-l1 a, .toctree-l2 a".to_string(),
            entry_type_attr: None,
            remove_selectors: vec![
                ".headerlink".to_string(),
                ".sphinxsidebar".to_string(),
                ".related".to_string(),
            ],
        },
        attribution: Some(
            "© 2001–2024 Python Software Foundation. Licensed under the PSF License.".to_string(),
        ),
    }
}

fn rust_definition() -> DocDefinition {
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

fn react_definition() -> DocDefinition {
    let mut skip_patterns = vec![];
    if let Ok(re) = Regex::new(r"^blog") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"^community") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"^versions") {
        skip_patterns.push(re);
    }

    DocDefinition {
        name: "react".to_string(),
        display_name: "React".to_string(),
        version: "19".to_string(),
        base_url: "https://react.dev/".to_string(),
        description: "Официальная документация React".to_string(),
        options: ScraperOptions {
            initial_paths: vec![
                "learn".to_string(),
                "reference/react".to_string(),
                "reference/react-dom".to_string(),
            ],
            skip_patterns,
            skip_paths: HashSet::new(),
            only_patterns: Some(vec![
                Regex::new(r"^learn").unwrap(),
                Regex::new(r"^reference").unwrap(),
            ]),
            max_depth: Some(3),
            max_pages: Some(200),
            follow_links: true,
            concurrent_requests: 2,
            delay_ms: 300,
            ..Default::default()
        },
        selectors: ContentSelectors {
            title: "h1, article h1".to_string(),
            content: "article, main, .markdown".to_string(),
            links: "nav a, article a".to_string(),
            entry_type_attr: None,
            remove_selectors: vec![
                "nav".to_string(),
                "footer".to_string(),
                ".sandpack".to_string(),
            ],
        },
        attribution: Some("© Meta Platforms, Inc. Licensed under CC BY 4.0.".to_string()),
    }
}

fn typescript_definition() -> DocDefinition {
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

fn nodejs_definition() -> DocDefinition {
    let mut skip_patterns = vec![];
    if let Ok(re) = Regex::new(r"^api/all\.html") {
        skip_patterns.push(re);
    }
    if let Ok(re) = Regex::new(r"^download") {
        skip_patterns.push(re);
    }

    DocDefinition {
        name: "nodejs".to_string(),
        display_name: "Node.js".to_string(),
        version: "22".to_string(),
        base_url: "https://nodejs.org/docs/latest-v22.x/api/".to_string(),
        description: "Документация Node.js API".to_string(),
        options: ScraperOptions {
            initial_paths: vec!["index.html".to_string()],
            skip_patterns,
            skip_paths: HashSet::new(),
            only_patterns: None,
            max_depth: Some(2),
            max_pages: Some(150),
            follow_links: true,
            concurrent_requests: 4,
            delay_ms: 150,
            ..Default::default()
        },
        selectors: ContentSelectors {
            title: "h1, #apicontent h1".to_string(),
            content: "#apicontent, article".to_string(),
            links: "#apicontent a, .toc a".to_string(),
            entry_type_attr: None,
            remove_selectors: vec!["#column2".to_string(), "nav".to_string()],
        },
        attribution: Some("© OpenJS Foundation. Licensed under MIT.".to_string()),
    }
}

fn mdn_javascript_definition() -> DocDefinition {
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
            initial_paths: vec![
                "Reference".to_string(),
                "Guide".to_string(),
            ],
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
        attribution: Some(
            "© Mozilla Contributors. Licensed under CC-BY-SA 2.5.".to_string(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_definitions() {
        let defs = get_doc_definitions();
        assert!(!defs.is_empty());

        let names: Vec<&str> = defs.iter().map(|d| d.name.as_str()).collect();
        assert!(names.contains(&"python"));
        assert!(names.contains(&"rust"));
        assert!(names.contains(&"react"));
    }

    #[test]
    fn test_get_by_name() {
        let python = get_definition_by_name("python");
        assert!(python.is_some());
        assert_eq!(python.unwrap().display_name, "Python");

        let unknown = get_definition_by_name("unknown");
        assert!(unknown.is_none());
    }
}
