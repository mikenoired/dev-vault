import { useShallow } from "zustand/react/shallow";
import { cn } from "@/components/ui";
import { useItemsStore } from "@/stores";
import type { ItemsViewMode } from "@/types";

const modes: Array<{ id: ItemsViewMode; label: string }> = [
  { id: "list", label: "Список" },
  { id: "structure", label: "Структура" },
];

export const ItemsViewModeSwitch = () => {
  const [viewMode, setViewMode] = useItemsStore(
    useShallow((state) => [state.viewMode, state.setViewMode]),
  );

  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-md bg-accent p-1">
      {modes.map((mode) => {
        const isActive = viewMode === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => void setViewMode(mode.id)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};
