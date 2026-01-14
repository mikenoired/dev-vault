import { useItemsStore } from "@/stores/itemsStore";
import { useTabsStore } from "@/stores/tabsStore";
import { ItemCard } from "../ItemCard";

export default function BaseItems() {
  const items = useItemsStore((state) => state.items);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const openItemTab = useTabsStore((state) => state.openItemTab);
  const isSearchMode = useItemsStore((state) => state.searchQuery.trim().length > 0);

  return (
    <div className="overflow-y-auto h-full">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isSelected={activeTabId === `item-${item.id}`}
          onClick={() => openItemTab(item.id, item.type, item.title, false)}
          onDoubleClick={() => openItemTab(item.id, item.type, item.title, true)}
          isSearchMode={isSearchMode}
        />
      ))}
    </div>
  );
}
