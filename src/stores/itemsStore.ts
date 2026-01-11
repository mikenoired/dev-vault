import { create } from "zustand";
import { tauriService } from "@/services/tauri";
import type { ItemType, ItemWithTags, Tag } from "@/types";

interface ItemsState {
  items: ItemWithTags[];
  tags: Tag[];
  selectedItem: ItemWithTags | null;
  searchQuery: string;
  selectedType: ItemType | null;
  isLoading: boolean;
  isEditing: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  loadTags: () => Promise<void>;
  searchItems: (query: string) => Promise<void>;
  filterByType: (type: ItemType | null) => Promise<void>;
  selectItem: (item: ItemWithTags | null) => void;
  setEditing: (isEditing: boolean) => void;
  deleteItem: (id: number) => Promise<void>;
  updateItem: (
    id: number,
    data: {
      title?: string;
      description?: string;
      content?: string;
      tagNames?: string[];
    },
  ) => Promise<void>;
  refreshItems: () => Promise<void>;
  getItemCountByType: (type: ItemType) => number;
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
  selectedType: null,
  isLoading: false,
  isEditing: false,
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
    set({ isLoading: true, error: null, searchQuery: query, selectedType: null });
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

  filterByType: async (type: ItemType | null) => {
    set({ isLoading: true, error: null, selectedType: type, searchQuery: "" });
    try {
      const allItems = await tauriService.listItems(500, 0);
      const filtered = type ? allItems.filter((item) => item.type === type) : allItems;
      set({ items: filtered, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  getItemCountByType: (type: ItemType) => {
    return get().items.filter((item) => item.type === type).length;
  },

  selectItem: (item) => {
    set({ selectedItem: item, isEditing: false });
  },

  setEditing: (isEditing) => {
    set({ isEditing });
  },

  deleteItem: async (id: number) => {
    try {
      await tauriService.deleteItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
        isEditing: false,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateItem: async (id, data) => {
    try {
      let tagIds: number[] | undefined;

      if (data.tagNames) {
        tagIds = [];
        for (const tagName of data.tagNames) {
          const tagId = await tauriService.getOrCreateTag(tagName);
          tagIds.push(tagId);
        }
      }

      await tauriService.updateItem({
        id,
        title: data.title,
        description: data.description,
        content: data.content,
        tagIds,
      });

      await get().refreshItems();

      const { items } = get();
      const updated = items.find((i) => i.id === id);
      if (updated) {
        set({ selectedItem: updated, isEditing: false });
      }
    } catch (error) {
      set({ error: String(error) });
      throw error;
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
