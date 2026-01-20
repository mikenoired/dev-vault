use crate::models::ParsedDocEntry;
use anyhow::{Context, Result};
use ego_tree::NodeRef;
use once_cell::sync::Lazy;
use regex::Regex;
use reqwest::Client;
use scraper::{ElementRef, Html, Node, Selector};
use serde::{Deserialize, Serialize};
use std::collections::{HashSet, VecDeque};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, Semaphore};
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrapeProgress {
    pub current_page: usize,
    pub max_pages: usize,
    pub current_path: String,
    pub entries_count: usize,
    pub status: ScrapeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScrapeStatus {
    Starting,
    Scraping,
    Processing,
    Completed,
    Failed,
}

pub type ProgressSender = mpsc::Sender<ScrapeProgress>;

#[derive(Debug, Clone)]
pub struct ScraperOptions {
    pub initial_paths: Vec<String>,
    pub skip_patterns: Vec<Regex>,
    pub skip_paths: HashSet<String>,
    pub only_patterns: Option<Vec<Regex>>,
    pub max_depth: Option<usize>,
    pub max_pages: Option<usize>,
    pub follow_links: bool,
    pub concurrent_requests: usize,
    pub delay_ms: u64,
    pub timeout_secs: u64,
    pub user_agent: String,
}

static DATA_TYPE_SELECTOR: Lazy<Selector> =
    Lazy::new(|| Selector::parse("[data-type]").expect("valid selector"));

impl Default for ScraperOptions {
    fn default() -> Self {
        Self {
            initial_paths: vec!["".to_string()],
            skip_patterns: vec![],
            skip_paths: HashSet::new(),
            only_patterns: None,
            max_depth: Some(3),
            max_pages: Some(500),
            follow_links: true,
            concurrent_requests: 4,
            delay_ms: 200,
            timeout_secs: 30,
            user_agent: "DevVault/1.0 (Documentation Scraper)".to_string(),
        }
    }
}

impl ScraperOptions {
    pub fn should_skip(&self, path: &str) -> bool {
        if self.skip_paths.contains(path) {
            return true;
        }

        for pattern in &self.skip_patterns {
            if pattern.is_match(path) {
                return true;
            }
        }

        if let Some(ref only) = self.only_patterns {
            if !only.iter().any(|p| p.is_match(path)) {
                return true;
            }
        }

        false
    }
}

#[derive(Debug, Clone)]
pub struct ContentSelectors {
    pub title: String,
    pub content: String,
    pub links: String,
    pub entry_type_attr: Option<String>,
    pub remove_selectors: Vec<String>,
}

impl Default for ContentSelectors {
    fn default() -> Self {
        Self {
            title: "h1, .page-title, title".to_string(),
            content: "main, article, .content, .documentation, #content, body".to_string(),
            links: "a[href]".to_string(),
            entry_type_attr: None,
            remove_selectors: vec![
                "nav".to_string(),
                "header".to_string(),
                "footer".to_string(),
                ".sidebar".to_string(),
                ".navigation".to_string(),
                ".toc".to_string(),
                "script".to_string(),
                "style".to_string(),
                ".ads".to_string(),
                ".advertisement".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone)]
pub struct DocDefinition {
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub base_url: String,
    pub description: String,
    pub options: ScraperOptions,
    pub selectors: ContentSelectors,
    pub attribution: Option<String>,
}

pub trait HtmlFilter: Send + Sync {
    fn name(&self) -> &str;
    fn process(&self, html: &str, context: &FilterContext) -> String;
}

#[derive(Debug, Clone)]
pub struct FilterContext {
    pub url: String,
    pub path: String,
    pub base_url: String,
}

pub struct CleanHtmlFilter;

impl HtmlFilter for CleanHtmlFilter {
    fn name(&self) -> &str {
        "clean_html"
    }

    fn process(&self, html: &str, _context: &FilterContext) -> String {
        let mut result = html.to_string();

        let patterns = [
            (r"<script[^>]*>[\s\S]*?</script>", ""),
            (r"<style[^>]*>[\s\S]*?</style>", ""),
            (r"<!--[\s\S]*?-->", ""),
            // (r"\s+", " "),
        ];

        for (pattern, replacement) in patterns {
            if let Ok(re) = Regex::new(pattern) {
                result = re.replace_all(&result, replacement).to_string();
            }
        }

        result.trim().to_string()
    }
}

pub struct NormalizeUrlsFilter {
    base_url: String,
}

impl NormalizeUrlsFilter {
    pub fn new(base_url: String) -> Self {
        Self { base_url }
    }
}

impl HtmlFilter for NormalizeUrlsFilter {
    fn name(&self) -> &str {
        "normalize_urls"
    }

    fn process(&self, html: &str, _context: &FilterContext) -> String {
        if let Ok(re) = Regex::new(r#"href=["']([^"']+)["']"#) {
            re.replace_all(html, |caps: &regex::Captures| {
                let href = &caps[1];
                if href.starts_with("http") || href.starts_with("//") {
                    caps[0].to_string()
                } else if href.starts_with('/') {
                    format!("href=\"{}{}\"", self.base_url.trim_end_matches('/'), href)
                } else {
                    caps[0].to_string()
                }
            })
            .to_string()
        } else {
            html.to_string()
        }
    }
}

pub struct ExtractTextFilter;

impl HtmlFilter for ExtractTextFilter {
    fn name(&self) -> &str {
        "extract_text"
    }

    fn process(&self, html: &str, _context: &FilterContext) -> String {
        let document = Html::parse_document(html);
        let text: String = document.root_element().text().collect::<Vec<_>>().join(" ");

        let re = Regex::new(r"\s+").unwrap();
        re.replace_all(&text, " ").trim().to_string()
    }
}

pub struct FilterPipeline {
    filters: Vec<Box<dyn HtmlFilter>>,
}

impl FilterPipeline {
    pub fn new() -> Self {
        Self { filters: vec![] }
    }

    pub fn add_filter(mut self, filter: Box<dyn HtmlFilter>) -> Self {
        self.filters.push(filter);
        self
    }

    pub fn default_pipeline(base_url: &str) -> Self {
        Self::new()
            .add_filter(Box::new(CleanHtmlFilter))
            .add_filter(Box::new(NormalizeUrlsFilter::new(base_url.to_string())))
    }

    pub fn process(&self, html: &str, context: &FilterContext) -> String {
        let mut result = html.to_string();
        for filter in &self.filters {
            result = filter.process(&result, context);
        }
        result
    }
}

impl Default for FilterPipeline {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug)]
struct ScrapedPage {
    path: String,
    title: String,
    content: String,
    entry_type: Option<String>,
    links: Vec<String>,
}

pub struct UrlScraper {
    definition: DocDefinition,
    client: Client,
    pipeline: FilterPipeline,
}

impl UrlScraper {
    pub fn new(definition: DocDefinition) -> Result<Self> {
        let client = Client::builder()
            .user_agent(&definition.options.user_agent)
            .timeout(Duration::from_secs(definition.options.timeout_secs))
            .build()
            .context("Failed to create HTTP client")?;

        let pipeline = FilterPipeline::default_pipeline(&definition.base_url);

        Ok(Self {
            definition,
            client,
            pipeline,
        })
    }

    pub fn with_pipeline(mut self, pipeline: FilterPipeline) -> Self {
        self.pipeline = pipeline;
        self
    }

    fn resolve_url(&self, path: &str) -> String {
        if path.starts_with("http://") || path.starts_with("https://") {
            return path.to_string();
        }

        let base = self.definition.base_url.trim_end_matches('/');
        if path.starts_with('/') {
            if let Ok(base_url) = Url::parse(base) {
                return format!(
                    "{}://{}{}",
                    base_url.scheme(),
                    base_url.host_str().unwrap_or(""),
                    path
                );
            }
        }

        format!("{}/{}", base, path.trim_start_matches("./"))
    }

    fn extract_path(&self, url: &str) -> Option<String> {
        let base = &self.definition.base_url;

        if url.starts_with(base) {
            let path = url.strip_prefix(base).unwrap_or(url);
            Some(path.trim_start_matches('/').to_string())
        } else if let (Ok(base_url), Ok(target_url)) = (Url::parse(base), Url::parse(url)) {
            if base_url.host() == target_url.host() {
                Some(target_url.path().trim_start_matches('/').to_string())
            } else {
                None
            }
        } else {
            None
        }
    }

    async fn fetch_page(&self, url: &str) -> Result<String> {
        let response = self
            .client
            .get(url)
            .send()
            .await
            .context(format!("Failed to fetch: {}", url))?;

        if !response.status().is_success() {
            anyhow::bail!("HTTP {} for {}", response.status(), url);
        }

        response
            .text()
            .await
            .context("Failed to read response body")
    }

    fn parse_page(&self, html: &str, path: &str, url: &str) -> ScrapedPage {
        let context = FilterContext {
            url: url.to_string(),
            path: path.to_string(),
            base_url: self.definition.base_url.clone(),
        };

        let processed_html = self.pipeline.process(html, &context);
        let document = Html::parse_document(&processed_html);

        let title = self.extract_title(&document);
        let content = self.extract_content(&document);
        let links = self.extract_links(&document, path);
        let entry_type = self.detect_entry_type(&document, path);

        ScrapedPage {
            path: path.to_string(),
            title,
            content,
            entry_type,
            links,
        }
    }

    fn extract_title(&self, document: &Html) -> String {
        let selectors: Vec<&str> = self.definition.selectors.title.split(", ").collect();

        for selector_str in selectors {
            if let Ok(selector) = Selector::parse(selector_str.trim()) {
                if let Some(element) = document.select(&selector).next() {
                    let title: String = element.text().collect();
                    let title = title.trim();
                    if !title.is_empty() {
                        return title.to_string();
                    }
                }
            }
        }

        "Untitled".to_string()
    }

    fn process_node_to_markdown(node: NodeRef<'_, Node>, selectors: &ContentSelectors) -> String {
        if let Some(element) = ElementRef::wrap(node) {
            if element.value().name() == "dl" {
                let mut md_string = String::new();
                let dt_selector = Selector::parse("dt").unwrap();
                let dd_selector = Selector::parse("dd").unwrap();

                for child_node in element.children() {
                    if let Some(child_element) = ElementRef::wrap(child_node) {
                        if child_element.select(&dt_selector).next().is_some() {
                            let term = child_element.text().collect::<String>();
                            md_string.push_str(&format!("\n**{}**\n", term.trim()));
                        } else if child_element.select(&dd_selector).next().is_some() {
                            let description_html = child_element.inner_html();
                            let description_md = html2md::parse_html(&description_html);
                            md_string.push_str(&format!(": {}\n", description_md.trim()));
                        }
                    }
                }
                return md_string;
            }
        }

        if let Some(element) = ElementRef::wrap(node) {
            return html2md::parse_html(&element.inner_html());
        } else if let Node::Text(text) = node.value() {
            return text.text.to_string();
        }

        String::new()
    }

    fn extract_language(element: &ElementRef) -> Option<String> {
        // Log: Checking language in element
        tracing::debug!(
            "extract_language: Checking element: {:?}",
            element.value().name()
        );

        let find_in_el = |el: &ElementRef| -> Option<String> {
            if let Some(class_attr) = el.value().attr("class") {
                tracing::debug!("Class attribute: {:?}", class_attr);
                for class in class_attr.split_whitespace() {
                    tracing::debug!("Checking class: {:?}", class);
                    if let Some(lang) = class.strip_prefix("language-") {
                        tracing::debug!("Found language- prefix: {}", lang);
                        if !lang.is_empty() {
                            tracing::info!(
                                "extract_language: Found language '{}' in element '{}'",
                                lang,
                                el.value().name()
                            );
                            return Some(lang.to_string());
                        }
                    }
                    if let Some(lang) = class.strip_prefix("highlight-") {
                        let lang_name: String =
                            lang.chars().take_while(|c| c.is_alphabetic()).collect();
                        tracing::debug!(
                            "Found highlight- prefix (raw: '{}'), parsed: '{}'",
                            lang,
                            lang_name
                        );
                        if !lang_name.is_empty() {
                            tracing::info!(
                                "extract_language: Found highlight language '{}' in element '{}'",
                                lang_name,
                                el.value().name()
                            );
                            return Some(lang_name);
                        }
                    }
                }
            }
            None
        };

        if let Some(lang) = find_in_el(element) {
            tracing::debug!("extract_language: Language found in the passed element.");
            return Some(lang);
        }

        let mut current_parent = element.parent();
        let mut depth = 0;
        while let Some(parent) = current_parent {
            depth += 1;
            if let Some(parent_el) = ElementRef::wrap(parent) {
                tracing::debug!(
                    "extract_language: Checking parent at depth {}: '{}'",
                    depth,
                    parent_el.value().name()
                );
                if let Some(lang) = find_in_el(&parent_el) {
                    tracing::info!(
                        "extract_language: Language found in parent (depth {}): '{}'",
                        depth,
                        lang
                    );
                    return Some(lang);
                }
                current_parent = parent_el.parent();
            } else {
                tracing::warn!(
                    "extract_language: Parent at depth {} not an element, breaking.",
                    depth
                );
                break;
            }
        }

        tracing::debug!("extract_language: No language found.");
        None
    }

    fn extract_content(&self, document: &Html) -> String {
        let Ok(content_selector) = Selector::parse(&self.definition.selectors.content) else {
            return String::new();
        };

        let Some(content_element) = document.select(&content_selector).next() else {
            return String::new();
        };

        content_element
            .children()
            .filter_map(|node| self.node_to_markdown(node))
            .filter(|s| !s.trim().is_empty())
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    fn node_to_markdown(&self, child_node: NodeRef<'_, Node>) -> Option<String> {
        if let Some(code_md) = self.try_code_block(child_node) {
            return Some(code_md);
        }

        let html = self.node_to_html_or_text(child_node)?;
        let md = html2md::parse_html(&html);

        (!md.trim().is_empty()).then_some(md)
    }

    fn try_code_block(&self, child_node: NodeRef<'_, Node>) -> Option<String> {
        let element = ElementRef::wrap(child_node)?;

        if !self.is_code_container(&element) {
            return None;
        }

        let lang = Self::extract_language(&element).unwrap_or_default();
        let code_text = element.text().collect::<String>();
        let code = code_text.trim();

        if code.is_empty() {
            return None;
        }

        Some(format!("```{}\n{}\n```", lang, code))
    }

    fn is_code_container(&self, element: &ElementRef) -> bool {
        let name = element.value().name();

        if name == "pre" {
            return true;
        }

        let Some(class_attr) = element.value().attr("class") else {
            return false;
        };

        (name == "code" && class_attr.contains("language-"))
            || (name == "div" && class_attr.contains("highlight-"))
    }

    fn node_to_html_or_text(&self, child_node: NodeRef<'_, Node>) -> Option<String> {
        if let Some(el_ref) = ElementRef::wrap(child_node) {
            let html = el_ref.html();
            return (!html.trim().is_empty()).then_some(html);
        }

        if let Some(text_node) = child_node.value().as_text() {
            let text = text_node.to_string();
            return (!text.trim().is_empty()).then_some(text);
        }

        None
    }

    fn is_ignored_href(&self, href: &str) -> bool {
        href.is_empty()
            || href.starts_with('#')
            || href.starts_with("javascript:")
            || href.starts_with("mailto:")
    }

    fn extract_links(&self, document: &Html, current_path: &str) -> Vec<String> {
        let Ok(selector) = Selector::parse(&self.definition.selectors.links) else {
            return Vec::new();
        };

        document
            .select(&selector)
            .filter_map(|el| el.value().attr("href"))
            .map(str::trim)
            .filter(|href| !self.is_ignored_href(href))
            .filter_map(|href| self.normalize_link(href, current_path))
            .collect()
    }

    fn normalize_link(&self, href: &str, current_path: &str) -> Option<String> {
        let href = href.split('#').next().unwrap_or(href);
        let href = href.split('?').next().unwrap_or(href);

        if href.starts_with("http://") || href.starts_with("https://") {
            self.extract_path(href)
        } else if href.starts_with('/') {
            Some(href.trim_start_matches('/').to_string())
        } else if href.starts_with("../") {
            let current_dir = current_path
                .rsplit_once('/')
                .map(|(dir, _)| dir)
                .unwrap_or("");

            let mut parts: Vec<&str> = current_dir.split('/').collect();
            let mut href_remaining = href;

            while href_remaining.starts_with("../") {
                parts.pop();
                href_remaining = &href_remaining[3..];
            }

            let base = parts.join("/");
            if base.is_empty() {
                Some(href_remaining.to_string())
            } else {
                Some(format!("{}/{}", base, href_remaining))
            }
        } else {
            let href = href.trim_start_matches("./");
            let current_dir = current_path
                .rsplit_once('/')
                .map(|(dir, _)| dir)
                .unwrap_or("");

            if current_dir.is_empty() {
                Some(href.to_string())
            } else {
                Some(format!("{}/{}", current_dir, href))
            }
        }
    }

    fn detect_entry_type(&self, document: &Html, path: &str) -> Option<String> {
        if let Some(attr) = self.definition.selectors.entry_type_attr.as_deref() {
            if let Some(value) = document
                .select(&DATA_TYPE_SELECTOR)
                .next()
                .and_then(|el| el.value().attr(attr))
            {
                return Some(value.to_string());
            }
        }

        let path_lower = path.to_lowercase();
        let rules = [
            (&["class", "struct"][..], "class"),
            (&["function", "fn"][..], "function"),
            (&["module", "mod"][..], "module"),
            (&["trait", "interface"][..], "trait"),
            (&["enum"][..], "enum"),
            (&["constant", "const"][..], "constant"),
            (&["type"][..], "type"),
        ];

        let kind = rules
            .iter()
            .find_map(|(keys, value)| {
                keys.iter()
                    .any(|k| path_lower.contains(k))
                    .then_some(*value)
            })
            .or_else(|| path.contains('/').then_some("page"))
            .unwrap_or("section");

        Some(kind.to_string())
    }

    fn build_parent_path(&self, path: &str) -> Option<String> {
        let path = path.trim_end_matches(".html").trim_end_matches('/');
        let parts: Vec<&str> = path.split('/').collect();

        if parts.len() > 1 {
            Some(parts[..parts.len() - 1].join("/"))
        } else {
            None
        }
    }

    fn ensure_parent_entries(
        &self,
        path: &str,
        existing_paths: &mut HashSet<String>,
        entries: &mut Vec<ParsedDocEntry>,
    ) {
        let path = path.trim_end_matches(".html").trim_end_matches('/');
        let parts: Vec<&str> = path.split('/').collect();

        let mut current_path = String::new();
        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                break;
            }

            if current_path.is_empty() {
                current_path = part.to_string();
            } else {
                current_path = format!("{}/{}", current_path, part);
            }

            if !existing_paths.contains(&current_path) {
                existing_paths.insert(current_path.clone());

                let parent_path = if i == 0 {
                    None
                } else {
                    Some(parts[..i].join("/"))
                };

                let title = part
                    .chars()
                    .next()
                    .map(|c| c.to_uppercase().to_string())
                    .unwrap_or_default()
                    + &part[1..];

                entries.push(ParsedDocEntry {
                    path: current_path.clone(),
                    title,
                    content: String::new(),
                    entry_type: Some("section".to_string()),
                    parent_path,
                });
            }
        }
    }

    pub async fn scrape_with_progress(
        &self,
        progress_tx: ProgressSender,
    ) -> Result<Vec<ParsedDocEntry>> {
        let opts = &self.definition.options;
        let max_pages = opts.max_pages.unwrap_or(999);

        let _ = progress_tx
            .send(ScrapeProgress {
                current_page: 0,
                max_pages,
                current_path: "".to_string(),
                entries_count: 0,
                status: ScrapeStatus::Starting,
            })
            .await;

        tracing::info!(
            "║ 📚 Starting URL Scraper: {}",
            self.definition.display_name
        );
        tracing::info!("║ 🌐 Base URL: {}", self.definition.base_url);
        tracing::info!("║ 📦 Version: {}", self.definition.version);

        let mut visited: HashSet<String> = HashSet::new();
        let mut existing_paths: HashSet<String> = HashSet::new();
        let mut queue: VecDeque<(String, usize)> = VecDeque::new();
        let mut entries: Vec<ParsedDocEntry> = Vec::new();

        for path in &opts.initial_paths {
            queue.push_back((path.clone(), 0));
        }

        let semaphore = Arc::new(Semaphore::new(opts.concurrent_requests));
        let mut page_count = 0;

        while let Some((path, depth)) = queue.pop_front() {
            if visited.contains(&path) {
                continue;
            }

            if page_count >= max_pages {
                tracing::info!("Reached max pages limit: {}", max_pages);
                break;
            }

            if let Some(max) = opts.max_depth {
                if depth > max {
                    continue;
                }
            }

            if opts.should_skip(&path) {
                continue;
            }

            visited.insert(path.clone());

            let _ = progress_tx
                .send(ScrapeProgress {
                    current_page: page_count + 1,
                    max_pages,
                    current_path: path.clone(),
                    entries_count: entries.len(),
                    status: ScrapeStatus::Scraping,
                })
                .await;

            let url = self.resolve_url(&path);
            let _permit = semaphore.acquire().await.unwrap();

            match self.fetch_page(&url).await {
                Ok(html) => {
                    let page = self.parse_page(&html, &path, &url);
                    page_count += 1;

                    self.ensure_parent_entries(&page.path, &mut existing_paths, &mut entries);

                    if !page.content.is_empty() {
                        existing_paths.insert(page.path.clone());
                        entries.push(ParsedDocEntry {
                            path: page.path.clone(),
                            title: page.title,
                            content: page.content,
                            entry_type: page.entry_type,
                            parent_path: self.build_parent_path(&page.path),
                        });
                    }

                    if opts.follow_links {
                        for link in page.links {
                            if !visited.contains(&link) && !opts.should_skip(&link) {
                                queue.push_back((link, depth + 1));
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch {}: {:?}", url, e);
                }
            }

            if opts.delay_ms > 0 {
                tokio::time::sleep(Duration::from_millis(opts.delay_ms)).await;
            }
        }

        let _ = progress_tx
            .send(ScrapeProgress {
                current_page: page_count,
                max_pages,
                current_path: "".to_string(),
                entries_count: entries.len(),
                status: ScrapeStatus::Completed,
            })
            .await;

        tracing::info!("║ ✅ Scraping completed!");
        tracing::info!("║ 📊 Total pages scraped: {}", page_count);
        tracing::info!("║ 📝 Entries created: {}", entries.len());

        Ok(entries)
    }

    pub fn definition(&self) -> &DocDefinition {
        &self.definition
    }
}
