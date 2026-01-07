import { useEffect } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { useTabsStore } from "../../stores/tabsStore";
import { ItemCard } from "./ItemCard";

export const ItemsList = () => {
  const { items, isLoading, searchQuery, loadItems } = useItemsStore();
  const { openItemTab, tabs, activeTabId } = useTabsStore();

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
