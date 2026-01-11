import { useEffect } from "react";
import { DocTreeView } from "@/components/composite/Documentation/DocTreeView";
import { DocViewer } from "@/components/composite/Documentation/DocViewer";
import { Select } from "@/components/ui";
import { useDocsStore } from "@/stores/docsStore";

export const DocBrowser = () => {
  const { installedDocs, selectedDoc, selectedEntry, loadInstalledDocs, selectDoc } =
    useDocsStore();

  useEffect(() => {
    loadInstalledDocs();
  }, [loadInstalledDocs]);

  useEffect(() => {
    if (installedDocs.length > 0 && !selectedDoc) {
      selectDoc(installedDocs[0]);
    }
  }, [installedDocs, selectedDoc, selectDoc]);

  if (installedDocs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <p className="text-lg mb-2">Нет установленных документаций</p>
          <p className="text-sm">Установите документации в настройках приложения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <Select
            options={installedDocs.map((doc) => ({
              value: doc.id.toString(),
              label: doc.displayName,
            }))}
            value={selectedDoc?.id.toString() || ""}
            onChange={(e) =>
              selectDoc(installedDocs.find((d) => d.id === Number(e.target.value)) || null)
            }
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedDoc && <DocTreeView docId={selectedDoc.id} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedEntry ? (
          <DocViewer entry={selectedEntry} />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            Выберите раздел документации
          </div>
        )}
      </div>
    </div>
  );
};
