-- Migration 002: Documentation System
-- Создание таблиц для работы с документацией

-- Документации (метаданные)
CREATE TABLE IF NOT EXISTS documentations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    version TEXT NOT NULL,
    source_url TEXT NOT NULL,
    installed_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}' -- JSON
);

CREATE INDEX IF NOT EXISTS idx_docs_name ON documentations(name);
CREATE INDEX IF NOT EXISTS idx_docs_updated ON documentations(updated_at DESC);

-- Записи документации (иерархические)
CREATE TABLE IF NOT EXISTS doc_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    path TEXT NOT NULL, -- Например: "api/fetch", "api/fetch/options"
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_type TEXT, -- "class", "method", "guide", "module", etc.
    parent_path TEXT, -- Для построения иерархии
    created_at INTEGER NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES documentations(id) ON DELETE CASCADE,
    UNIQUE(doc_id, path)
);

CREATE INDEX IF NOT EXISTS idx_entries_doc ON doc_entries(doc_id);
CREATE INDEX IF NOT EXISTS idx_entries_path ON doc_entries(path);
CREATE INDEX IF NOT EXISTS idx_entries_parent ON doc_entries(parent_path);
CREATE INDEX IF NOT EXISTS idx_entries_type ON doc_entries(entry_type);

-- Расширение FTS индекса для документации
-- Добавляем записи документации в поиск
DROP TRIGGER IF EXISTS doc_entries_ai;
CREATE TRIGGER doc_entries_ai AFTER INSERT ON doc_entries BEGIN
    INSERT INTO search_index(rowid, title, content, tags)
    VALUES (
        -new.id, -- Отрицательный ID для различения от items
        new.title,
        new.content,
        COALESCE((SELECT display_name FROM documentations WHERE id = new.doc_id), '')
    );
END;

DROP TRIGGER IF EXISTS doc_entries_ad;
CREATE TRIGGER doc_entries_ad AFTER DELETE ON doc_entries BEGIN
    DELETE FROM search_index WHERE rowid = -old.id;
END;

DROP TRIGGER IF EXISTS doc_entries_au;
CREATE TRIGGER doc_entries_au AFTER UPDATE ON doc_entries BEGIN
    UPDATE search_index 
    SET title = new.title, 
        content = new.content,
        tags = COALESCE((SELECT display_name FROM documentations WHERE id = new.doc_id), '')
    WHERE rowid = -new.id;
END;

