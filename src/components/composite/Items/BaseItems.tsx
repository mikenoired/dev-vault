import { useEffect, useRef } from "react";
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
        <ItemCard
          key={item.id}
          item={item}
          isSelected={activeTabId === `item-${item.id}`}
          onClick={() => handleOpenItem(item, false)}
          onDoubleClick={() => handleOpenItem(item, true)}
          isSearchMode={isSearchMode}
        />
      ))}
      <div ref={sentinelRef} className="h-8" />
      {isLoadingMore && (
        <div className="py-3 text-center text-xs text-muted-foreground">Загрузка...</div>
      )}
    </div>
  );
}
