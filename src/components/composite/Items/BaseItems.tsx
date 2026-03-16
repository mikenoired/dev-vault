import * as ContextMenu from "@radix-ui/react-context-menu";
import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { ItemCard } from "@/components/composite/ItemCard";
import { cn } from "@/components/ui";
import { useItemActions } from "@/contexts/ItemActionsContext";
import { useItemsStore, useTabsStore } from "@/stores";
import type { ItemWithTags } from "@/types";

export default function BaseItems() {
  const [items, hasMore, isLoadingMore, loadNextPage, searchItems, tags, viewMode, selectedTagIds] =
    useItemsStore(
      useShallow((state) => [
        state.items,
        state.hasMore,
        state.isLoadingMore,
        state.loadNextPage,
        state.searchItems,
        state.tags,
        state.viewMode,
        state.selectedTagIds,
      ]),
    );

  const { requestDelete } = useItemActions();
  const [activeTabId, openItemTab, openDocEntryTab] = useTabsStore(
    useShallow((state) => [state.activeTabId, state.openItemTab, state.openDocEntryTab]),
  );
  const isSearchMode = useItemsStore((state) => state.searchQuery.trim().length > 0);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hideTags = viewMode === "structure" && selectedTagIds.length > 0;
  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) =>
        left.title.localeCompare(right.title, "ru", { sensitivity: "base" }),
      ),
    [items],
  );
  const tagNameById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags]);
  const groupedItems = useMemo(() => {
    if (isSearchMode || viewMode !== "structure" || selectedTagIds.length === 0) {
      return [];
    }

    return selectedTagIds
      .map((tagId) => {
        const groupItems = sortedItems.filter((item) => item.tags.some((tag) => tag.id === tagId));
        if (groupItems.length === 0) {
          return null;
        }

        return {
          tagId,
          title: tagNameById.get(tagId) ?? `Тег ${tagId}`,
          items: groupItems,
        };
      })
      .filter((group): group is { tagId: number; title: string; items: ItemWithTags[] } => !!group);
  }, [isSearchMode, selectedTagIds, sortedItems, tagNameById, viewMode]);

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

  const renderItemCard = (item: ItemWithTags, key: string, className?: string) => (
    <ContextMenu.Root key={key}>
      <ContextMenu.Trigger asChild>
        <ItemCard
          item={item}
          isSelected={activeTabId === `item-${item.id}`}
          onClick={() => handleOpenItem(item, false)}
          onDoubleClick={() => handleOpenItem(item, true)}
          isSearchMode={isSearchMode}
          hideTags={hideTags}
          className={className}
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
  );

  return (
    <div
      ref={listRef}
      className="flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-md"
    >
      {groupedItems.length > 0
        ? groupedItems.map((group, groupIndex) => (
            <section key={group.tagId} className={cn(groupIndex > 0 && "mt-3")}>
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.title}
              </div>
              {group.items.map((item, itemIndex) =>
                renderItemCard(
                  item,
                  `${group.tagId}-${item.id}-${itemIndex}`,
                  cn(
                    itemIndex === 0 && "rounded-t-md",
                    itemIndex === group.items.length - 1 && "rounded-b-md",
                  ),
                ),
              )}
            </section>
          ))
        : sortedItems.map((item, i) =>
            renderItemCard(
              item,
              `list-${item.id}-${i}`,
              cn(i === sortedItems.length - 1 && "rounded-b-md", i === 0 && "rounded-t-md"),
            ),
          )}
      <div ref={sentinelRef} className="h-0" />
      {isLoadingMore && (
        <div className="py-3 text-center text-xs text-muted-foreground">Загрузка...</div>
      )}
    </div>
  );
}
