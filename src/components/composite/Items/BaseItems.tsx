import * as ContextMenu from "@radix-ui/react-context-menu";
import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { ItemCard } from "@/components/composite/ItemCard";
import { cn } from "@/components/ui";
import { useItemActions } from "@/contexts/ItemActionsContext";
import { useItemsStore, useTabsStore } from "@/stores";
import type { ItemWithTags } from "@/types";

export default function BaseItems() {
  const [items, hasMore, isLoadingMore, loadNextPage, searchItems] = useItemsStore(
    useShallow((state) => [
      state.items,
      state.hasMore,
      state.isLoadingMore,
      state.loadNextPage,
      state.searchItems,
    ]),
  );

  const { requestDelete } = useItemActions();
  const [activeTabId, openItemTab, openDocEntryTab] = useTabsStore(
    useShallow((state) => [state.activeTabId, state.openItemTab, state.openDocEntryTab]),
  );
  const isSearchMode = useItemsStore((state) => state.searchQuery.trim().length > 0);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) =>
        left.title.localeCompare(right.title, "ru", { sensitivity: "base" }),
      ),
    [items],
  );

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
    <div
      ref={listRef}
      className="flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-md"
    >
      {sortedItems.map((item, i) => (
        <ContextMenu.Root key={item.id}>
          <ContextMenu.Trigger asChild>
            <ItemCard
              item={item}
              isSelected={activeTabId === `item-${item.id}`}
              onClick={() => handleOpenItem(item, false)}
              onDoubleClick={() => handleOpenItem(item, true)}
              isSearchMode={isSearchMode}
              className={cn(
                i === sortedItems.length - 1 && "rounded-b-md",
                i === 0 && "rounded-t-md",
              )}
            />
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content className="min-w-40 rounded-md border border-border bg-primary-foreground p-1 text-sm shadow-md z-20">
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
      <div ref={sentinelRef} className="h-0" />
      {isLoadingMore && (
        <div className="py-3 text-center text-xs text-muted-foreground">Загрузка...</div>
      )}
    </div>
  );
}
