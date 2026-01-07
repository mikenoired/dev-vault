import { useEffect } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { useTabsStore } from "../../stores/tabsStore";
import { ItemCard } from "./ItemCard";

export const ItemsList = () => {
  const items = useItemsStore((state) => state.items);
  const isLoading = useItemsStore((state) => state.isLoading);
  const searchQuery = useItemsStore((state) => state.searchQuery);
  const loadItems = useItemsStore((state) => state.loadItems);

  const openItemTab = useTabsStore((state) => state.openItemTab);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const isSearchMode = searchQuery.trim().length > 0;
  const activeTab = tabs.find(t => t.id === activeTabId);
  const selectedItemId = activeTab?.itemId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Ничего не найдено</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isSelected={selectedItemId === item.id}
          onClick={() => openItemTab(item.id, item.type, item.title, false)}
          onDoubleClick={() => openItemTab(item.id, item.type, item.title, true)}
          isSearchMode={isSearchMode}
        />
      ))}
    </div>
  );
};
