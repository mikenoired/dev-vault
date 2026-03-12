import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { tauriService } from "@/services/tauri";
import { useItemsStore, useTabsStore } from "@/stores";

export const useItemDetailSelection = (itemId?: number) => {
  const [items, knownTags, storeSelectedItem, selectItem] = useItemsStore(
    useShallow((state) => [state.items, state.tags, state.selectedItem, state.selectItem]),
  );
  const activeTabId = useTabsStore((state) => state.activeTabId);

  const selectedItem = useMemo(() => {
    if (!itemId) return null;
    const fromList = items.find((item) => item.id === itemId);
    if (fromList && fromList.content !== "") return fromList;
    if (storeSelectedItem?.id === itemId) return storeSelectedItem;
    return fromList ?? null;
  }, [items, itemId, storeSelectedItem]);

  useEffect(() => {
    if (!selectedItem) return;
    if (selectedItem.type === "documentation") return;
    if (selectedItem.content !== "") return;

    let cancelled = false;

    const hydrateItem = async () => {
      try {
        const fullItem = await tauriService.getItem(selectedItem.id);
        if (!cancelled && fullItem) {
          selectItem(fullItem);
        }
      } catch (error) {
        console.error("Failed to load full item:", error);
      }
    };

    void hydrateItem();

    return () => {
      cancelled = true;
    };
  }, [selectedItem, selectItem]);

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
