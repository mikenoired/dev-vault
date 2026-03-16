import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useItemsStore, useTabsStore } from "@/stores";

export const useItemDetailSelection = (itemId?: number) => {
  const [items, itemDetails, knownTags, hydrateItemDetails] = useItemsStore(
    useShallow((state) => [state.items, state.itemDetails, state.tags, state.hydrateItemDetails]),
  );
  const activeTabId = useTabsStore((state) => state.activeTabId);

  const listItem = useMemo(() => {
    if (!itemId) return null;
    return items.find((item) => item.id === itemId) ?? null;
  }, [itemId, items]);

  const selectedItem = useMemo(() => {
    if (!itemId) return null;
    const detailedItem = itemDetails[itemId];
    if (detailedItem) return detailedItem;
    if (listItem?.content !== "") return listItem;
    return listItem ?? null;
  }, [itemDetails, itemId, listItem]);

  useEffect(() => {
    if (!selectedItem) return;
    if (selectedItem.type === "documentation") return;
    if (selectedItem.content !== "") return;

    void hydrateItemDetails(selectedItem.id).catch((error) => {
      console.error("Failed to load full item:", error);
    });
  }, [hydrateItemDetails, selectedItem]);

  const tagColorByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const tag of knownTags) {
      map.set(tag.name.toLowerCase(), tag.colorCode);
    }
    if (selectedItem) {
      for (const tag of selectedItem.tags) {
        map.set(tag.name.toLowerCase(), tag.colorCode);
      }
    }
    return map;
  }, [knownTags, selectedItem]);

  return {
    activeTabId,
    selectedItem,
    tagColorByName,
  };
};
