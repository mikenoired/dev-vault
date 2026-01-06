export type ItemType = "snippet" | "doc" | "config" | "note" | "link";

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

export interface ItemWithTags extends Item {
  tags: Tag[];
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
