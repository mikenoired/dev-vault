use crate::domain::parsers::url_scraper::{ContentSelectors, DocDefinition, ScraperOptions};
use regex::Regex;
use std::collections::HashSet;

pub fn react_definition() -> DocDefinition {
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
