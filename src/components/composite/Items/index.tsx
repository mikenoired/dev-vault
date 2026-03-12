import { Code2, Link2, Settings, StickyNote } from "lucide-react";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import BaseItems from "@/components/composite/Items/BaseItems";
import DocItems from "@/components/composite/Items/DocItems";
import { useItemsStore, useTabsStore } from "@/stores";
import type { ItemType } from "@/types";

const quickActions: Array<{ type: ItemType; label: string; icon: React.ElementType }> = [
  { type: "snippet", label: "Сниппет", icon: Code2 },
  { type: "note", label: "Заметка", icon: StickyNote },
  { type: "config", label: "Конфиг", icon: Settings },
  { type: "link", label: "Ссылка", icon: Link2 },
];

export const ItemsList = () => {
  const [isLoading, items, searchQuery, selectedType, loadItems] = useItemsStore(
    useShallow((state) => [
      state.isLoading,
      state.items,
      state.searchQuery,
      state.selectedType,
      state.loadItems,
    ]),
  );

  const [tabs, activeTabId, openDraftItemTab] = useTabsStore(
    useShallow((state) => [state.tabs, state.activeTabId, state.openDraftItemTab]),
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const isSearchMode = searchQuery.trim().length > 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  const shouldShowDocItems =
    !isSearchMode &&
    (selectedType === "documentation" ||
      (selectedType === null && activeTab?.type === "documentation"));

  if (shouldShowDocItems) {
    return (
      <div className="flex-1 overflow-hidden">
        <DocItems />
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
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
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <BaseItems />
    </div>
  );
};
