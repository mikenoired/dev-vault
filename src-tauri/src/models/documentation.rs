use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Documentation {
    pub id: i64,
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub version: String,
    #[serde(rename = "sourceUrl")]
    pub source_url: String,
    #[serde(rename = "installedAt")]
    pub installed_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocEntry {
    pub id: i64,
    #[serde(rename = "docId")]
    pub doc_id: i64,
    pub path: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "entryType")]
    pub entry_type: Option<String>,
    #[serde(rename = "parentPath")]
    pub parent_path: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailableDocumentation {
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub version: String,
    pub description: String,
    #[serde(rename = "sourceUrl")]
    pub source_url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InstallDocumentationDto {
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocTreeNode {
    pub path: String,
    pub title: String,
    #[serde(rename = "entryType")]
    pub entry_type: Option<String>,
    pub children: Vec<DocTreeNode>,
    #[serde(rename = "hasContent")]
    pub has_content: bool,
    #[serde(rename = "hasChildren")]
    pub has_children: bool,
}

#[derive(Debug, Clone)]
pub struct ParsedDocEntry {
    pub path: String,
    pub title: String,
    pub content: String,
    pub entry_type: Option<String>,
    pub parent_path: Option<String>,
}

