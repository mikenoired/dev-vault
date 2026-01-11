import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useDocsStore } from "@/stores/docsStore";

export function DocumentationSection() {
  const {
    availableDocs,
    installedDocs,
    isLoading,
    isInstalling,
    error,
    installProgress,
    updateProgress,
    loadAvailableDocs,
    loadInstalledDocs,
    installDoc,
    updateDoc,
    deleteDoc,
  } = useDocsStore();

  const [updatingDocId, setUpdatingDocId] = useState<number | null>(null);

  useEffect(() => {
    console.log("[UI] DocumentationSection mounted, loading docs...");
    loadAvailableDocs();
    loadInstalledDocs();
  }, [loadAvailableDocs, loadInstalledDocs]);

  const handleInstall = async (name: string) => {
    console.log(`[UI] User clicked install for: ${name}`);
    try {
      console.log(`[UI] Calling installDoc...`);
      await installDoc(name);
      console.log(`[UI] ✓ Installation completed successfully`);
      await loadInstalledDocs();
      console.log(`[UI] ✓ Installed docs list reloaded`);
    } catch (err) {
      console.error("[UI] ✗ Installation failed:", err);
    }
  };

  const handleUpdate = async (docId: number) => {
    console.log(`[UI] User clicked update for doc_id: ${docId}`);
    setUpdatingDocId(docId);
    try {
      console.log(`[UI] Calling updateDoc...`);
      await updateDoc(docId);
      console.log(`[UI] ✓ Update completed successfully`);
      await loadInstalledDocs();
    } catch (err) {
      console.error("[UI] ✗ Update failed:", err);
    } finally {
      setUpdatingDocId(null);
    }
  };

  const handleDelete = async (docId: number) => {
    console.log(`[UI] User clicked delete for doc_id: ${docId}`);
    await deleteDoc(docId);
    console.log(`[UI] ✓ Deletion completed successfully`);
  };

  const installedNames = new Set(installedDocs.map((doc) => doc.name));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1 text-foreground">Документация</h2>
        <p className="text-sm text-muted-foreground">Управление установленными документациями</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {installProgress && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Установка документации...</span>
            <span className="text-xs text-muted-foreground">
              {installProgress.currentPage} / {installProgress.maxPages}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(installProgress.currentPage / installProgress.maxPages) * 100}%`,
              }}
            />
          </div>
          {installProgress.currentPath && (
            <p className="text-xs text-muted-foreground truncate">{installProgress.currentPath}</p>
          )}
        </div>
      )}

      {updateProgress && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Обновление документации...</span>
            <span className="text-xs text-muted-foreground">
              {updateProgress.currentPage} / {updateProgress.maxPages}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(updateProgress.currentPage / updateProgress.maxPages) * 100}%`,
              }}
            />
          </div>
          {updateProgress.currentPath && (
            <p className="text-xs text-muted-foreground truncate">{updateProgress.currentPath}</p>
          )}
        </div>
      )}

      <div>
        <h3 className="text-base font-medium mb-3 text-foreground">Установленные документации</h3>
        {installedDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">У вас пока нет установленных документаций</p>
        ) : (
          <div className="space-y-2">
            {installedDocs.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{doc.displayName}</h4>
                      <span className="text-xs text-muted-foreground">v{doc.version}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{doc.sourceUrl}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Обновлено: {new Date(doc.updatedAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUpdate(doc.id)}
                      disabled={updatingDocId === doc.id}
                    >
                      {updatingDocId === doc.id ? "Обновление..." : "Обновить"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(doc.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-medium mb-3 text-foreground">Доступные для установки</h3>
        {isLoading && availableDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : (
          <div className="space-y-2">
            {availableDocs
              .filter((doc) => !installedNames.has(doc.name))
              .map((doc) => (
                <Card key={doc.name} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{doc.displayName}</h4>
                        <span className="text-xs text-muted-foreground">v{doc.version}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInstall(doc.name)}
                      disabled={isInstalling}
                    >
                      {isInstalling ? "Установка..." : "Установить"}
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
