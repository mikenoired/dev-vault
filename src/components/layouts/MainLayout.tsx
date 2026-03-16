import { listen } from "@tauri-apps/api/event";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { DocEntryViewer } from "@/components/composite/Documentation/DocEntryViewer";
import { DocGraphTab } from "@/components/composite/Documentation/DocGraphTab";
import { ItemDetail } from "@/components/composite/ItemDetail";
import { SettingsModal } from "@/components/composite/Settings/SettingsModal";
import { EmptyTabContent } from "@/components/composite/Tabs/EmptyTabContent";
import { TabManager } from "@/components/composite/Tabs/TabManager";
import Sidebar from "@/components/layouts/Sidebar";
import { cn } from "@/components/ui";
import { ItemActionsProvider } from "@/contexts/ItemActionsContext";
import { useHotkey } from "@/hooks/useHotkey";
import { getShortcutHotkey } from "@/lib/shortcuts";
import { useDocsStore, useItemsStore, useSettingsStore, useTabsStore, useUIStore } from "@/stores";
import type { ItemType } from "@/types";

export const MainLayout = () => {
  const [isResizingState, setIsResizingState] = useState(false);
  const isResizing = useRef(false);

  const [searchQuery, filterByType, setSelectedType, selectedType] = useItemsStore(
    useShallow((state) => [
      state.searchQuery,
      state.filterByType,
      state.setSelectedType,
      state.selectedType,
    ]),
  );

  const { tabs, activeTabId, requestCloseTab, openNewTab, openDraftItemTab } = useTabsStore(
    (state) => state,
  );
  const { sidebarWidth, isSidebarVisible, toggleSidebar, setSidebarWidth } = useUIStore(
    (state) => state,
  );
  const { installedDocs, selectDoc } = useDocsStore();

  const [openSettings, theme] = useSettingsStore(
    useShallow((state) => [state.openSettings, state.config?.ui.theme]),
  );

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
      requestCloseTab(activeTabId);
    }
  }, [activeTabId, requestCloseTab]);

  useHotkey(getShortcutHotkey("close-tab"), closeCurrentTab);
  useHotkey(getShortcutHotkey("toggle-sidebar"), toggleSidebar);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const docGraphTabs = tabs.flatMap((tab) =>
    tab.type === "docGraph" && typeof tab.docId === "number"
      ? [{ id: tab.id, docId: tab.docId }]
      : [],
  );

  const { selectedDoc } = useDocsStore();

  useEffect(() => {
    if (tabs.length === 0 && selectedType === null) {
      filterByType("snippet");
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      return;
    }

    if ((activeTab?.type === "docEntry" || activeTab?.type === "docGraph") && activeTab.docId) {
      const doc = installedDocs.find((d) => d.id === activeTab.docId);
      if (doc && selectedDoc?.id !== doc.id) {
        selectDoc(doc);
      }
      setSelectedType("documentation");
    } else if (activeTab?.type === "documentation") {
      setSelectedType("documentation");
    } else if (activeTab?.type === "item" && activeTab.itemType) {
      filterByType(activeTab.itemType);
    } else if (activeTab?.type === "draft" && activeTab.itemType) {
      setSelectedType(activeTab.itemType);
    } else if (activeTab?.type === "new") {
      setSelectedType(null);
    }
  }, [
    activeTab,
    installedDocs,
    searchQuery,
    selectDoc,
    filterByType,
    selectedDoc,
    setSelectedType,
  ]);

  const handleCreateClick = useCallback(
    (type: ItemType) => {
      openDraftItemTab(type);
    },
    [openDraftItemTab],
  );

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

  const handleTabInteraction = useCallback(
    (tabId: string) => {
      if (searchQuery.trim().length > 0) return;
      useTabsStore.getState().pinTab(tabId);
    },
    [searchQuery],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <header data-tauri-drag-region className="h-10 flex items-center shrink-0 select-none">
        <div
          className={cn(
            "h-full flex items-center pl-22 pr-2 overflow-hidden bg-accent",
            !isResizingState ? "transition-all duration-300 ease-in-out" : "",
          )}
          style={{ width: isSidebarVisible ? sidebarWidth : 165 }}
        >
          <div className="flex-1 h-full" data-tauri-drag-region />
          <button
            type="button"
            onClick={openSettings}
            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0 cursor-pointer"
            title="Настройки"
          >
            <Settings size={18} />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
            title={isSidebarVisible ? "Скрыть сайдбар" : "Показать сайдбар"}
          >
            {isSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>
        <div data-tauri-drag-region className="flex-1 h-full flex items-center">
          <TabManager />
        </div>
      </header>

      <ItemActionsProvider>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <Sidebar
            searchQuery={searchQuery}
            isResizing={isResizing}
            stopResizing={stopResizing}
            isResizingState={isResizingState}
            setIsResizingState={setIsResizingState}
            handleMouseMove={handleMouseMove}
          />
          <main className="relative flex-1 overflow-hidden">
            {activeTab ? (
              activeTab.type === "docGraph" ? null : activeTab.type === "new" ? (
                <EmptyTabContent key={activeTab.id} onCreateClick={handleCreateClick} />
              ) : activeTab.type === "docEntry" && activeTab.docId && activeTab.docPath ? (
                <DocEntryViewer
                  key={activeTab.id}
                  docId={activeTab.docId}
                  docPath={activeTab.docPath}
                  onInteraction={() => handleTabInteraction(activeTab.id)}
                />
              ) : activeTab.type === "draft" ? (
                <ItemDetail
                  key={activeTab.id}
                  draftType={activeTab.itemType}
                  draftTabId={activeTab.id}
                  onInteraction={() => handleTabInteraction(activeTab.id)}
                />
              ) : (
                <ItemDetail
                  key={activeTab.id}
                  itemId={activeTab.itemId}
                  onInteraction={() => handleTabInteraction(activeTab.id)}
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic">
                Выберите элемент или создайте новую вкладку
              </div>
            )}
            {docGraphTabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "absolute inset-0",
                  activeTabId === tab.id ? "block" : "hidden pointer-events-none",
                )}
              >
                <DocGraphTab docId={tab.docId} />
              </div>
            ))}
          </main>
        </div>
      </ItemActionsProvider>
      <SettingsModal />
    </div>
  );
};
