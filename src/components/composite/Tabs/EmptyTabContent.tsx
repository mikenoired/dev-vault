import { Code2, FileText, Link2, Settings, StickyNote } from "lucide-react";
import type { ItemType } from "../../../types";

interface EmptyTabContentProps {
  onCreateClick: (type: ItemType) => void;
}

export const EmptyTabContent = ({ onCreateClick }: EmptyTabContentProps) => {
  const actions = [
    { type: "snippet" as ItemType, label: "Сниппет", icon: Code2 },
    { type: "note" as ItemType, label: "Заметка", icon: StickyNote },
    { type: "doc" as ItemType, label: "Документ", icon: FileText },
    { type: "config" as ItemType, label: "Конфиг", icon: Settings },
    { type: "link" as ItemType, label: "Ссылка", icon: Link2 },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
      <div className="flex gap-4 flex-wrap justify-center">
        {actions.map((action) => (
          <button
            type="button"
            key={action.type}
            className="flex flex-col items-center justify-center gap-4 cursor-pointer rounded-md size-32 hover:bg-border border-2 border-border transition-all"
            onClick={() => onCreateClick(action.type)}
          >
            <action.icon className="size-10" />
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
