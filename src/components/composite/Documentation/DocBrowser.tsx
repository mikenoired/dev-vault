import { Workflow, X } from "lucide-react";
import DocLogo from "@/components/composite/DocLogo";
import { DocTreeView } from "@/components/composite/Documentation/DocTreeView";
import { cn } from "@/components/ui";
import { useDocsStore, useTabsStore } from "@/stores";

interface DocBrowserProps {
  onClearSelection?: () => void;
  className?: string;
}

export const DocBrowser = ({ onClearSelection, className }: DocBrowserProps) => {
  const { selectedDoc } = useDocsStore();
  const openDocGraphTab = useTabsStore((state) => state.openDocGraphTab);

  if (!selectedDoc) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div className={cn("h-full overflow-hidden flex flex-col", className)}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-accent/30 shrink-0">
            <DocLogo name={selectedDoc.name} />
            <span className="flex-1 text-sm font-medium line-clamp-1">
              {selectedDoc.displayName}
            </span>
            <button
              type="button"
              onClick={() => openDocGraphTab(selectedDoc.id, selectedDoc.displayName)}
              className="p-1.5 rounded-md border border-border/80 bg-background/70 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              title="Открыть граф документации"
            >
              <Workflow className="size-4" />
            </button>
            {onClearSelection ? (
              <button
                type="button"
                onClick={onClearSelection}
                className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground shrink-0"
                title="Отменить выбор"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="h-full overflow-y-auto">
            <DocTreeView docId={selectedDoc.id} />
          </div>
        </div>
      </div>
    </div>
  );
};
