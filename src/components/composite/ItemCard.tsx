import { useEffect, useRef } from "react";
import type { ItemWithTags } from "../../types";
import { Badge } from "../ui/Badge";

interface ItemCardProps {
  item: ItemWithTags;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  isSearchMode?: boolean;
}

export const ItemCard = ({ item, isSelected, onClick, onDoubleClick, isSearchMode = false }: ItemCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      snippet: "Сниппет",
      doc: "Документ",
      config: "Конфиг",
      note: "Заметка",
      link: "Ссылка",
    };
    return labels[type] || type;
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50 ${
        isSelected ? "bg-accent" : ""
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-base line-clamp-1">{item.title}</h3>
        {isSearchMode && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {getTypeLabel(item.type)}
          </Badge>
        )}
      </div>

      {!isSearchMode && item.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
      )}

      {isSearchMode && item.highlights && item.highlights.length > 0 && (
        <div className="mb-2 space-y-1">
          {item.highlights.map((highlight, idx) => {
            const parts = highlight.split(/\*\*(.*?)\*\*/g);
            return (
              <div key={idx} className="text-xs text-muted-foreground font-mono">
                {parts.map((part, i) =>
                  i % 2 === 1 ? (
                    <span key={i} className="bg-warning/30 text-warning-foreground px-0.5">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{formatDate(item.updatedAt)}</span>
        {item.tags.length > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <div className="flex gap-1 flex-wrap">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
