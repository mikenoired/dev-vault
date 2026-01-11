-- Migration 003: Fix documentation triggers
-- Исправление триггеров для корректного удаления документации

-- Пересоздаём триггеры для doc_entries с правильным синтаксисом
DROP TRIGGER IF EXISTS doc_entries_ai;
CREATE TRIGGER doc_entries_ai AFTER INSERT ON doc_entries BEGIN
    INSERT INTO search_index(rowid, title, content, tags)
    VALUES (
        -new.id,
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
