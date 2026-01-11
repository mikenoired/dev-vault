import type { DocEntry } from "../../../types";

interface DocViewerProps {
  entry: DocEntry;
}

export function DocViewer({ entry }: DocViewerProps) {
  console.log(entry.content);
  return (
    <div className="p-8 max-w-4xl mx-auto">
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

      <div className="prose prose-invert prose-neutral max-w-none">
        <div
          className="text-neutral-300 leading-relaxed whitespace-pre-wrap"
          style={{
            wordBreak: "break-word",
          }}
        >
          {entry.content}
        </div>
      </div>

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
  );
}
