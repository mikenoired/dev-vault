import { invoke } from "@tauri-apps/api/core";
import type {
  CreateItemDto,
  ItemWithTags,
  SearchQuery,
  SearchResult,
  Tag,
  UpdateItemDto,
} from "../types";

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
};
