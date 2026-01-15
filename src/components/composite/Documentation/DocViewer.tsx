import type { DocEntry } from "@/types";
import DocRender from "./DocRender";
import StatusBar from "./StatusBar";

interface DocViewerProps {
  entry: DocEntry;
}

const contentProcessor = (content: string) => {
  let result = content.replace(/^([^\n]+)\n=+\s*(\r?\n)?/m, "");

  const admonitions = [
    "secondary",
    "info",
    "success",
    "danger",
    "note",
    "tip",
    "warning",
    "important",
    "caution",
  ];
  admonitions.forEach((admonition) => {
    result = result.replace(new RegExp(`^::: +${admonition}`, "gm"), `:::${admonition}`);
  });
  return result;
};

export const DocViewer = ({ entry }: DocViewerProps) => {
  const content = contentProcessor(entry.content);

  return (
    <div className="mx-auto h-full w-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 pb-16">
          <div className="max-w-[65ch] mx-auto">
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
            <DocRender content={content} />
          </div>
        </div>
      </div>
      <StatusBar content={content} />
    </div>
  );
};
