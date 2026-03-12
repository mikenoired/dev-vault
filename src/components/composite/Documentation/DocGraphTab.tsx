import { RefreshCcw, Workflow } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { DocGraphCanvas } from "@/components/composite/Documentation/doc-graph/DocGraphCanvas";
import { useDocsStore, useTabsStore } from "@/stores";
import type { DocumentationGraph } from "@/types";

interface DocGraphTabProps {
  docId: number;
}

export const DocGraphTab = memo(({ docId }: DocGraphTabProps) => {
  const [installedDocs, docGraphs, loadDocGraph, error] = useDocsStore(
    useShallow((state) => [state.installedDocs, state.docGraphs, state.loadDocGraph, state.error]),
  );
  const [openDocEntryTab] = useTabsStore(useShallow((state) => [state.openDocEntryTab]));
  const [isLoading, setIsLoading] = useState(false);

  const graph: DocumentationGraph | undefined = docGraphs[docId];
  const doc = installedDocs.find((item) => item.id === docId);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        await loadDocGraph(docId);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [docId, loadDocGraph]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadDocGraph(docId, true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Документация не найдена
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-3 border-b border-border bg-primary-foreground px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-orange-500/12 text-orange-400">
          <Workflow className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{doc.displayName}</div>
          <div className="text-xs text-muted-foreground">
            {graph
              ? `${graph.nodes.length} nodes • ${graph.edges.length} edges`
              : "Подготовка графа"}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <RefreshCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {graph ? (
          <DocGraphCanvas
            graph={graph}
            onOpenNode={(path, title) => openDocEntryTab(docId, path, title)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {error ?? "Загрузка графа..."}
          </div>
        )}
      </div>
    </div>
  );
});
