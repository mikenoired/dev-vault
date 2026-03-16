import * as Tooltip from "@radix-ui/react-tooltip";
import { Book, Code, Link as LinkIcon, type LucideIcon, Settings, StickyNote } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/components/ui";
import { useDocsStore, useItemsStore } from "@/stores";
import type { ItemType } from "@/types";

interface TypeItem {
  icon: LucideIcon;
  label: string;
}

const typeConfig: Record<ItemType, TypeItem> = {
  snippet: { icon: Code, label: "Сниппеты" },
  config: { icon: Settings, label: "Конфиги" },
  note: { icon: StickyNote, label: "Заметки" },
  link: { icon: LinkIcon, label: "Ссылки" },
  documentation: { icon: Book, label: "Документация" },
};

export const TypeFilter = () => {
  const [selectedType, filterByType, typeCounts, loadTypeCounts] = useItemsStore(
    useShallow((state) => [
      state.selectedType,
      state.filterByType,
      state.typeCounts,
      state.loadTypeCounts,
    ]),
  );
  const { installedDocs } = useDocsStore((state) => state);

  useEffect(() => {
    loadTypeCounts();
  }, [loadTypeCounts]);

  const getCountByType = useCallback(
    (type: ItemType) => {
      if (type === "documentation") {
        return installedDocs.length;
      }
      return typeCounts[type] ?? 0;
    },
    [installedDocs, typeCounts],
  );

  const activeType = selectedType ?? "snippet";

  return (
    <Tooltip.Provider delayDuration={0}>
      <div className="flex w-full items-center gap-1 rounded-md bg-accent p-1">
        {(Object.keys(typeConfig) as ItemType[]).map((type) => {
          const { icon: Icon, label } = typeConfig[type];
          const count = getCountByType(type);
          const isActive = activeType === type;
          const isEmpty = count === 0;
          const isDisabled = isActive || isEmpty;

          return (
            <Tooltip.Root key={type}>
              <Tooltip.Trigger asChild>
                <span className="inline-flex">
                  <button
                    type="button"
                    disabled={isDisabled}
                    aria-label={label}
                    onClick={() => filterByType(type)}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-md border transition-colors cursor-pointer",
                      isActive
                        ? "cursor-not-allowed border-border bg-card text-foreground"
                        : "border-transparent text-muted-foreground",
                      isEmpty
                        ? "cursor-not-allowed opacity-35"
                        : "hover:bg-foreground/10 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                </span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  sideOffset={6}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-lg"
                >
                  {label}
                  <Tooltip.Arrow className="fill-border" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
};
