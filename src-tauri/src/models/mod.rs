use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ItemType {
    Snippet,
    Doc,
    Config,
    Note,
    Link,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: i64,
    #[serde(rename = "type")]
    pub item_type: ItemType,
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemWithTags {
    #[serde(flatten)]
    pub item: Item,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateItemDto {
    #[serde(rename = "type")]
    pub item_type: ItemType,
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    pub metadata: Option<serde_json::Value>,
    #[serde(rename = "tagIds")]
    pub tag_ids: Option<Vec<i64>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateItemDto {
    pub id: i64,
    pub title: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<serde_json::Value>,
    #[serde(rename = "tagIds")]
    pub tag_ids: Option<Vec<i64>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    #[serde(rename = "type")]
    pub item_type: Option<ItemType>,
    #[serde(rename = "tagIds")]
    pub tag_ids: Option<Vec<i64>>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub items: Vec<ItemWithTags>,
    pub total: i64,
}
