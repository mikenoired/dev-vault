import { create } from "zustand";
import type { ItemType } from "@/types";

export type TabType = "item" | "new" | "draft" | "documentation" | "docEntry";

export interface Tab {
  id: string;
  type: TabType;
  itemId?: number;
  itemType?: ItemType;
  docId?: number;
  docPath?: string;
  isPinned: boolean;
  title: string;
  isDirty: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  openItemTab: (itemId: number, itemType: ItemType, title: string, pin?: boolean) => void;
  openNewTab: () => void;
  openDraftItemTab: (itemType: ItemType) => void;
  openDocumentationTab: () => void;
  openDocEntryTab: (docId: number, docPath: string, title: string, pin?: boolean) => void;
  closeTab: (tabId: string) => void;
  requestCloseTab: (tabId: string) => void;
  confirmCloseTab: () => void;
  cancelCloseTab: () => void;
  selectTab: (tabId: string) => void;
  pinTab: (tabId: string) => void;
  updateTabTitle: (itemId: number, title: string) => void;
  updateTabTitleById: (tabId: string, title: string) => void;
  promoteDraftTab: (draftTabId: string, itemId: number, itemType: ItemType, title: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  pendingCloseTabId: string | null;
}

const typeLabels: Record<ItemType, string> = {
  snippet: "Сниппет",
  note: "Заметка",
  config: "Конфиг",
  link: "Ссылка",
  documentation: "Документация",
};

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  pendingCloseTabId: null,

  openItemTab: (itemId, itemType, title, pin = false) => {
    const { tabs } = get();

    const existingTabIndex = tabs.findIndex((t) => t.itemId === itemId);
    if (existingTabIndex !== -1) {
      const existingTab = tabs[existingTabIndex];
      set({ activeTabId: existingTab.id });
      if (pin && !existingTab.isPinned) {
        const newTabs = [...tabs];
        newTabs[existingTabIndex] = { ...existingTab, isPinned: true };
        set({ tabs: newTabs });
      }
      return;
    }

    const previewTabIndex = tabs.findIndex((t) => t.type === "item" && !t.isPinned);

    if (previewTabIndex !== -1 && !pin) {
      const newTabs = [...tabs];
      const newTabId = `item-${itemId}`;
      newTabs[previewTabIndex] = {
        id: newTabId,
        type: "item",
        itemId,
        itemType,
        title,
        isPinned: false,
        isDirty: false,
      };
      set({ tabs: newTabs, activeTabId: newTabId });
    } else {
      const newTabId = `item-${itemId}`;
      const newTab: Tab = {
        id: newTabId,
        type: "item",
        itemId,
        itemType,
        title,
        isPinned: pin,
        isDirty: false,
      };
      set({
        tabs: [...tabs, newTab],
        activeTabId: newTabId,
      });
    }
  },

  openNewTab: () => {
    const { tabs } = get();
    const newTabId = `new-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      type: "new",
      isPinned: true,
      title: "Новая вкладка",
      isDirty: false,
    };
    set({
      tabs: [...tabs, newTab],
      activeTabId: newTabId,
    });
  },

  openDraftItemTab: (itemType) => {
    const { tabs } = get();
    const newTabId = `draft-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      type: "draft",
      itemType,
      isPinned: true,
      title: `Новый ${typeLabels[itemType] ?? "элемент"}`,
      isDirty: false,
    };

    set({
      tabs: [...tabs, newTab],
      activeTabId: newTabId,
    });
  },

  openDocumentationTab: () => {
    const { tabs } = get();

    const existingTabIndex = tabs.findIndex((t) => t.type === "documentation");
    if (existingTabIndex !== -1) {
      const existingTab = tabs[existingTabIndex];
      set({ activeTabId: existingTab.id });
      return;
    }

    const newTabId = `documentation-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      type: "documentation",
      isPinned: false,
      title: "Документация",
      isDirty: false,
    };
    set({
      tabs: [...tabs, newTab],
      activeTabId: newTabId,
    });
  },

  openDocEntryTab: (docId, docPath, title, pin = false) => {
    const { tabs } = get();

    // Проверяем, есть ли уже вкладка с этой записью документации
    const existingTabIndex = tabs.findIndex(
      (t) => t.type === "docEntry" && t.docId === docId && t.docPath === docPath,
    );
    if (existingTabIndex !== -1) {
      const existingTab = tabs[existingTabIndex];
      set({ activeTabId: existingTab.id });
      if (pin && !existingTab.isPinned) {
        const newTabs = [...tabs];
        newTabs[existingTabIndex] = { ...existingTab, isPinned: true };
        set({ tabs: newTabs });
      }
      return;
    }

    // Ищем незакрепленную вкладку для замены
    const previewTabIndex = tabs.findIndex((t) => t.type === "docEntry" && !t.isPinned);

    const newTabId = `docEntry-${docId}-${docPath}-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      type: "docEntry",
      docId,
      docPath,
      isPinned: pin,
      title,
      isDirty: false,
    };

    if (previewTabIndex !== -1) {
      const newTabs = [...tabs];
      newTabs[previewTabIndex] = newTab;
      set({ tabs: newTabs, activeTabId: newTabId });
    } else {
      set({
        tabs: [...tabs, newTab],
        activeTabId: newTabId,
      });
    }
  },

  closeTab: (tabId) => {
    const { tabs } = get();
    const { activeTabId } = get();
    const newTabs = tabs.filter((t) => t.id !== tabId);

    let nextActiveId = activeTabId;
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const closedIndex = tabs.findIndex((t) => t.id === tabId);
        const nextIndex = Math.min(closedIndex, newTabs.length - 1);
        nextActiveId = newTabs[nextIndex].id;
      } else {
        nextActiveId = null;
      }
    }

    set({ tabs: newTabs, activeTabId: nextActiveId });
  },

  requestCloseTab: (tabId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.isDirty) {
      set({ pendingCloseTabId: tabId });
      return;
    }
    get().closeTab(tabId);
  },

  confirmCloseTab: () => {
    const { pendingCloseTabId } = get();
    if (pendingCloseTabId) {
      get().closeTab(pendingCloseTabId);
    }
    set({ pendingCloseTabId: null });
  },

  cancelCloseTab: () => {
    set({ pendingCloseTabId: null });
  },

  selectTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  pinTab: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isPinned: true } : t)),
    }));
  },

  updateTabTitle: (itemId, title) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.itemId === itemId ? { ...t, title } : t)),
    }));
  },

  updateTabTitleById: (tabId, title) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
    }));
  },

  promoteDraftTab: (draftTabId, itemId, itemType, title) => {
    const { tabs } = get();
    const draftIndex = tabs.findIndex((t) => t.id === draftTabId);
    if (draftIndex === -1) return;

    const nextTabId = `item-${itemId}`;
    const draftTab = tabs[draftIndex];
    const nextTab: Tab = {
      id: nextTabId,
      type: "item",
      itemId,
      itemType,
      title,
      isPinned: draftTab.isPinned,
      isDirty: false,
    };

    const nextTabs = [...tabs];
    nextTabs[draftIndex] = nextTab;
    set({ tabs: nextTabs, activeTabId: nextTabId });
  },

  setTabDirty: (tabId, isDirty) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    }));
  },
}));
