import { BookOpen, Code2, Link2, Plus, Settings, StickyNote, X } from "lucide-react";
import { cn } from "@/components/ui";
import { type Tab, useTabsStore } from "@/stores/tabsStore";
import type { ItemType } from "@/types";

const getIcon = (type: ItemType | "new" | "documentation" | "docEntry") => {
  switch (type) {
    case "snippet":
      return <Code2 className="size-3.5" />;
    case "note":
      return <StickyNote className="size-3.5" />;
    case "config":
      return <Settings className="size-3.5" />;
    case "link":
      return <Link2 className="size-3.5" />;
    case "new":
      return <Plus className="size-3.5" />;
    case "documentation":
    case "docEntry":
      return <BookOpen className="size-3.5" />;
    default:
      return null;
  }
};

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onRequestClose: (tabId: string) => void;
}

export const TabItem = ({ tab, isActive, onRequestClose }: TabItemProps) => {
  const { selectTab, pinTab } = useTabsStore();

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestClose(tab.id);
  };

  const handleClick = () => {
    selectTab(tab.id);
  };

  const handleDoubleClick = () => {
    if (!tab.isPinned) {
      pinTab(tab.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      className={cn(
        "group relative flex items-center gap-2 px-3 h-full min-w-[120px] max-w-[240px] border-r border-border cursor-default select-none transition-colors",
        isActive
          ? "bg-background text-foreground"
          : "bg-card text-muted-foreground hover:bg-accent/50",
      )}
    >
      <span className="shrink-0 opacity-70">
        {tab.type === "new"
          ? getIcon("new")
          : tab.type === "documentation" || tab.type === "docEntry"
            ? getIcon(tab.type)
            : tab.itemType
              ? getIcon(tab.itemType)
              : null}
      </span>

      <span
        className={cn(
          "flex-1 truncate text-xs font-medium flex items-center gap-1",
          !tab.isPinned ? "italic" : "",
        )}
      >
        {tab.title}
        {tab.isDirty && (
          <span className="size-1.5 rounded-full bg-primary/80" aria-label="Несохраненные изменения" />
        )}
      </span>

      <button
        type="button"
        onClick={handleClose}
        className={cn(
          "p-0.5 rounded-sm hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity",
          isActive ? "opacity-100" : "",
        )}
      >
        <X className="size-3" />
      </button>

      {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
    </div>
  );
};
