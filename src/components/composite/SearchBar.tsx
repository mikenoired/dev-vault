import { SearchIcon } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Input } from "@/components/ui";
import { useHotkey } from "@/hooks/useHotkey";
import { getShortcutHotkey } from "@/lib/shortcuts";
import { useItemsStore, useTabsStore } from "@/stores";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, searchItems] = useItemsStore(
    useShallow((state) => [state.items, state.searchItems]),
  );

  const [openItemTab, openDocEntryTab, pinTab, tabs, activeTabId] = useTabsStore(
    useShallow((state) => [
      state.openItemTab,
      state.openDocEntryTab,
      state.pinTab,
      state.tabs,
      state.activeTabId,
    ]),
  );

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useHotkey(getShortcutHotkey("focus-search"), focusSearch);

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
    if (e.key === "Escape") {
      e.preventDefault();
      if (activeTabId) {
        pinTab(activeTabId);
      }
      setQuery("");
      searchItems("");
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (items.length === 0) return;

      const activeTab = tabs.find((t) => t.id === activeTabId);
      const selectedItemId = activeTab?.itemId;
      const currentIndex = items.findIndex((item) => item.id === selectedItemId);
      const targetItem = currentIndex >= 0 ? items[currentIndex] : items[0];

      if (!targetItem) return;

      if (targetItem.type === "documentation") {
        const metadata = targetItem.metadata as { docId?: number; path?: string } | null;
        if (metadata?.docId && metadata.path) {
          openDocEntryTab(metadata.docId, metadata.path, targetItem.title, true);
          searchItems("");
          setQuery("");
          return;
        }
      }

      openItemTab(targetItem.id, targetItem.type, targetItem.title, true);
      searchItems("");
      setQuery("");
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
      if (nextItem.type === "documentation") {
        const metadata = nextItem.metadata as { docId?: number; path?: string } | null;
        if (metadata?.docId && metadata.path) {
          openDocEntryTab(metadata.docId, metadata.path, nextItem.title, false);
          return;
        }
      }
      openItemTab(nextItem.id, nextItem.type, nextItem.title, false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      const prevItem = items[prevIndex];
      if (prevItem.type === "documentation") {
        const metadata = prevItem.metadata as { docId?: number; path?: string } | null;
        if (metadata?.docId && metadata.path) {
          openDocEntryTab(metadata.docId, metadata.path, prevItem.title, false);
          return;
        }
      }
      openItemTab(prevItem.id, prevItem.type, prevItem.title, false);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder="Поиск"
      icon={SearchIcon}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      className="text-base w-full rounded-md border-none focus:outline-0 focus-visible:ring-0 bg-accent focus:bg-foreground/15 transition-colors"
    />
  );
};
