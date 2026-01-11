import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { useHotkey } from "@/hooks/useHotkey";
import { useItemsStore } from "@/stores/itemsStore";
import { useTabsStore } from "@/stores/tabsStore";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useItemsStore((state) => state.items);
  const searchItems = useItemsStore((state) => state.searchItems);

  const openItemTab = useTabsStore((state) => state.openItemTab);
  const pinTab = useTabsStore((state) => state.pinTab);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useHotkey({ key: "f", mod: true }, focusSearch);

  useEffect(() => {
    const handleFocusSearch = () => focusSearch();
    window.addEventListener("focus-search", handleFocusSearch);
    return () => window.removeEventListener("focus-search", handleFocusSearch);
  }, [focusSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchItems(query);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, searchItems]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      if (activeTabId) {
        pinTab(activeTabId);
      }
      setQuery("");
      searchItems("");
      return;
    }

    if (items.length === 0) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    const selectedItemId = activeTab?.itemId;
    const currentIndex = items.findIndex((item) => item.id === selectedItemId);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      const nextItem = items[nextIndex];
      openItemTab(nextItem.id, nextItem.type, nextItem.title, false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      const prevItem = items[prevIndex];
      openItemTab(prevItem.id, prevItem.type, prevItem.title, false);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder="Поиск сниппетов, документов, конфигов..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      className="text-base w-full rounded-none border-x-0 border-t-0 border-b border-b-border"
    />
  );
};
