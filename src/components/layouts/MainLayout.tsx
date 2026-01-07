import { useState } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { useTabsStore } from "../../stores/tabsStore";
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

  const searchQuery = useItemsStore((state) => state.searchQuery);
  const { tabs, activeTabId } = useTabsStore();

  const showTypeFilter = searchQuery.trim().length === 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleCreateClick = (type: ItemType) => {
    setModalType(type);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header
        data-tauri-drag-region
        className="border-b border-border bg-card h-10 flex items-center shrink-0 select-none"
      >
        <div data-tauri-drag-region className="w-full h-full flex items-center pl-96">
          <TabManager />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 border-r border-border flex flex-col shrink-0">
          <SearchBar />
          {showTypeFilter && <TypeFilter />}
          <div className="flex-1 overflow-hidden">
            <ItemsList />
          </div>
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
