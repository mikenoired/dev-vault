-- Initial schema for Dev Vault
-- Created: 2026-01-06

-- Items table: хранение всех типов контента
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('snippet', 'config', 'note', 'link')),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}' -- JSON
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Item-Tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    title,
    content,
    tags,
    content='items',
    content_rowid='id',
    tokenize='porter unicode61'
);

-- Triggers to keep FTS5 index in sync
DROP TRIGGER IF EXISTS items_ai;
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
    INSERT INTO search_index(rowid, title, content, tags)
    VALUES (new.id, new.title, new.content, '');
END;

DROP TRIGGER IF EXISTS items_ad;
CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
    DELETE FROM search_index WHERE rowid = old.id;
END;

DROP TRIGGER IF EXISTS items_au;
CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
    UPDATE search_index 
    SET title = new.title, content = new.content
    WHERE rowid = new.id;
END;

-- Embeddings table (для будущей интеграции AI)
CREATE TABLE IF NOT EXISTS embeddings (
    item_id INTEGER PRIMARY KEY,
    vector BLOB NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
