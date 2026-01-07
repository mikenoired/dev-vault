import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useUIStore } from "../../stores/uiStore";
import type { ItemType } from "../../types";
import { CreateItemModal } from "../composite/CreateItemModal";
import { ItemDetail } from "../composite/ItemDetail";
import { ItemsList } from "../composite/ItemsList";
import { SearchBar } from "../composite/SearchBar";
import { EmptyTabContent } from "../composite/Tabs/EmptyTabContent";
import { TabManager } from "../composite/Tabs/TabManager";
import { TypeFilter } from "../composite/TypeFilter";

export const MainLayout = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ItemType>("snippet");
  const [isResizingState, setIsResizingState] = useState(false);
  const isResizing = useRef(false);

  const searchQuery = useItemsStore((state) => state.searchQuery);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);
  const isSidebarVisible = useUIStore((state) => state.isSidebarVisible);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);

  const showTypeFilter = searchQuery.trim().length === 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleCreateClick = (type: ItemType) => {
    setModalType(type);
    setIsCreateModalOpen(true);
  };

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
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header
        data-tauri-drag-region
        className="border-b border-border bg-card h-10 flex items-center shrink-0 select-none"
      >
        <div
          className={`h-full flex items-center border-r border-border pl-[72px] pr-2 overflow-hidden ${!isResizingState ? "transition-all duration-300 ease-in-out" : ""}`}
          style={{ width: isSidebarVisible ? sidebarWidth : 125 }}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
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
          className={`border-r border-border flex flex-col shrink-0 relative overflow-hidden ${!isResizingState ? "transition-all duration-300 ease-in-out" : ""}`}
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
    </div>
  );
};
