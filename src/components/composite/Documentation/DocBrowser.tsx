import { useEffect } from "react";
import { useDocsStore } from "../../../stores/docsStore";
import { DocTreeView } from "./DocTreeView";
import { DocViewer } from "./DocViewer";

export function DocBrowser() {
  const {
    installedDocs,
    selectedDoc,
    selectedEntry,
    loadInstalledDocs,
    selectDoc,
  } = useDocsStore();

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
          <p className="text-sm">
            Установите документации в настройках приложения
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <select
            value={selectedDoc?.id || ""}
            onChange={(e) => {
              const doc = installedDocs.find(
                (d) => d.id === Number(e.target.value)
              );
              if (doc) selectDoc(doc);
            }}
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 text-sm focus:outline-none focus:border-blue-500"
          >
            {installedDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.displayName}
              </option>
            ))}
          </select>
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
}

