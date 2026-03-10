import { type Dispatch, type RefObject, type SetStateAction, useCallback } from "react";
import { ItemsList } from "@/components/composite/Items";
import { SearchBar } from "@/components/composite/SearchBar";
import { TypeFilter } from "@/components/composite/TypeFilter";
import { cn } from "@/components/ui";
import { useUIStore } from "@/stores/uiStore";

interface SidebarProps {
  searchQuery: string;
  isResizing: RefObject<boolean>;
  stopResizing: () => void;
  isResizingState: boolean;
  setIsResizingState: Dispatch<SetStateAction<boolean>>;
  handleMouseMove: (e: MouseEvent) => void;
}

export default function Sidebar({
  searchQuery,
  isResizing,
  stopResizing,
  setIsResizingState,
  handleMouseMove,
  isResizingState,
}: SidebarProps) {
  const { sidebarWidth, isSidebarVisible } = useUIStore((state) => state);
  const showTypeFilter = searchQuery.trim().length === 0;
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsResizingState(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 relative overflow-hidden",
        !isResizingState ? "transition-all duration-300 ease-in-out" : "",
      )}
      style={{
        width: isSidebarVisible ? sidebarWidth + 8 : 0,
        opacity: isSidebarVisible ? 1 : 0,
        visibility: isSidebarVisible ? "visible" : "hidden",
      }}
    >
      <div className="p-2 flex-1">
        <div
          className="flex flex-col gap-2 h-full overflow-hidden"
          style={{ width: sidebarWidth, minWidth: isSidebarVisible ? undefined : sidebarWidth }}
        >
          <SearchBar />
          {showTypeFilter && <TypeFilter />}
          <ItemsList />
        </div>

        {isSidebarVisible && (
          <div
            role="button"
            tabIndex={0}
            onMouseDown={startResizing}
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-10"
          />
        )}
      </div>
    </aside>
  );
}
