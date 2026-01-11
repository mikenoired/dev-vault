import { invoke } from "@tauri-apps/api/core";
import type {
  AvailableDocumentation,
  CreateItemDto,
  DocEntry,
  DocTreeNode,
  Documentation,
  ItemWithTags,
  SearchQuery,
  SearchResult,
  Tag,
  UpdateItemDto,
} from "@/types";

export const tauriService = {
  async createItem(dto: CreateItemDto): Promise<number> {
    return invoke<number>("create_item", { dto });
  },

  async getItem(id: number): Promise<ItemWithTags | null> {
    return invoke<ItemWithTags | null>("get_item", { id });
  },

  async updateItem(dto: UpdateItemDto): Promise<boolean> {
    return invoke<boolean>("update_item", { dto });
  },

  async deleteItem(id: number): Promise<boolean> {
    return invoke<boolean>("delete_item", { id });
  },

  async listItems(limit?: number, offset?: number): Promise<ItemWithTags[]> {
    return invoke<ItemWithTags[]>("list_items", { limit, offset });
  },

  async createTag(name: string): Promise<number> {
    return invoke<number>("create_tag", { name });
  },

  async getOrCreateTag(name: string): Promise<number> {
    return invoke<number>("get_or_create_tag", { name });
  },

  async listTags(): Promise<Tag[]> {
    return invoke<Tag[]>("list_tags");
  },

  async search(query: SearchQuery): Promise<SearchResult> {
    return await invoke<SearchResult>("search", { query });
  },

  async listAvailableDocs(): Promise<AvailableDocumentation[]> {
    return invoke<AvailableDocumentation[]>("list_available_docs");
  },

  async listInstalledDocs(): Promise<Documentation[]> {
    return invoke<Documentation[]>("list_installed_docs");
  },

  async installDocumentation(name: string): Promise<Documentation> {
    return invoke<Documentation>("install_documentation", { name });
  },

  async updateDocumentation(docId: number): Promise<Documentation> {
    return invoke<Documentation>("update_documentation", { docId });
  },

  async deleteDocumentation(docId: number): Promise<void> {
    return invoke<void>("delete_documentation", { docId });
  },

  async getDocEntries(docId: number, parentPath?: string): Promise<DocEntry[]> {
    return invoke<DocEntry[]>("get_doc_entries", { docId, parentPath });
  },

  async getDocEntryByPath(docId: number, path: string): Promise<DocEntry> {
    return invoke<DocEntry>("get_doc_entry_by_path", { docId, path });
  },

  async getDocTree(docId: number, parentPath?: string): Promise<DocTreeNode[]> {
    return invoke<DocTreeNode[]>("get_doc_tree", { docId, parentPath });
  },
};
