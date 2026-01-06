import { create } from "zustand";
import { tauriService } from "../services/tauri";
import type { ItemType, ItemWithTags, Tag } from "../types";

interface ItemsState {
  items: ItemWithTags[];
  tags: Tag[];
  selectedItem: ItemWithTags | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  loadTags: () => Promise<void>;
  searchItems: (query: string) => Promise<void>;
  selectItem: (item: ItemWithTags | null) => void;
  deleteItem: (id: number) => Promise<void>;
  refreshItems: () => Promise<void>;
  createItem: (data: {
    type: ItemType;
    title: string;
    description?: string;
    content: string;
    tagNames: string[];
  }) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  tags: [],
  selectedItem: null,
  searchQuery: "",
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await tauriService.listItems(100, 0);
      set({ items, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadTags: async () => {
    try {
      const tags = await tauriService.listTags();
      set({ tags });
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  },

  searchItems: async (query: string) => {
    set({ isLoading: true, error: null, searchQuery: query });
    try {
      if (!query.trim()) {
        await get().loadItems();
        return;
      }

      const result = await tauriService.search({ query, limit: 100 });
      set({ items: result.items, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  selectItem: (item) => {
    set({ selectedItem: item });
  },

  deleteItem: async (id: number) => {
    try {
      await tauriService.deleteItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  refreshItems: async () => {
    const { searchQuery } = get();
    if (searchQuery) {
      await get().searchItems(searchQuery);
    } else {
      await get().loadItems();
    }
  },

  createItem: async (data) => {
    try {
      const tagIds: number[] = [];

      for (const tagName of data.tagNames) {
        const tagId = await tauriService.getOrCreateTag(tagName);
        tagIds.push(tagId);
      }

      await tauriService.createItem({
        type: data.type,
        title: data.title,
        description: data.description,
        content: data.content,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });

      await get().refreshItems();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },
}));
