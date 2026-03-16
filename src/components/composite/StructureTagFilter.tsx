import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/components/ui";
import { useItemsStore } from "@/stores";

const COLLAPSED_TAG_LIMIT = 15;
const REMOVE_TAG_ANIMATION_MS = 220;

export const StructureTagFilter = () => {
  const [
    viewMode,
    tags,
    selectedTagIds,
    selectedType,
    searchQuery,
    loadTags,
    addStructureTag,
    removeStructureTag,
  ] = useItemsStore(
    useShallow((state) => [
      state.viewMode,
      state.tags,
      state.selectedTagIds,
      state.selectedType,
      state.searchQuery,
      state.loadTags,
      state.addStructureTag,
      state.removeStructureTag,
    ]),
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [removingTagIds, setRemovingTagIds] = useState<number[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const tagsRef = useRef<HTMLDivElement>(null);
  const removeTimeoutsRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    return () => {
      for (const timeoutId of removeTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      removeTimeoutsRef.current.clear();
    };
  }, []);

  const supportsTagFiltering =
    viewMode === "structure" && (searchQuery.trim().length > 0 || selectedType !== "documentation");

  const sortedTags = useMemo(
    () =>
      [...tags].sort((left, right) => {
        if (right.usageCount !== left.usageCount) {
          return right.usageCount - left.usageCount;
        }

        return left.name.localeCompare(right.name, "ru", { sensitivity: "base" });
      }),
    [tags],
  );

  const visibleTags = useMemo(
    () => (isExpanded ? sortedTags : sortedTags.slice(0, COLLAPSED_TAG_LIMIT)),
    [isExpanded, sortedTags],
  );

  const selectedTagIdSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const removingTagIdSet = useMemo(() => new Set(removingTagIds), [removingTagIds]);
  const canExpand = sortedTags.length > COLLAPSED_TAG_LIMIT;

  useLayoutEffect(() => {
    if (!supportsTagFiltering || !tagsRef.current) {
      setContainerHeight(0);
      return;
    }

    setContainerHeight(tagsRef.current.scrollHeight);
  }, [supportsTagFiltering, visibleTags]);

  useEffect(() => {
    if (!supportsTagFiltering) {
      setIsExpanded(false);
      setRemovingTagIds([]);
    }
  }, [supportsTagFiltering]);

  const handleTagClick = (tagId: number) => {
    if (selectedTagIdSet.has(tagId)) {
      if (removingTagIdSet.has(tagId)) {
        return;
      }

      setRemovingTagIds((prev) => [...prev, tagId]);

      const timeoutId = window.setTimeout(() => {
        removeTimeoutsRef.current.delete(tagId);
        setRemovingTagIds((prev) => prev.filter((id) => id !== tagId));
        void removeStructureTag(tagId);
      }, REMOVE_TAG_ANIMATION_MS);

      removeTimeoutsRef.current.set(tagId, timeoutId);
      return;
    }

    void addStructureTag(tagId);
  };

  if (!supportsTagFiltering) {
    return null;
  }

  return (
    <div className="rounded-md bg-accent/70 p-2">
      {sortedTags.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">
          Теги появятся после добавления первых айтемов.
        </p>
      ) : (
        <>
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-out"
            style={{ maxHeight: `${containerHeight}px` }}
          >
            <div ref={tagsRef} className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => {
                const isSelected = selectedTagIdSet.has(tag.id);
                const isRemoving = removingTagIdSet.has(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagClick(tag.id)}
                    className={cn(
                      "relative overflow-hidden rounded-full border px-2.5 py-1 text-xs font-medium transition-[background-color,color,opacity,border-color] duration-200",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-transparent bg-background/70 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
                      isRemoving && "opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-current transition-transform duration-200 ease-out",
                        isRemoving ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                    <span className="relative">{tag.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {canExpand && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  Свернуть
                  <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  Все теги
                  <ChevronDown className="size-3.5" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
};
