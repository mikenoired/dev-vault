use crate::domain::parsers::url_scraper::{ContentSelectors, DocDefinition, ScraperOptions};
use regex::Regex;
use std::collections::HashSet;

pub fn python_definition() -> DocDefinition {
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