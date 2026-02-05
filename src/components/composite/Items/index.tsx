import { Code2, Link2, Settings, StickyNote } from "lucide-react";
import { useEffect } from "react";
import { useItemsStore } from "@/stores/itemsStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { ItemType } from "@/types";
import BaseItems from "./BaseItems";
import DocItems from "./DocItems";

const quickActions: Array<{ type: ItemType; label: string; icon: React.ElementType }> = [
  { type: "snippet", label: "Сниппет", icon: Code2 },
  { type: "note", label: "Заметка", icon: StickyNote },
  { type: "config", label: "Конфиг", icon: Settings },
  { type: "link", label: "Ссылка", icon: Link2 },
];

export const ItemsList = () => {
  const isLoading = useItemsStore((state) => state.isLoading);
  const items = useItemsStore((state) => state.items);
  const searchQuery = useItemsStore((state) => state.searchQuery);
  const selectedType = useItemsStore((state) => state.selectedType);
  const loadItems = useItemsStore((state) => state.loadItems);

  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const openDraftItemTab = useTabsStore((state) => state.openDraftItemTab);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const isSearchMode = searchQuery.trim().length > 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (isLoading && items.length === 0) {
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

  if (shouldShowDocItems) {
    return <DocItems />;
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Пока нет элементов</p>
          <p className="text-xs text-muted-foreground/70">
            Создайте первый элемент, чтобы начать работу
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.type}
              type="button"
              onClick={() => openDraftItemTab(action.type)}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <action.icon className="size-4 text-muted-foreground" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <BaseItems />;
};
