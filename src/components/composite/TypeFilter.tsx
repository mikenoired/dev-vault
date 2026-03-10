import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Book,
  ChevronDown,
  Code,
  Link as LinkIcon,
  type LucideIcon,
  Settings,
  StickyNote,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import { cn } from "@/components/ui";
import { useDocsStore } from "@/stores/docsStore";
import { useItemsStore } from "@/stores/itemsStore";
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
  const selectedType = useItemsStore((state) => state.selectedType);
  const filterByType = useItemsStore((state) => state.filterByType);
  const typeCounts = useItemsStore((state) => state.typeCounts);
  const loadTypeCounts = useItemsStore((state) => state.loadTypeCounts);
  const { installedDocs } = useDocsStore((state) => state);

  useEffect(() => {
    loadTypeCounts();
  }, [loadTypeCounts]);

  const getCountByType = useCallback(
    (type: ItemType) => {
      if (type === "documentation") return installedDocs.length;
      return typeCounts[type] ?? 0;
    },
    [installedDocs, typeCounts],
  );

  const activeType = selectedType ?? "snippet";
  const activeLabel = typeConfig[activeType]?.label ?? "Тип контента";

  return (
    <div className="flex items-center gap-2 bg-accent rounded-md w-full">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-between flex-1 gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
          >
            <span className="font-medium">{activeLabel}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            className="min-w-52 m-1 rounded-md border border-border bg-popover p-1 shadow-md"
          >
            {(Object.keys(typeConfig) as ItemType[]).map((type) => {
              const { icon: Icon, label } = typeConfig[type];
              const count = getCountByType(type);
              const isDisabled = count === 0;
              const isActive = activeType === type;

              return (
                <DropdownMenu.Item
                  key={type}
                  disabled={isDisabled}
                  onSelect={() => !isDisabled && filterByType(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    isActive ? "bg-accent/60 text-foreground" : "text-foreground",
                    isDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-accent/50 cursor-pointer",
                  )}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{label}</span>
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
