import { useEffect } from "react";
import { useItemsStore } from "@/stores/itemsStore";
import { useTabsStore } from "@/stores/tabsStore";
import BaseItems from "./BaseItems";
import DocItems from "./DocItems";

export const ItemsList = () => {
  const isLoading = useItemsStore((state) => state.isLoading);
  const searchQuery = useItemsStore((state) => state.searchQuery);
  const selectedType = useItemsStore((state) => state.selectedType);
  const loadItems = useItemsStore((state) => state.loadItems);

  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const isSearchMode = searchQuery.trim().length > 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const shouldShowDocItems =
    !isSearchMode &&
    (selectedType === "documentation" ||
      (selectedType === null && activeTab?.type === "documentation"));

  return shouldShowDocItems ? <DocItems /> : <BaseItems />;
};
