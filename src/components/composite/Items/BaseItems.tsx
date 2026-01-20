import * as ContextMenu from "@radix-ui/react-context-menu";
import { useEffect, useRef } from "react";
import { useItemActions } from "@/contexts/ItemActionsContext";
import { useItemsStore } from "@/stores/itemsStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { ItemWithTags } from "@/types";
import { ItemCard } from "../ItemCard";

export default function BaseItems() {
  const items = useItemsStore((state) => state.items);
  const hasMore = useItemsStore((state) => state.hasMore);
  const isLoadingMore = useItemsStore((state) => state.isLoadingMore);
  const loadNextPage = useItemsStore((state) => state.loadNextPage);
  const searchItems = useItemsStore((state) => state.searchItems);
  const { requestDelete } = useItemActions();
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const openItemTab = useTabsStore((state) => state.openItemTab);
  const openDocEntryTab = useTabsStore((state) => state.openDocEntryTab);
  const isSearchMode = useItemsStore((state) => state.searchQuery.trim().length > 0);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          loadNextPage();
        }
      },
      { root, rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadNextPage]);

  const handleOpenItem = (item: ItemWithTags, pin: boolean) => {
    if (item.type === "documentation") {
      const metadata = item.metadata as { docId?: number; path?: string } | null;
      if (metadata?.docId && metadata.path) {
        openDocEntryTab(metadata.docId, metadata.path, item.title, pin);
        if (pin && isSearchMode) {
          searchItems("");
        }
        return;
      }
    }

    openItemTab(item.id, item.type, item.title, pin);
    if (pin && isSearchMode) {
      searchItems("");
    }
  };

  return (
    <div ref={listRef} className="overflow-y-auto h-full">
      {items.map((item) => (
        <ContextMenu.Root key={item.id}>
          <ContextMenu.Trigger asChild>
            <div>
              <ItemCard
                item={item}
                isSelected={activeTabId === `item-${item.id}`}
                onClick={() => handleOpenItem(item, false)}
                onDoubleClick={() => handleOpenItem(item, true)}
                isSearchMode={isSearchMode}
              />
            </div>
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content className="min-w-[160px] rounded-md border border-border bg-popover p-1 text-sm shadow-md">
              <ContextMenu.Item
                className="cursor-pointer rounded-sm px-2 py-1.5 text-red-500 outline-none hover:bg-red-500/10"
                onSelect={() => requestDelete(item)}
              >
                Удалить
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>
      ))}
      <div ref={sentinelRef} className="h-8" />
      {isLoadingMore && (
        <div className="py-3 text-center text-xs text-muted-foreground">Загрузка...</div>
      )}
    </div>
  );
}
