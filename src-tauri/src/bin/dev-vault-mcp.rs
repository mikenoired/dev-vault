use dev_vault_lib::domain::{DocumentationManager, SearchEngine, Storage};
use dev_vault_lib::mcp::{default_db_path, MCP_SERVER_NAME};
use dev_vault_lib::models::{DocEntry, DocTreeNode, Documentation, ItemType, ItemWithTags, SearchQuery};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::io::{self};
use std::path::PathBuf;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

#[derive(Debug, Deserialize)]
struct RpcRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Serialize)]
struct RpcResponse {
    jsonrpc: &'static str,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Serialize)]
struct RpcError {
    code: i32,
    message: String,
}

#[derive(Serialize)]
struct InitializeResult {
    #[serde(rename = "protocolVersion")]
    protocol_version: String,
    capabilities: HashMap<String, Value>,
    #[serde(rename = "serverInfo")]
    server_info: ServerInfo,
}

#[derive(Serialize)]
struct ServerInfo {
    name: String,
    version: String,
}

#[derive(Serialize)]
struct ToolDefinition {
    name: String,
    description: String,
    #[serde(rename = "inputSchema")]
    input_schema: Value,
}

#[derive(Deserialize)]
struct ToolCallParams {
    name: String,
    arguments: Option<Value>,
}

#[derive(Serialize)]
struct ToolCallResult {
    content: Vec<ToolContent>,
    #[serde(rename = "isError")]
    is_error: bool,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum ToolContent {
    #[serde(rename = "text")]
    Text { text: String },
}

#[derive(Serialize)]
struct SearchItemSlim {
    id: i64,
    #[serde(rename = "type")]
    item_type: ItemType,
    title: String,
    description: Option<String>,
    tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    highlights: Option<Vec<String>>,
}

#[derive(Serialize)]
struct ItemSlim {
    id: i64,
    #[serde(rename = "type")]
    item_type: ItemType,
    title: String,
    description: Option<String>,
    tags: Vec<String>,
    #[serde(rename = "createdAt")]
    created_at: i64,
    #[serde(rename = "updatedAt")]
    updated_at: i64,
}

#[derive(Serialize)]
struct ItemFull {
    id: i64,
    #[serde(rename = "type")]
    item_type: ItemType,
    title: String,
    description: Option<String>,
    content: String,
    tags: Vec<String>,
    #[serde(rename = "createdAt")]
    created_at: i64,
    #[serde(rename = "updatedAt")]
    updated_at: i64,
    metadata: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct DocumentationSlim {
    id: i64,
    name: String,
    #[serde(rename = "displayName")]
    display_name: String,
    version: String,
    #[serde(rename = "sourceUrl")]
    source_url: String,
    #[serde(rename = "installedAt")]
    installed_at: i64,
    #[serde(rename = "updatedAt")]
    updated_at: i64,
}

#[derive(Deserialize)]
struct ListItemsArgs {
    limit: Option<i64>,
    offset: Option<i64>,
    #[serde(rename = "type")]
    item_type: Option<ItemType>,
}

#[derive(Deserialize)]
struct GetItemArgs {
    id: i64,
}

#[derive(Deserialize)]
struct DocsTreeArgs {
    #[serde(rename = "docId")]
    doc_id: i64,
    #[serde(rename = "parentPath")]
    parent_path: Option<String>,
}

#[derive(Deserialize)]
struct DocsEntryArgs {
    #[serde(rename = "docId")]
    doc_id: i64,
    path: String,
}

fn item_tags(tags: Vec<dev_vault_lib::models::Tag>) -> Vec<String> {
    tags.into_iter().map(|tag| tag.name).collect()
}

fn item_to_slim(item: ItemWithTags) -> ItemSlim {
    let ItemWithTags {
        item,
        tags,
        highlights: _,
    } = item;
    ItemSlim {
        id: item.id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        tags: item_tags(tags),
        created_at: item.created_at,
        updated_at: item.updated_at,
    }
}

fn item_to_full(item: ItemWithTags) -> ItemFull {
    let ItemWithTags {
        item,
        tags,
        highlights: _,
    } = item;
    ItemFull {
        id: item.id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        content: item.content,
        tags: item_tags(tags),
        created_at: item.created_at,
        updated_at: item.updated_at,
        metadata: item.metadata,
    }
}

fn item_to_search_slim(item: ItemWithTags) -> SearchItemSlim {
    let ItemWithTags {
        item,
        tags,
        highlights,
    } = item;
    SearchItemSlim {
        id: item.id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        tags: item_tags(tags),
        highlights,
    }
}

fn doc_to_slim(doc: Documentation) -> DocumentationSlim {
    DocumentationSlim {
        id: doc.id,
        name: doc.name,
        display_name: doc.display_name,
        version: doc.version,
        source_url: doc.source_url,
        installed_at: doc.installed_at,
        updated_at: doc.updated_at,
    }
}

fn ensure_request_id(id: Option<Value>) -> Value {
    id.unwrap_or(Value::Null)
}

fn ok_response(id: Value, result: Value) -> RpcResponse {
    RpcResponse {
        jsonrpc: "2.0",
        id,
        result: Some(result),
        error: None,
    }
}

fn error_response(id: Value, message: impl Into<String>) -> RpcResponse {
    RpcResponse {
        jsonrpc: "2.0",
        id,
        result: None,
        error: Some(RpcError {
            code: -32000,
            message: message.into(),
        }),
    }
}

fn tool_error_response(id: Value, message: impl Into<String>) -> RpcResponse {
    let result = ToolCallResult {
        content: vec![ToolContent::Text {
            text: message.into(),
        }],
        is_error: true,
    };

    match serde_json::to_value(result) {
        Ok(value) => ok_response(id, value),
        Err(err) => error_response(id, err.to_string()),
    }
}

fn args_or_empty(value: Option<Value>) -> Value {
    match value {
        Some(Value::Null) | None => serde_json::json!({}),
        Some(value) => value,
    }
}

fn tools_list() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "devvault.search".to_string(),
            description: "Поиск по Dev Vault (FTS + семантика), возвращает slim-результаты".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "type": {"type": "string", "enum": ["snippet", "config", "note", "link", "documentation"]},
                    "tagIds": {"type": "array", "items": {"type": "number"}},
                    "limit": {"type": "number"},
                    "offset": {"type": "number"}
                },
                "required": ["query"]
            }),
        },
        ToolDefinition {
            name: "devvault.items.list".to_string(),
            description: "Список айтемов без контента".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "limit": {"type": "number"},
                    "offset": {"type": "number"},
                    "type": {"type": "string", "enum": ["snippet", "config", "note", "link", "documentation"]}
                }
            }),
        },
        ToolDefinition {
            name: "devvault.items.get".to_string(),
            description: "Получить айтем с контентом".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {"id": {"type": "number"}},
                "required": ["id"]
            }),
        },
        ToolDefinition {
            name: "devvault.tags.list".to_string(),
            description: "Список тегов".to_string(),
            input_schema: serde_json::json!({"type": "object", "properties": {}}),
        },
        ToolDefinition {
            name: "devvault.items.counts".to_string(),
            description: "Количество айтемов по типам".to_string(),
            input_schema: serde_json::json!({"type": "object", "properties": {}}),
        },
        ToolDefinition {
            name: "devvault.docs.list_installed".to_string(),
            description: "Список установленных документаций".to_string(),
            input_schema: serde_json::json!({"type": "object", "properties": {}}),
        },
        ToolDefinition {
            name: "devvault.docs.tree".to_string(),
            description: "Дерево документации".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "docId": {"type": "number"},
                    "parentPath": {"type": "string"}
                },
                "required": ["docId"]
            }),
        },
        ToolDefinition {
            name: "devvault.docs.entry".to_string(),
            description: "Контент документации по пути".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {"docId": {"type": "number"}, "path": {"type": "string"}},
                "required": ["docId", "path"]
            }),
        },
    ]
}

async fn handle_tool_call(
    db_path: &PathBuf,
    params: ToolCallParams,
) -> Result<Value, String> {
    let storage = Storage::new(db_path.clone()).await.map_err(|e| e.to_string())?;
    let doc_manager = DocumentationManager::new(storage.pool.clone());

    match params.name.as_str() {
        "devvault.search" => {
            let args: SearchQuery = serde_json::from_value(args_or_empty(params.arguments))
                .map_err(|e| e.to_string())?;
            let search_engine = SearchEngine::new(storage.pool.clone());
            let result = search_engine.search(args).await.map_err(|e| e.to_string())?;
            let items: Vec<SearchItemSlim> = result.items.into_iter().map(item_to_search_slim).collect();
            Ok(serde_json::json!({"total": result.total, "items": items}))
        }
        "devvault.items.list" => {
            let args: ListItemsArgs = serde_json::from_value(args_or_empty(params.arguments))
                .map_err(|e| e.to_string())?;
            let items = storage
                .list_items(args.limit, args.offset, args.item_type)
                .await
                .map_err(|e| e.to_string())?;
            let items: Vec<ItemSlim> = items.into_iter().map(item_to_slim).collect();
            Ok(serde_json::to_value(items).map_err(|e| e.to_string())?)
        }
        "devvault.items.get" => {
            let args: GetItemArgs = serde_json::from_value(args_or_empty(params.arguments))
                .map_err(|e| e.to_string())?;
            let item = storage.get_item(args.id).await.map_err(|e| e.to_string())?;
            let result = item.map(item_to_full);
            Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
        }
        "devvault.tags.list" => {
            let tags = storage.list_tags().await.map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(tags).map_err(|e| e.to_string())?)
        }
        "devvault.items.counts" => {
            let counts = storage.list_item_type_counts().await.map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(counts).map_err(|e| e.to_string())?)
        }
        "devvault.docs.list_installed" => {
            let docs = doc_manager
                .list_installed_documentations()
                .await
                .map_err(|e| e.to_string())?;
            let docs: Vec<DocumentationSlim> = docs.into_iter().map(doc_to_slim).collect();
            Ok(serde_json::to_value(docs).map_err(|e| e.to_string())?)
        }
        "devvault.docs.tree" => {
            let args: DocsTreeArgs = serde_json::from_value(args_or_empty(params.arguments))
                .map_err(|e| e.to_string())?;
            let tree: Vec<DocTreeNode> = doc_manager
                .get_doc_tree_level(args.doc_id, args.parent_path)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(tree).map_err(|e| e.to_string())?)
        }
        "devvault.docs.entry" => {
            let args: DocsEntryArgs = serde_json::from_value(args_or_empty(params.arguments))
                .map_err(|e| e.to_string())?;
            let entry: DocEntry = doc_manager
                .get_doc_entry_by_path(args.doc_id, &args.path)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(entry).map_err(|e| e.to_string())?)
        }
        _ => Err("Unknown tool".to_string()),
    }
}

fn parse_db_path() -> Result<PathBuf, String> {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg == "--db-path" {
            if let Some(value) = args.next() {
                return Ok(PathBuf::from(value));
            }
        }
    }
    default_db_path()
}

fn build_initialize_result() -> InitializeResult {
    InitializeResult {
        protocol_version: "2024-11-05".to_string(),
        capabilities: HashMap::from([("tools".to_string(), serde_json::json!({}))]),
        server_info: ServerInfo {
            name: MCP_SERVER_NAME.to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        },
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db_path = parse_db_path().map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

    let mut reader = BufReader::new(tokio::io::stdin());
    let mut stdout = tokio::io::stdout();

    let mut line = String::new();
    loop {
        line.clear();
        let bytes = reader.read_line(&mut line).await?;
        if bytes == 0 {
            break;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let request: RpcRequest = match serde_json::from_str(trimmed) {
            Ok(req) => req,
            Err(err) => {
                eprintln!("Invalid JSON: {err}");
                continue;
            }
        };

        if request.id.is_none() {
            continue;
        }

        let id = ensure_request_id(request.id);
        let response = match request.method.as_str() {
            "initialize" => match serde_json::to_value(build_initialize_result()) {
                Ok(value) => ok_response(id, value),
                Err(err) => error_response(id, err.to_string()),
            },
            "tools/list" => ok_response(id, serde_json::json!({ "tools": tools_list() })),
            "tools/call" => {
                let params = match request.params {
                    Some(value) => serde_json::from_value::<ToolCallParams>(value)
                        .map_err(|e| e.to_string()),
                    None => Err("Missing params".to_string()),
                };

                match params {
                    Ok(params) => match handle_tool_call(&db_path, params).await {
                        Ok(payload) => {
                            let text = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_string());
                            let result = ToolCallResult {
                                content: vec![ToolContent::Text { text }],
                                is_error: false,
                            };
                            match serde_json::to_value(result) {
                                Ok(value) => ok_response(id, value),
                                Err(err) => error_response(id, err.to_string()),
                            }
                        }
                        Err(err) => tool_error_response(id, err),
                    },
                    Err(err) => tool_error_response(id, err),
                }
            }
            _ => error_response(id, "Method not supported"),
        };

        let payload = serde_json::to_string(&response)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
        stdout.write_all(payload.as_bytes()).await?;
        stdout.write_all(b"\n").await?;
        stdout.flush().await?;
    }

    Ok(())
}
