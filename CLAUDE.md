# CLAUDE.md – Инструкция для ИИ-разработки Dev Vault

## Описание проекта

Dev Vault – локальное desktop-приложение для хранения и быстрого поиска технической информации разработчиков: сниппетов кода, документации, конфигов, заметок и ссылок. Ключевая особенность – гибридный поиск, сочетающий классический full-text search и семантический поиск на базе AI embeddings.

**Философия проекта:** Поиск + Структура + Автоматизация + Скорость

## Технологический стек

### Frontend
- **React 19+** с TypeScript (строгий режим, без `any`)
- **Tailwind CSS** для стилизации (конфигурация с тёмной темой по умолчанию)
- **State management:** Zustand или Jotai (легковесные, избегаем Redux)
- **Виртуализация:** react-window для длинных списков
- **Редактор кода:** Monaco Editor или CodeMirror для редактирования сниппетов

### Backend
- **Tauri 2.x** (Rust + IPC для взаимодействия с фронтендом)
- **SQLite** с FTS5 для full-text search
- **Локальная embedding модель** (all-MiniLM-L6-v2 через ort-rust или candle)
- **Парсинг:** scraper для HTML, pulldown-cmark для Markdown
- **Миграции:** sqlx или diesel-migrations

### Инструменты разработки
- **Сборка:** Vite для фронтенда, Cargo для Rust
- **Тестирование:** vitest (frontend), cargo test (backend)
- **Линтинг:** ESLint + Prettier (frontend), clippy + rustfmt (backend)

## Архитектура

### Структура проекта

```
dev-vault/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/   # Tauri IPC команды
│   │   ├── domain/     # Бизнес-логика
│   │   │   ├── search_engine.rs
│   │   │   ├── storage.rs
│   │   │   ├── parsers/
│   │   │   ├── indexing.rs
│   │   │   └── ai_integration.rs
│   │   └── models/     # Структуры данных
│   └── Cargo.toml
├── src/                # React frontend
│   ├── components/
│   │   ├── ui/         # Базовые UI компоненты
│   │   ├── composite/  # Сложные компоненты
│   │   └── layouts/
│   ├── hooks/          # Кастомные хуки
│   ├── stores/         # Zustand/Jotai stores
│   ├── services/       # API wrapper для Tauri commands
│   └── types/          # TypeScript типы
└── package.json
```

### Слоистая архитектура

**1. Presentation Layer (React)**

- Компоненты разделены на UI primitives, композитные компоненты, контейнеры
- Кастомные хуки инкапсулируют логику взаимодействия с Tauri
- Типизация через TypeScript interfaces, синхронизированные с Rust моделями

**2. Application Layer (Tauri Commands)**

- Команды группируются по доменам: `snippets::`, `docs::`, `search::`, `config::`
- Валидация входных данных на границе слоя
- Маппинг между DTO и доменными моделями

**3. Domain Layer (Rust Core)** Модули с чёткими границами:

- `search_engine` – гибридный поиск (FTS + semantic)
- `storage` – абстракция над SQLite
- `parsers` – модульные парсеры контента
- `indexing` – построение индексов
- `ai_integration` – работа с embedding моделями

**4. Data Layer (SQLite)**

- Нормализованная схема с индексами
- FTS5 для полнотекстового поиска
- Хранение векторов в отдельной таблице

## Схема базы данных

```sql
-- Базовая таблица для всех типов контента
CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL, -- 'snippet' | 'doc' | 'config' | 'note' | 'link'
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata JSON -- тип-специфичные поля
);

-- Теги (many-to-many)
CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE item_tags (
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

-- Векторные эмбеддинги
CREATE TABLE embeddings (
    item_id INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    vector BLOB NOT NULL -- сериализованный вектор
);

-- Full-text search индекс
CREATE VIRTUAL TABLE search_index USING fts5(
    title, content, tags,
    content='items',
    content_rowid='id'
);
```

## Поисковая система

### Гибридный поиск

**Классический FTS (SQLite FTS5):**

- Используется для мгновенного поиска по точным совпадениям
- BM25 ranking для сортировки результатов
- Поддержка операторов: AND, OR, NOT, фразовый поиск ("exact phrase")

**Семантический поиск (AI):**

- Локальная embedding модель для offline работы
- Векторное представление генерируется при создании/обновлении записи
- Поиск через косинусное сходство

**Комбинированный ранкинг:**

```rust
final_score = (fts_score * fts_weight) + (semantic_score * semantic_weight)
```

- Веса настраиваются в конфиге (по умолчанию 0.6 / 0.4)
- Re-ranking топ-N результатов для финальной выдачи

### Индексирование

- Асинхронная индексация в background thread
- Инкрементальное обновление при изменениях
- Batch processing с debounce для множественных операций
- Progress events отправляются на фронтенд

## Парсинг и импорт

### Модульная система парсеров

Trait `Parser`:

```rust
trait Parser {
    fn parse(&self, source: &str) -> Result<ParsedContent>;
    fn supports(&self, format: &str) -> bool;
}
```

**Имплементации:**

- `MarkdownParser` – парсинг .md с извлечением code blocks
- `HtmlParser` – извлечение контента из веб-страниц (readability algorithm)
- `CodeParser` – метаданные из кода (язык, комментарии, docstrings)
- `ConfigParser` – JSON, YAML, TOML

### Web scraping

- HTTP запросы через `reqwest`
- Извлечение main content (удаление nav, footer, ads)
- Сохранение метаданных: title, author, date, source URL

## UI/UX принципы

### Информационная плотность

- Минималистичный интерфейс для максимального контента на экране
- Split-view: список результатов слева, превью справа
- Компактные paddings, тонкие borders
- Типографика: monospace для кода, читабельный sans-serif для текста

### Быстрый доступ

- **Command Palette** (Cmd/Ctrl+K) – доступ ко всем действиям
- **Глобальный hotkey** – вызов окна из любого приложения
- **Instant search** – результаты появляются по мере ввода (debounce 150ms)
- **Keyboard-first** – полная навигация с клавиатуры

### Контекстные действия

- Inline редактирование без модальных окон
- Copy snippet одной кнопкой
- Drag & drop для импорта файлов
- Breadcrumbs для навигации

### Цветовая схема

- Тёмная тема по умолчанию (снижение нагрузки на глаза)
- Светлая тема опционально
- Syntax highlighting для кода (используем тему VS Code Dark+)

## Конфигурация

### Файл конфигурации

Расположение: `~/.devvault/config.toml`

```toml
[search]
fts_weight = 0.6
semantic_weight = 0.4
results_limit = 50

[ui]
theme = "dark"
editor_font_size = 14
compact_mode = false

[paths]
data_dir = "~/.devvault/data"
attachments_dir = "~/.devvault/attachments"

[shortcuts]
global_show = "Cmd+Shift+D"
command_palette = "Cmd+K"
quick_search = "Cmd+P"
```

Горячая перезагрузка настроек без перезапуска приложения.

## Требования к производительности

### Целевые метрики

- **Поиск:** < 50ms для FTS, < 200ms для семантического
- **Startup time:** < 1s до появления UI
- **Индексация:** фоновая, не блокирует интерфейс
- **Memory:** < 150MB RAM в idle, < 300MB под нагрузкой

### Оптимизации

- SQLite в WAL mode для параллельных чтений
- Connection pooling
- Prepared statements для частых запросов
- Lazy loading контента (тело записи загружается при открытии)
- LRU cache для часто используемых запросов
- Виртуализация списков на фронтенде

## Стандарты кодирования

### TypeScript/React

- Строгий TypeScript (без `any`, всегда явные типы)
- Функциональные компоненты с хуками
- Custom hooks для переиспользования логики
- Props деструктуризация с типами
- Именование: PascalCase для компонентов, camelCase для функций

### Rust

- Idiomatic Rust: используем Result, Option, избегаем unwrap
- Модульность: каждый модуль в отдельном файле
- Error handling: кастомные ошибки через thiserror
- Именование: snake_case для функций, PascalCase для типов
- Документация: doc comments для публичных API

### Git workflow

- Коммиты на русском или английском (консистентно)
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Ветки: `feature/название`, `bugfix/название`

## Тестирование

### Frontend

- Unit тесты для утилит и хуков (vitest)
- Integration тесты для сложных компонентов
- E2E тесты критических сценариев (playwright)

### Backend

- Unit тесты для парсеров и поисковой логики
- Integration тесты для SQLite операций
- Benchmark тесты для производительности поиска

## Приоритеты разработки

### MVP (v0.1)

1. Базовая CRUD функциональность для сниппетов и заметок
2. FTS поиск (без AI)
3. Тёмная тема UI с поиском
4. Tagging система

### v0.2

1. Семантический поиск с локальной моделью
2. Markdown и HTML парсеры
3. Импорт из файлов

### v0.3

1. Конфиги и документация как типы контента
2. Web scraping для импорта доков
3. Command palette

### Будущие фичи

- Плагинная система
- Синхронизация между устройствами (optional, через git)
- OCR для скриншотов кода
- Интеграция с IDE

## Важные замечания для ИИ-разработки

1. **Модульность превыше всего:** Избегай монолитов. Каждая функциональность должна быть изолирована в отдельный модуль с чётким API.
2. **Типобезопасность:** Синхронизируй TypeScript интерфейсы с Rust структурами. Используй code generation (ts-rs) для автоматической генерации типов.
3. **Производительность критична:** Всегда профилируй поиск и индексацию. SQLite запросы должны использовать индексы    
4. **Offline-first:** Приложение должно работать без интернета. Все зависимости (включая AI модель) – локальные.
5. **UX минимализм:** Меньше UI chrome, больше контента. Вдохновляйся Obsidian, Raycast, Linear.
6. **Keyboard-first:** Каждое действие должно быть доступно с клавиатуры. Shortcuts документируются в UI.
7. **Graceful degradation:** Если AI модель не загружена, приложение работает только с FTS.
8. **Error handling:** Все ошибки логируются и показываются пользователю понятно (на русском в UI).
9. Не используй множество комментариев. Код должен быть понятным и без этого