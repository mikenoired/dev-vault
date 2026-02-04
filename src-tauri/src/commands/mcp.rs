use crate::mcp::{build_mcp_server_config, default_db_path, McpServerConfig, MCP_SERVER_NAME};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, State};

use super::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiToolStatus {
    pub id: String,
    pub name: String,
    pub detected: bool,
    pub config_path: Option<String>,
    pub mcp_installed: bool,
    pub supports_auto_connect: bool,
    pub status_message: Option<String>,
}

#[derive(Debug, Clone)]
struct ToolDefinition {
    id: &'static str,
    name: &'static str,
    config_paths: Vec<PathBuf>,
    supports_auto_connect: bool,
}

fn detect_tools() -> Vec<ToolDefinition> {
    let codex_home = std::env::var("CODEX_HOME").ok().map(PathBuf::from);
    let mut tools = Vec::new();

    let mut codex_paths = Vec::new();
    if let Some(codex_home) = codex_home.clone() {
        codex_paths.push(codex_home.join("config.toml"));
    }
    if let Some(home) = dirs::home_dir() {
        codex_paths.push(home.join(".codex/config.toml"));
    }
    if let Ok(cwd) = std::env::current_dir() {
        codex_paths.push(cwd.join(".codex/config.toml"));
    }

    tools.push(ToolDefinition {
        id: "codex",
        name: "Codex",
        config_paths: codex_paths,
        supports_auto_connect: true,
    });

    tools
}

fn pick_config_path(tool: &ToolDefinition) -> Option<PathBuf> {
    tool.config_paths.iter().find(|path| path.exists()).cloned()
}

fn detect_tool_status(tool: &ToolDefinition) -> AiToolStatus {
    let config_path = pick_config_path(tool).or_else(|| tool.config_paths.first().cloned());
    let detected = find_executable("codex").is_some();

    let mut mcp_installed = false;
    let mut status_message = None;

    if let Some(path) = &config_path {
        match read_toml_file(path) {
            Ok(value) => {
                mcp_installed = is_mcp_entry_present(&value);
            }
            Err(err) => {
                if path.exists() {
                    status_message = Some(format!("Не удалось прочитать конфиг: {err}"));
                }
            }
        }
    }

    AiToolStatus {
        id: tool.id.to_string(),
        name: tool.name.to_string(),
        detected,
        config_path: config_path.map(|path| path.to_string_lossy().to_string()),
        mcp_installed,
        supports_auto_connect: tool.supports_auto_connect,
        status_message,
    }
}

fn ensure_valid_db_path() -> Result<(), String> {
    let db_path = default_db_path()?;
    if !db_path.exists() {
        return Err("База данных не найдена. Запустите приложение Dev Vault хотя бы один раз.".to_string());
    }
    Ok(())
}

fn ensure_tool_supported(tool: &ToolDefinition) -> Result<(), String> {
    if !tool.supports_auto_connect {
        return Err("Автоподключение для этого инструмента недоступно".to_string());
    }
    Ok(())
}

fn read_toml_file(path: &Path) -> Result<toml::Value, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    toml::from_str(&content).map_err(|e| e.to_string())
}

fn is_mcp_entry_present(value: &toml::Value) -> bool {
    value
        .get("mcp_servers")
        .and_then(|servers| servers.get(MCP_SERVER_NAME))
        .is_some()
}

fn find_executable(name: &str) -> Option<PathBuf> {
    let locator = if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    };

    let output = Command::new(locator).arg(name).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let first = stdout.lines().next()?.trim();
    if first.is_empty() {
        return None;
    }

    Some(PathBuf::from(first))
}

fn build_codex_add_command(server: &McpServerConfig) -> Result<(PathBuf, Vec<String>), String> {
    let codex_path = find_executable("codex").ok_or("Codex не найден в PATH".to_string())?;

    let mut args = vec![
        "mcp".to_string(),
        "add".to_string(),
        MCP_SERVER_NAME.to_string(),
        "--".to_string(),
        server.command.clone(),
    ];
    args.extend(server.args.clone());

    Ok((codex_path, args))
}

#[tauri::command]
pub async fn get_mcp_server_config(_app: AppHandle) -> Result<McpServerConfig, String> {
    let exe_path = std::env::current_exe().ok();
    build_mcp_server_config(exe_path)
}

#[tauri::command]
pub async fn list_ai_tools(_state: State<'_, AppState>) -> Result<Vec<AiToolStatus>, String> {
    let tools = detect_tools();
    Ok(tools.iter().map(detect_tool_status).collect())
}

#[tauri::command]
pub async fn connect_mcp_server(
    _app: AppHandle,
    tool_id: String,
) -> Result<AiToolStatus, String> {
    ensure_valid_db_path()?;

    let tools = detect_tools();
    let tool = tools
        .iter()
        .find(|tool| tool.id == tool_id)
        .ok_or("Инструмент не поддерживается".to_string())?;

    ensure_tool_supported(tool)?;

    let exe_path = std::env::current_exe().ok();
    let server = build_mcp_server_config(exe_path)?;
    if !server.command_exists {
        return Err(
            "MCP-бинарь не найден. Соберите dev-vault-mcp и повторите попытку.".to_string(),
        );
    }

    let (codex_path, args) = build_codex_add_command(&server)?;
    let output = Command::new(codex_path)
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let message = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else if !stdout.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            "Не удалось добавить MCP-сервер".to_string()
        };
        return Err(message);
    }

    Ok(detect_tool_status(tool))
}

#[tauri::command]
pub async fn mcp_health() -> Result<String, String> {
    Ok(format!("{MCP_SERVER_NAME} ready"))
}
