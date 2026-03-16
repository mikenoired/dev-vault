import { create } from "zustand";
import { tauriService } from "@/services/tauri";
import type { ItemsViewMode, ItemType, ItemWithTags, Tag } from "@/types";

interface ItemsState {
  items: ItemWithTags[];
  tags: Tag[];
  selectedItem: ItemWithTags | null;
  searchQuery: string;
  selectedType: ItemType | null;
  viewMode: ItemsViewMode;
  selectedTagIds: number[];
  isLoading: boolean;
  isLoadingMore: boolean;
  offset: number;
  hasMore: boolean;
  typeCounts: Record<ItemType, number>;
  error: string | null;

  loadItems: (options?: { keepItems?: boolean }) => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadTypeCounts: () => Promise<void>;
  searchItems: (query: string) => Promise<void>;
  filterByType: (type: ItemType | null) => Promise<void>;
  setSelectedType: (type: ItemType | null) => void;
  setViewMode: (mode: ItemsViewMode) => Promise<void>;
  addStructureTag: (tagId: number) => Promise<void>;
  removeStructureTag: (tagId: number) => Promise<void>;
  clearStructureTags: () => Promise<void>;
  selectItem: (item: ItemWithTags | null) => void;
  deleteItem: (id: number) => Promise<void>;
  updateItem: (
    id: number,
    data: {
      type?: ItemType;
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
  }) => Promise<ItemWithTags>;
}

const PAGE_SIZE = 50;
const emptyTypeCounts: Record<ItemType, number> = {
  snippet: 0,
  config: 0,
  note: 0,
  link: 0,
  documentation: 0,
};

const getActiveTagIds = (
  state: Pick<ItemsState, "viewMode" | "selectedTagIds" | "selectedType" | "searchQuery">,
): number[] | undefined => {
  const hasSelectedTags = state.selectedTagIds.length > 0;
  const isSearchMode = state.searchQuery.trim().length > 0;
  const supportsTagFiltering = isSearchMode || state.selectedType !== "documentation";

  if (state.viewMode !== "structure" || !hasSelectedTags || !supportsTagFiltering) {
    return undefined;
  }

  return state.selectedTagIds;
};

const fetchItemsPage = async (
  state: Pick<ItemsState, "searchQuery" | "selectedType" | "viewMode" | "selectedTagIds">,
  offset: number,
) => {
  const limit = PAGE_SIZE + 1;
  const trimmedQuery = state.searchQuery.trim();
  const tagIds = getActiveTagIds(state);

  if (trimmedQuery) {
    return tauriService.search({
      query: trimmedQuery,
      limit,
      offset,
      tagIds,
    });
  }

  return tauriService.listItems(limit, offset, state.selectedType ?? undefined, tagIds);
};

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  tags: [],
  selectedItem: null,
  searchQuery: "",
  selectedType: null,
  viewMode: "list",
  selectedTagIds: [],
  isLoading: false,
  isLoadingMore: false,
  offset: 0,
  hasMore: true,
  typeCounts: { ...emptyTypeCounts },
  error: null,

  loadItems: async (options) => {
    const keepItems = options?.keepItems ?? false;
    set({
      isLoading: true,
      error: null,
      ...(keepItems ? {} : { items: [] }),
      offset: 0,
      hasMore: true,
    });

    try {
      const state = get();
      const result = await fetchItemsPage(state, 0);
      const fetchedItems = Array.isArray(result) ? result : result.items;
      const hasMore = fetchedItems.length > PAGE_SIZE;
      const items = hasMore ? fetchedItems.slice(0, PAGE_SIZE) : fetchedItems;

      set({ items, hasMore, offset: items.length, isLoading: false });
      void get().loadTypeCounts();
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadNextPage: async () => {
    const { isLoadingMore, isLoading, hasMore, offset, items } = get();
    if (isLoadingMore || isLoading || !hasMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const result = await fetchItemsPage(get(), offset);
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
    set({ searchQuery: query, selectedType: null });
    await get().loadItems();
  },

  filterByType: async (type: ItemType | null) => {
    const { selectedType, searchQuery } = get();
    if (type === selectedType && searchQuery.trim().length === 0) {
      return;
    }

    set({ selectedType: type });
    await get().loadItems({ keepItems: true });
  },

  setSelectedType: (type: ItemType | null) => {
    set({ selectedType: type });
  },

  setViewMode: async (mode: ItemsViewMode) => {
    if (get().viewMode === mode) {
      return;
    }

    set({ viewMode: mode });
    await get().loadItems({ keepItems: true });
  },

  addStructureTag: async (tagId: number) => {
    const { selectedTagIds } = get();
    if (selectedTagIds.includes(tagId)) {
      return;
    }

    set({ selectedTagIds: [...selectedTagIds, tagId] });
    await get().loadItems({ keepItems: true });
  },

  removeStructureTag: async (tagId: number) => {
    const nextTagIds = get().selectedTagIds.filter((id) => id !== tagId);
    set({ selectedTagIds: nextTagIds });
    await get().loadItems({ keepItems: true });
  },

  clearStructureTags: async () => {
    if (get().selectedTagIds.length === 0) {
      return;
    }

    set({ selectedTagIds: [] });
    await get().loadItems({ keepItems: true });
  },

  selectItem: (item) => {
    set({ selectedItem: item });
  },

  deleteItem: async (id: number) => {
    try {
      await tauriService.deleteItem(id);
      set((state) => ({
        selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
      }));
      await Promise.all([get().loadItems({ keepItems: true }), get().loadTags()]);
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
        type: data.type,
        title: data.title,
        description: data.description,
        content: data.content,
        tagIds,
      });

      const updated = await tauriService.getItem(id);
      if (updated) {
        set({ selectedItem: updated });
      }

      await Promise.all([get().loadItems({ keepItems: true }), get().loadTags()]);
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

      const itemId = await tauriService.createItem({
        type: data.type,
        title: data.title,
        description: data.description,
        content: data.content,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });

      const created = await tauriService.getItem(itemId);
      if (!created) {
        throw new Error("Failed to load created item.");
      }

      set({ selectedItem: created });
      await Promise.all([get().loadItems({ keepItems: true }), get().loadTags()]);

      return created;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },
}));
