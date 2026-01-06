import * as Tooltip from "@radix-ui/react-tooltip";
import { Code, FileText, Link as LinkIcon, Settings, StickyNote } from "lucide-react";
import { useItemsStore } from "../../stores/itemsStore";
import type { ItemType } from "../../types";

const typeConfig: Record<
  ItemType,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  snippet: { icon: Code, label: "Сниппеты" },
  doc: { icon: FileText, label: "Документы" },
  config: { icon: Settings, label: "Конфиги" },
  note: { icon: StickyNote, label: "Заметки" },
  link: { icon: LinkIcon, label: "Ссылки" },
};

export const TypeFilter = () => {
  const { selectedType, filterByType, items } = useItemsStore();

  const getCountByType = (type: ItemType) => {
    return items.filter((item) => item.type === type).length;
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex gap-2 p-4 border-b border-border">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={() => filterByType(null)}
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                selectedType === null
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <FileText className="w-5 h-5" />
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
                  className={`p-2 rounded-md transition-colors cursor-pointer ${
                    selectedType === type
                      ? "bg-primary text-primary-foreground"
                      : isDisabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
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
