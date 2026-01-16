import { useEffect, useState } from "react";
import { DocViewer } from "@/components/composite/Documentation/DocViewer";
import { tauriService } from "@/services/tauri";
import type { DocEntry } from "@/types";

interface DocEntryViewerProps {
  docId: number;
  docPath: string;
  onInteraction?: () => void;
}

export const DocEntryViewer = ({ docId, docPath, onInteraction }: DocEntryViewerProps) => {
  const [entry, setEntry] = useState<DocEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadEntry = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loadedEntry = await tauriService.getDocEntryByPath(docId, docPath);
        if (!cancelled) {
          setEntry(loadedEntry);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadEntry();

    return () => {
      cancelled = true;
    };
  }, [docId, docPath]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        {error || "Запись не найдена"}
      </div>
    );
  }

  return <DocViewer entry={entry} onInteraction={onInteraction} />;
};
