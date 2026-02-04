use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const APP_IDENTIFIER: &str = "com.mikenoired.dev-vault";
pub const MCP_SERVER_NAME: &str = "dev-vault";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub command_exists: bool,
}

pub fn default_db_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Failed to resolve data directory")?;
    Ok(data_dir.join(APP_IDENTIFIER).join("dev-vault.db"))
}

pub fn resolve_mcp_server_command(current_exe: Option<PathBuf>) -> String {
    let bin_name = if cfg!(target_os = "windows") {
        "dev-vault-mcp.exe"
    } else {
        "dev-vault-mcp"
    };

    if let Some(exe_path) = current_exe {
        if let Some(dir) = exe_path.parent() {
            let candidate = dir.join(bin_name);
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
    }

    bin_name.to_string()
}

pub fn build_mcp_server_config(current_exe: Option<PathBuf>) -> Result<McpServerConfig, String> {
    let db_path = default_db_path()?;
    let command = resolve_mcp_server_command(current_exe);
    let command_exists = command_available(&command);

    Ok(McpServerConfig {
        name: MCP_SERVER_NAME.to_string(),
        command,
        args: vec!["--db-path".to_string(), db_path.to_string_lossy().to_string()],
        command_exists,
    })
}

fn command_available(command: &str) -> bool {
    if command_contains_path(command) {
        return Path::new(command).exists();
    }

    let path_var = match std::env::var_os("PATH") {
        Some(value) => value,
        None => return false,
    };

    let mut candidates = vec![command.to_string()];
    if cfg!(target_os = "windows") {
        candidates.push(format!("{command}.exe"));
    }

    for dir in std::env::split_paths(&path_var) {
        for candidate in &candidates {
            if dir.join(candidate).exists() {
                return true;
            }
        }
    }

    false
}

fn command_contains_path(command: &str) -> bool {
    command.contains(std::path::MAIN_SEPARATOR)
        || command.contains('/')
        || command.contains("\\\\")
}
