import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Book,
  Code,
  FileText,
  Link as LinkIcon,
  type LucideIcon,
  Settings,
  StickyNote,
} from "lucide-react";
import { cn } from "@/components/ui";
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
  const items = useItemsStore((state) => state.items);

  const getCountByType = (type: ItemType) => {
    return items.filter((item) => item.type === type).length;
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex p-1 gap-1 border-b border-border">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={() => filterByType(null)}
              className={cn(
                "p-2 rounded-md transition-colors cursor-pointer",
                selectedType === null
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground",
              )}
            >
              <FileText className="size-4" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-card border border-border px-3 py-2 rounded-md shadow-lg text-sm text-foreground"
              sideOffset={5}
            >
              Все элементы
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        {(Object.keys(typeConfig) as ItemType[]).map((type) => {
          const { icon: Icon, label } = typeConfig[type];
          const count = getCountByType(type);
          const isDisabled = count === 0;

          return (
            <Tooltip.Root key={type}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => !isDisabled && filterByType(type)}
                  disabled={isDisabled}
                  className={cn(
                    "p-2 rounded-md transition-colors cursor-pointer",
                    selectedType === type
                      ? "bg-primary text-primary-foreground"
                      : isDisabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "hover:bg-accent text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-card border border-border px-3 py-2 rounded-md shadow-lg text-sm text-foreground"
                  sideOffset={5}
                >
                  {label} ({count})
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
