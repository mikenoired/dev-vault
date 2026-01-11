import { Book } from "lucide-react";
import { useTabsStore } from "@/stores/tabsStore";

export const SidebarDocButton = () => {
  const openDocumentationTab = useTabsStore((state) => state.openDocumentationTab);

  return (
    <div className="border-t border-border p-3">
      <button
        type="button"
        onClick={openDocumentationTab}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors"
      >
        <Book className="size-4 shrink-0" />
        <span className="text-sm font-medium">Документация</span>
      </button>
    </div>
  );
};
