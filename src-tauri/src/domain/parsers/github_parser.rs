use crate::models::ParsedDocEntry;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::process::Command;
use url::Url;

use super::url_scraper::{ProgressSender, ScrapeProgress, ScrapeStatus};

/// Конфигурация для парсинга документации из GitHub
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubDocConfig {
    /// Уникальное имя документации
    pub name: String,
    /// Отображаемое имя
    pub display_name: String,
    /// Версия (извлекается из base_url или задаётся вручную)
    pub version: String,
    /// Базовый URL репозитория GitHub (например: https://github.com/python/cpython/tree/main/Doc)
    pub base_url: String,
    /// Доступные версии (ветки), которые можно выбрать
    pub available_versions: Vec<String>,
    /// Файлы .md, которые нужно игнорировать
    pub ignore_files: Vec<String>,
    /// Директории, которые нужно игнорировать
    pub ignore_dirs: Vec<String>,
}

impl GitHubDocConfig {
    /// Извлекает информацию о репозитории из base_url
    /// Формат: https://github.com/{owner}/{repo}/tree/{branch}/{path}
    fn parse_repo_info(&self) -> Result<RepoInfo> {
        let url = Url::parse(&self.base_url).context("Failed to parse base_url")?;

        if url.host_str() != Some("github.com") {
            anyhow::bail!("URL должен быть с github.com");
        }

        let path_segments: Vec<&str> = url
            .path_segments()
            .ok_or_else(|| anyhow::anyhow!("Invalid URL path"))?
            .collect();

        if path_segments.len() < 4 || path_segments[2] != "tree" {
            anyhow::bail!(
                "Неверный формат URL. Ожидается: https://github.com/owner/repo/tree/branch/path"
            );
        }

        let owner = path_segments[0].to_string();
        let repo = path_segments[1].to_string();
        let branch = path_segments[3].to_string();
        let path = if path_segments.len() > 4 {
            path_segments[4..].join("/")
        } else {
            String::new()
        };

        Ok(RepoInfo {
            owner,
            repo,
            branch,
            path,
        })
    }

    /// Проверяет, нужно ли игнорировать файл
    pub fn should_ignore_file(&self, file_path: &str) -> bool {
        let file_name = file_path.split('/').last().unwrap_or(file_path);

        for ignore_pattern in &self.ignore_files {
            if file_name == ignore_pattern || file_path.contains(ignore_pattern) {
                return true;
            }
        }

        false
    }

    /// Проверяет, нужно ли игнорировать директорию
    pub fn should_ignore_dir(&self, dir_path: &str) -> bool {
        for ignore_pattern in &self.ignore_dirs {
            if dir_path.contains(ignore_pattern) {
                return true;
            }
        }

        false
    }
}

#[derive(Debug, Clone)]
struct RepoInfo {
    owner: String,
    repo: String,
    branch: String,
    path: String,
}

pub struct GitHubParser {
    config: GitHubDocConfig,
}

impl GitHubParser {
    pub fn new(config: GitHubDocConfig) -> Result<Self> {
        Ok(Self { config })
    }

    /// Клонирует репозиторий локально
    async fn clone_repository(&self, repo_info: &RepoInfo, temp_dir: &Path) -> Result<()> {
        let repo_url = format!(
            "https://github.com/{}/{}.git",
            repo_info.owner, repo_info.repo
        );

        tracing::info!("Cloning repository: {} to {:?}", repo_url, temp_dir);

        let output = Command::new("git")
            .arg("clone")
            .arg("--depth")
            .arg("1")
            .arg("--branch")
            .arg(&repo_info.branch)
            .arg(&repo_url)
            .arg(temp_dir)
            .output()
            .await
            .context("Failed to execute git clone")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Git clone failed: {}", stderr);
        }

        tracing::info!("Repository cloned successfully");
        Ok(())
    }

    /// Рекурсивно собирает все .md файлы из указанной директории
    async fn collect_markdown_files(
        &self,
        base_path: &Path,
        target_path: &Path,
        _repo_path: &str,
    ) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        let mut dirs_to_visit = vec![target_path.to_path_buf()];

        while let Some(current_dir) = dirs_to_visit.pop() {
            let mut entries = fs::read_dir(&current_dir)
                .await
                .context(format!("Failed to read directory: {:?}", current_dir))?;

            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                let metadata = entry.metadata().await?;

                if metadata.is_dir() {
                    let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if !self.config.should_ignore_dir(dir_name) {
                        dirs_to_visit.push(path);
                    }
                } else if metadata.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "md" {
                            let relative_path = path
                                .strip_prefix(base_path)
                                .context("Failed to get relative path")?;
                            let path_str = relative_path.to_string_lossy().to_string();

                            if !self.config.should_ignore_file(&path_str) {
                                files.push(path);
                            }
                        }
                    }
                }
            }
        }

        Ok(files)
    }

    /// Читает содержимое файла
    async fn read_file_content(&self, file_path: &Path) -> Result<String> {
        fs::read_to_string(file_path)
            .await
            .context(format!("Failed to read file: {:?}", file_path))
    }

    /// Извлекает заголовок из Markdown файла
    fn extract_title_from_markdown(&self, content: &str, file_path: &str) -> String {
        // Пытаемся найти заголовок H1 в начале файла
        for line in content.lines().take(20) {
            let line = line.trim();
            if line.starts_with("# ") {
                return line[2..].trim().to_string();
            }
            if line.starts_with("#") && !line.starts_with("##") {
                return line[1..].trim().to_string();
            }
        }

        // Если заголовок не найден, используем имя файла
        file_path
            .split('/')
            .last()
            .unwrap_or(file_path)
            .trim_end_matches(".md")
            .replace('_', " ")
            .replace('-', " ")
    }

    /// Определяет тип записи на основе пути
    fn detect_entry_type(&self, path: &str) -> Option<String> {
        let path_lower = path.to_lowercase();

        if path_lower.contains("api") || path_lower.contains("reference") {
            Some("api".to_string())
        } else if path_lower.contains("guide") || path_lower.contains("tutorial") {
            Some("guide".to_string())
        } else if path_lower.contains("example") {
            Some("example".to_string())
        } else if path.contains('/') {
            Some("page".to_string())
        } else {
            Some("section".to_string())
        }
    }

    /// Строит путь родителя
    fn build_parent_path(&self, path: &str) -> Option<String> {
        let path = path.trim_end_matches(".md");
        let parts: Vec<&str> = path.split('/').collect();

        if parts.len() > 1 {
            Some(parts[..parts.len() - 1].join("/"))
        } else {
            None
        }
    }

    /// Парсинг с прогрессом
    pub async fn scrape_with_progress(
        &self,
        progress_tx: ProgressSender,
    ) -> Result<Vec<ParsedDocEntry>> {
        let repo_info = self.config.parse_repo_info()?;

        let _ = progress_tx
            .send(ScrapeProgress {
                current_page: 0,
                max_pages: 0,
                current_path: "Cloning repository...".to_string(),
                entries_count: 0,
                status: ScrapeStatus::Starting,
            })
            .await;

        tracing::info!("║ 📚 Starting GitHub Parser: {}", self.config.display_name);
        tracing::info!("║ 🌐 Repository: {}/{}", repo_info.owner, repo_info.repo);
        tracing::info!("║ 🌿 Branch: {}", repo_info.branch);

        // Создаём временную директорию для клонирования
        let temp_dir = std::env::temp_dir().join(format!(
            "dev-vault-{}-{}",
            repo_info.repo,
            uuid::Uuid::new_v4().simple()
        ));

        // Убеждаемся, что директория не существует
        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).await.ok();
        }

        // Клонируем репозиторий
        self.clone_repository(&repo_info, &temp_dir).await?;

        let _ = progress_tx
            .send(ScrapeProgress {
                current_page: 0,
                max_pages: 0,
                current_path: "Collecting files...".to_string(),
                entries_count: 0,
                status: ScrapeStatus::Processing,
            })
            .await;

        // Определяем путь к документации внутри клонированного репозитория
        let docs_path = if repo_info.path.is_empty() {
            temp_dir.clone()
        } else {
            temp_dir.join(&repo_info.path)
        };

        // Собираем все .md файлы
        let md_files = self
            .collect_markdown_files(&temp_dir, &docs_path, &repo_info.path)
            .await?;

        let max_files = md_files.len();

        let _ = progress_tx
            .send(ScrapeProgress {
                current_page: 0,
                max_pages: max_files,
                current_path: "".to_string(),
                entries_count: 0,
                status: ScrapeStatus::Scraping,
            })
            .await;

        let mut entries = Vec::new();
        let mut existing_paths = HashSet::new();

        for (idx, file_path) in md_files.iter().enumerate() {
            // Получаем относительный путь от корня репозитория
            let relative_path = file_path
                .strip_prefix(&temp_dir)
                .context("Failed to get relative path")?
                .to_string_lossy()
                .to_string();

            // Если указан путь документации, убираем его из начала
            let relative_path =
                if !repo_info.path.is_empty() && relative_path.starts_with(&repo_info.path) {
                    relative_path
                        .strip_prefix(&repo_info.path)
                        .unwrap_or(&relative_path)
                        .trim_start_matches('/')
                        .to_string()
                } else {
                    relative_path
                };

            if relative_path.is_empty() {
                continue;
            }

            let _ = progress_tx
                .send(ScrapeProgress {
                    current_page: idx + 1,
                    max_pages: max_files,
                    current_path: relative_path.clone(),
                    entries_count: entries.len(),
                    status: ScrapeStatus::Scraping,
                })
                .await;

            match self.read_file_content(file_path).await {
                Ok(content) => {
                    let path_without_ext = relative_path.trim_end_matches(".md");
                    let parts: Vec<&str> = path_without_ext.split('/').collect();

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

                            entries.push(ParsedDocEntry {
                                path: current_path.clone(),
                                title: part.replace('_', " ").replace('-', " "),
                                content: String::new(),
                                entry_type: Some("section".to_string()),
                                parent_path,
                            });
                        }
                    }

                    let title = self.extract_title_from_markdown(&content, &relative_path);
                    let entry_type = self.detect_entry_type(&relative_path);
                    let parent_path = self.build_parent_path(&relative_path);

                    existing_paths.insert(path_without_ext.to_string());
                    entries.push(ParsedDocEntry {
                        path: path_without_ext.to_string(),
                        title,
                        content,
                        entry_type,
                        parent_path,
                    });
                }
                Err(e) => {
                    tracing::warn!("Failed to read {}: {:?}", file_path.display(), e);
                }
            }
        }

        // Удаляем временную директорию
        tracing::info!("Cleaning up temporary directory: {:?}", temp_dir);
        if let Err(e) = fs::remove_dir_all(&temp_dir).await {
            tracing::warn!("Failed to remove temp directory: {:?}", e);
        }

        let _ = progress_tx
            .send(ScrapeProgress {
                current_page: max_files,
                max_pages: max_files,
                current_path: "".to_string(),
                entries_count: entries.len(),
                status: ScrapeStatus::Completed,
            })
            .await;

        tracing::info!("║ ✅ Parsing completed!");
        tracing::info!("║ 📝 Entries created: {}", entries.len());

        Ok(entries)
    }
}
