-- Migration 004: Fix FTS index for documentation
-- Проблема: search_index привязан к items, не может работать с doc_entries
-- А также: при удалении таблицы FTS5 удаляются и все связанные триггеры

-- 1. Удаляем старый индекс (и все связанные триггеры удалятся автоматически)
DROP TABLE IF EXISTS search_index;

-- 2. Создаём FTS индекс БЕЗ привязки к конкретной таблице
CREATE VIRTUAL TABLE search_index USING fts5(
    title,
    content,
    tags,
    tokenize='porter unicode61'
);

-- 3. Пересоздаём триггеры для items
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

-- 4. Пересоздаём триггеры для doc_entries (они удалились при DROP TABLE search_index)
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

-- 5. Заполняем индекс существующими данными
INSERT INTO search_index(rowid, title, content, tags)
SELECT id, title, content, '' FROM items;

INSERT INTO search_index(rowid, title, content, tags)
SELECT -de.id, de.title, de.content, d.display_name
FROM doc_entries de
JOIN documentations d ON de.doc_id = d.id;
