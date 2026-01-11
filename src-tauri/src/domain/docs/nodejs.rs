use crate::domain::parsers::url_scraper::{ContentSelectors, DocDefinition, ScraperOptions};
use regex::Regex;
use std::collections::HashSet;

pub fn nodejs_definition() -> DocDefinition {
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