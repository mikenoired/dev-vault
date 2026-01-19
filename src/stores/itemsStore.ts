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
  isLoadingMore: boolean;
  offset: number;
  hasMore: boolean;
  typeCounts: Record<ItemType, number>;
  isEditing: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadTypeCounts: () => Promise<void>;
  searchItems: (query: string) => Promise<void>;
  filterByType: (type: ItemType | null) => Promise<void>;
  setSelectedType: (type: ItemType | null) => void;
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
  createItem: (data: {
    type: ItemType;
    title: string;
    description?: string;
    content: string;
    tagNames: string[];
  }) => Promise<void>;
}

const PAGE_SIZE = 50;
const emptyTypeCounts: Record<ItemType, number> = {
  snippet: 0,
  config: 0,
  note: 0,
  link: 0,
  documentation: 0,
};

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  tags: [],
  selectedItem: null,
  searchQuery: "",
  selectedType: null,
  isLoading: false,
  isLoadingMore: false,
  offset: 0,
  hasMore: true,
  typeCounts: { ...emptyTypeCounts },
  isEditing: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null, items: [], offset: 0, hasMore: true });
    const { selectedType } = get();
    const searchQuery = get().searchQuery.trim();
    try {
      const limit = PAGE_SIZE + 1;
      const result = searchQuery
        ? await tauriService.search({ query: searchQuery, limit, offset: 0 })
        : await tauriService.listItems(limit, 0, selectedType ?? undefined);

      const fetchedItems = Array.isArray(result) ? result : result.items;
      const hasMore = fetchedItems.length > PAGE_SIZE;
      const items = hasMore ? fetchedItems.slice(0, PAGE_SIZE) : fetchedItems;

      set({ items, hasMore, offset: items.length, isLoading: false });
      get().loadTypeCounts();
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadNextPage: async () => {
    const { isLoadingMore, isLoading, hasMore, offset, selectedType, items } = get();
    const searchQuery = get().searchQuery.trim();
    if (isLoadingMore || isLoading || !hasMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const limit = PAGE_SIZE + 1;
      const result = searchQuery
        ? await tauriService.search({ query: searchQuery, limit, offset })
        : await tauriService.listItems(limit, offset, selectedType ?? undefined);

      const fetchedItems = Array.isArray(result) ? result : result.items;
      const nextHasMore = fetchedItems.length > PAGE_SIZE;
      const nextItems = nextHasMore ? fetchedItems.slice(0, PAGE_SIZE) : fetchedItems;

      set({
        items: [...items, ...nextItems],
        hasMore: nextHasMore,
        offset: offset + nextItems.length,
        isLoadingMore: false,
      });
    } catch (error) {
      set({ error: String(error), isLoadingMore: false });
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

  loadTypeCounts: async () => {
    try {
      const counts = await tauriService.listItemTypeCounts();
      const nextCounts = { ...emptyTypeCounts };
      for (const entry of counts) {
        nextCounts[entry.type] = entry.count;
      }
      set({ typeCounts: nextCounts });
    } catch (error) {
      console.error("Failed to load item type counts:", error);
    }
  },

  searchItems: async (query: string) => {
    const trimmed = query.trim();
    set({ searchQuery: query, selectedType: null });
    if (!trimmed) {
      await get().loadItems();
      return;
    }

    await get().loadItems();
  },

  filterByType: async (type: ItemType | null) => {
    set({ selectedType: type, searchQuery: "" });
    await get().loadItems();
  },

  setSelectedType: (type: ItemType | null) => {
    set({ selectedType: type });
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
    await get().loadItems();
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
