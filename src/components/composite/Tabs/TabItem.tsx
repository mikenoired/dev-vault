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
      className="group min-w-30 max-w-60 h-full px-0.5 flex items-center justify-center rounded cursor-pointer"
    >
      <div
        className={cn(
          "w-full h-full rounded-[5px] pb-0.75",
          isActive && "tab-roundings bg-primary-foreground",
        )}
      >
        <div
          className={cn(
            !isActive && "group-hover:bg-primary-foreground/50 transition-colors",
            "rounded-[5px] h-full",
            "flex items-center justify-center pl-2 pr-1.5 gap-4",
          )}
        >
          <div className="flex items-center justify-center gap-2">
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
              {tab.isDirty && <span className="size-1.5 rounded-full bg-primary/80" />}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "size-5 flex items-center justify-center rounded-sm hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
              isActive && "opacity-100",
            )}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
