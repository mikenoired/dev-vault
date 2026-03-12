import { type HTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import { Badge, cn } from "@/components/ui";
import type { ItemWithTags } from "@/types";
import { getTagColorClass } from "@/utils/tagColors";

interface ItemCardProps extends HTMLAttributes<HTMLDivElement> {
  item: ItemWithTags;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  isSearchMode?: boolean;
  leadingVisual?: ReactNode;
  footer?: ReactNode;
}

export const ItemCard = ({
  item,
  isSelected,
  onClick,
  onDoubleClick,
  isSearchMode = false,
  leadingVisual,
  footer,
  className,
  ...props
}: ItemCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      snippet: "Сниппет",
      doc: "Документ",
      config: "Конфиг",
      note: "Заметка",
      link: "Ссылка",
      documentation: "Документация",
    };
    return labels[type] || type;
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer bg-accent px-3 py-3 transition-colors hover:bg-foreground/10",
        isSelected && "bg-foreground/20",
        className,
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
      {...props}
    >
      <div className="flex items-start gap-3">
        {leadingVisual && <div className="shrink-0">{leadingVisual}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 select-none text-sm font-semibold">{item.title}</h3>
            {isSearchMode && (
              <Badge variant="secondary" className="shrink-0 text-xs select-none">
                {getTypeLabel(item.type)}
              </Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={cn("text-xs", getTagColorClass(tag.colorCode))}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            {footer}
          </div>
        </div>
      </div>

      {isSearchMode && item.highlights && item.highlights.length > 0 && (
        <div className="mt-2 space-y-1">
          {item.highlights.map((highlight) => {
            const parts = highlight.split(/\*\*(.*?)\*\*/g);
            return (
              <div key={highlight} className="text-xs text-muted-foreground font-mono">
                {parts.map((part, i) =>
                  i % 2 === 1 ? (
                    <span key={part} className="bg-warning/30 text-warning-foreground px-0.5">
                      {part}
                    </span>
                  ) : (
                    <span key={part}>{part}</span>
                  ),
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
