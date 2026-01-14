import { X } from "lucide-react";
import { cn } from "@/components/ui";
import { useDocsStore } from "@/stores/docsStore";
import type { DocName } from "@/types";
import DocLogo from "../DocLogo";
import { DocBrowser } from "../Documentation/DocBrowser";

export default function DocItems() {
  const { installedDocs, selectedDoc, selectDoc, isLoading: isDocsLoading } = useDocsStore();

  if (isDocsLoading && installedDocs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Загрузка документаций...</p>
      </div>
    );
  }

  if (installedDocs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">Нет установленных документаций</p>
          <p className="text-sm">Установите документации в настройках</p>
        </div>
      </div>
    );
  }

  // Если выбрана документация, показываем компактную строку и DocBrowser
  if (selectedDoc) {
    return (
      <div className="flex flex-col h-full">
        {/* Компактная строка с выбранной документацией */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-accent/30 shrink-0">
          <DocLogo name={selectedDoc.name as DocName} />
          <span className="flex-1 text-sm font-medium line-clamp-1">{selectedDoc.displayName}</span>
          <button
            type="button"
            onClick={() => selectDoc(null)}
            className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground shrink-0"
            title="Отменить выбор"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* DocBrowser под строкой */}
        <div className="flex-1 overflow-hidden">
          <DocBrowser />
        </div>
      </div>
    );
  }

  // Если документация не выбрана, показываем список
  return (
    <div className="overflow-y-auto h-full">
      {installedDocs.map((doc) => (
        <div
          key={doc.id}
          role="button"
          tabIndex={0}
          className={cn(
            "p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50",
          )}
          onClick={() => selectDoc(doc)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              selectDoc(doc);
            }
          }}
        >
          <div className="flex items-start gap-3 mb-2">
            <DocLogo name={doc.name as DocName} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base line-clamp-1">{doc.displayName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-8">
            <span className="text-xs text-muted-foreground">Версия: {doc.version}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
