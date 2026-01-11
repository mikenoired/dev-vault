import { Book, Code2, Link2, Settings, StickyNote } from "lucide-react";
import { useTabsStore } from "@/stores/tabsStore";
import type { ItemType } from "@/types";

interface EmptyTabContentProps {
  onCreateClick: (type: ItemType) => void;
}

export const EmptyTabContent = ({ onCreateClick }: EmptyTabContentProps) => {
  const openDocumentationTab = useTabsStore((state) => state.openDocumentationTab);

  const actions = [
    { type: "snippet" as ItemType, label: "Сниппет", icon: Code2 },
    { type: "note" as ItemType, label: "Заметка", icon: StickyNote },
    { type: "config" as ItemType, label: "Конфиг", icon: Settings },
    { type: "link" as ItemType, label: "Ссылка", icon: Link2 },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-background gap-6">
      <span className="text-center text-muted-foreground">
        <span className="font-medium">Создайте новый элемент в хранилище</span>
        <br />
        <span className="italic">или выберите существующий из списка</span>
      </span>
      <div className="flex gap-4 flex-wrap justify-center">
        {actions.map((action) => (
          <button
            type="button"
            key={action.type}
            className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md size-28 hover:bg-border border-2 border-border transition-all"
            onClick={() => onCreateClick(action.type)}
          >
            <action.icon className="size-8 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 w-full max-w-md">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">или</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={openDocumentationTab}
        className="flex items-center gap-3 px-6 py-3 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
      >
        <Book className="size-5 text-foreground" />
        <span className="font-medium text-foreground">Открыть документацию</span>
      </button>
    </div>
  );
};
