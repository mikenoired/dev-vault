export type ItemType = "snippet" | "config" | "note" | "link" | "documentation";
export type Theme = "dark" | "light" | "system";
export type DocName = "python" | "rust" | "react" | "typescript" | "nodejs" | "mdn";

export interface Item {
  id: number;
  type: ItemType;
  title: string;
  description: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown> | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Documentation {
  id: number;
  name: string;
  displayName: string;
  version: string;
  sourceUrl: string;
  installedAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface DocEntry {
  id: number;
  docId: number;
  path: string;
  title: string;
  content: string;
  entryType?: string;
  parentPath?: string;
  createdAt: number;
}

export interface AvailableDocumentation {
  name: string;
  displayName: string;
  version: string;
  description: string;
  sourceUrl: string;
}

export interface DocTreeNode {
  path: string;
  title: string;
  entryType?: string;
  children: DocTreeNode[];
  hasContent: boolean;
  hasChildren: boolean;
}

export interface ItemWithTags extends Item {
  tags: Tag[];
  highlights?: string[];
}

export interface CreateItemDto {
  type: ItemType;
  title: string;
  description?: string;
  content: string;
  metadata?: Record<string, unknown>;
  tagIds?: number[];
}

export interface UpdateItemDto {
  id: number;
  title?: string;
  description?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  tagIds?: number[];
}

export interface SearchQuery {
  query: string;
  type?: ItemType;
  tagIds?: number[];
  limit?: number;
}

export interface SearchResult {
  items: ItemWithTags[];
  total: number;
}

export interface SearchConfig {
  fts_weight: number;
  semantic_weight: number;
  results_limit: number;
}

export interface UiConfig {
  theme: Theme;
  editor_font_size: number;
  compact_mode: boolean;
}

export interface AppConfig {
  search: SearchConfig;
  ui: UiConfig;
}

export type ScrapeStatus = "starting" | "scraping" | "processing" | "completed" | "failed";

export interface ScrapeProgress {
  currentPage: number;
  maxPages: number;
  currentPath: string;
  entriesCount: number;
  status: ScrapeStatus;
}
