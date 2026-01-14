import type { DocEntry } from "@/types";
import DocRender from "./DocRender";

interface DocViewerProps {
  entry: DocEntry;
}

export const DocViewer = ({ entry }: DocViewerProps) => {
  console.log("entry", entry.content);
  return (
    <div className="p-8 mx-auto h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-100 mb-2">{entry.title}</h1>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>{entry.path}</span>
            {entry.entryType && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-neutral-400">
                  {entry.entryType}
                </span>
              </>
            )}
          </div>
        </div>

        <DocRender content={entry.content} />

        <div className="mt-8 pt-6 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(entry.content);
            }}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-neutral-300 transition-colors"
          >
            Скопировать содержимое
          </button>
        </div>
      </div>
    </div>
  );
};
