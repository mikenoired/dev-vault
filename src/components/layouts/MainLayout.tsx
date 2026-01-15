import { listen } from "@tauri-apps/api/event";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreateItemModal } from "@/components/composite/CreateItemModal";
import { DocBrowser } from "@/components/composite/Documentation/DocBrowser";
import { DocEntryViewer } from "@/components/composite/Documentation/DocEntryViewer";
import { ItemDetail } from "@/components/composite/ItemDetail";
import { ItemsList } from "@/components/composite/Items";
import { SearchBar } from "@/components/composite/SearchBar";
import { SettingsModal } from "@/components/composite/Settings/SettingsModal";
import { EmptyTabContent } from "@/components/composite/Tabs/EmptyTabContent";
import { TabManager } from "@/components/composite/Tabs/TabManager";
import { TypeFilter } from "@/components/composite/TypeFilter";
import { cn } from "@/components/ui";
import { useHotkey } from "@/hooks/useHotkey";
import { useDocsStore } from "@/stores/docsStore";
import { useItemsStore } from "@/stores/itemsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabsStore } from "@/stores/tabsStore";
import { useUIStore } from "@/stores/uiStore";
import type { ItemType } from "@/types";

export const MainLayout = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ItemType>("snippet");
  const [isResizingState, setIsResizingState] = useState(false);
  const isResizing = useRef(false);

  const searchQuery = useItemsStore((state) => state.searchQuery);
  const filterByType = useItemsStore((state) => state.filterByType);
  const setSelectedType = useItemsStore((state) => state.setSelectedType);

  const { tabs, activeTabId, closeTab, openNewTab } = useTabsStore((state) => state);
  const { sidebarWidth, isSidebarVisible, toggleSidebar, setSidebarWidth } = useUIStore(
    (state) => state,
  );
  const { installedDocs, selectDoc } = useDocsStore();

  const openSettings = useSettingsStore((state) => state.openSettings);
  const theme = useSettingsStore((state) => state.config?.ui.theme);

  useEffect(() => {
    if (!theme) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const closeCurrentTab = useCallback(() => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  }, [activeTabId, closeTab]);

  useHotkey({ key: "w", mod: true }, closeCurrentTab);

  const showTypeFilter = searchQuery.trim().length === 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const { selectedDoc } = useDocsStore();
  const selectedType = useItemsStore((state) => state.selectedType);

  // При первом запуске без вкладок выбираем первый доступный фильтр
  useEffect(() => {
    if (tabs.length === 0 && selectedType === null) {
      filterByType("snippet");
    }
  }, []);

  // Синхронизируем selectedDoc и selectedType в store при переключении вкладок
  useEffect(() => {
    if (activeTab?.type === "docEntry" && activeTab.docId) {
      const doc = installedDocs.find((d) => d.id === activeTab.docId);
      if (doc && selectedDoc?.id !== doc.id) {
        selectDoc(doc);
      }
      setSelectedType("documentation");
    } else if (activeTab?.type === "documentation") {
      setSelectedType("documentation");
    } else if (activeTab?.type === "item" && activeTab.itemType) {
      filterByType(activeTab.itemType);
    } else if (activeTab?.type === "new") {
      setSelectedType(null);
    }
  }, [activeTab, installedDocs, selectDoc, filterByType, selectedDoc, setSelectedType]);

  const handleCreateClick = useCallback((type: ItemType) => {
    setModalType(type);
    setIsCreateModalOpen(true);
  }, []);

  useEffect(() => {
    const unlistenSearch = listen("menu-search", () => {
      window.dispatchEvent(new CustomEvent("focus-search"));
    });

    const unlistenNewTab = listen("menu-new-tab", () => {
      openNewTab();
    });

    const unlistenCreateItem = listen<ItemType>("menu-create-item", (event) => {
      handleCreateClick(event.payload);
    });

    const unlistenSettings = listen("menu-settings", () => {
      openSettings();
    });

    return () => {
      unlistenSearch.then((f) => f());
      unlistenNewTab.then((f) => f());
      unlistenCreateItem.then((f) => f());
      unlistenSettings.then((f) => f());
    };
  }, [openNewTab, handleCreateClick, openSettings]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsResizingState(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    setIsResizingState(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "default";
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      setSidebarWidth(newWidth);
    },
    [setSidebarWidth],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <header
        data-tauri-drag-region
        className="border-b border-border bg-card h-10 flex items-center shrink-0 select-none"
      >
        <div
          className={cn(
            "h-full flex items-center border-r border-border pl-[72px] pr-2 overflow-hidden",
            !isResizingState ? "transition-all duration-300 ease-in-out" : "",
          )}
          style={{ width: isSidebarVisible ? sidebarWidth : 125 }}
        >
          <button
            type="button"
            onClick={openSettings}
            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
            title="Настройки"
          >
            <Settings size={18} />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title={isSidebarVisible ? "Скрыть сайдбар" : "Показать сайдбар"}
          >
            {isSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>
        <div data-tauri-drag-region className="flex-1 h-full flex items-center">
          <TabManager />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside
          className={cn(
            "border-r border-border flex flex-col shrink-0 relative overflow-hidden",
            !isResizingState ? "transition-all duration-300 ease-in-out" : "",
          )}
          style={{
            width: isSidebarVisible ? sidebarWidth : 0,
            opacity: isSidebarVisible ? 1 : 0,
            visibility: isSidebarVisible ? "visible" : "hidden",
          }}
        >
          <div
            className="flex flex-col h-full"
            style={{ width: sidebarWidth, minWidth: isSidebarVisible ? undefined : sidebarWidth }}
          >
            <SearchBar />
            {showTypeFilter && <TypeFilter />}
            <div className="flex-1 overflow-hidden">
              <ItemsList />
            </div>
          </div>

          {isSidebarVisible && (
            <div
              role="button"
              tabIndex={0}
              onMouseDown={startResizing}
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-10"
            />
          )}
        </aside>

        <main className="flex-1 overflow-hidden relative">
          {activeTab ? (
            activeTab.type === "new" ? (
              <EmptyTabContent onCreateClick={handleCreateClick} />
            ) : activeTab.type === "documentation" ? (
              <DocBrowser />
            ) : activeTab.type === "docEntry" && activeTab.docId && activeTab.docPath ? (
              <DocEntryViewer docId={activeTab.docId} docPath={activeTab.docPath} />
            ) : (
              <ItemDetail
                itemId={activeTab.itemId}
                onInteraction={() => useTabsStore.getState().pinTab(activeTab.id)}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground italic">
              Выберите элемент или создайте новую вкладку
            </div>
          )}
        </main>
      </div>

      <CreateItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialType={modalType}
      />
      <SettingsModal />
    </div>
  );
};
