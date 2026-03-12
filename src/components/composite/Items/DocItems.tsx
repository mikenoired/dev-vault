import * as ContextMenu from "@radix-ui/react-context-menu";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import DocLogo from "@/components/composite/DocLogo";
import { DocBrowser } from "@/components/composite/Documentation/DocBrowser";
import { ItemCard } from "@/components/composite/ItemCard";
import { Button, cn, Modal } from "@/components/ui";
import { useDocsStore, useTabsStore } from "@/stores";
import type { Documentation, ItemWithTags } from "@/types";

export default function DocItems() {
  const { installedDocs, selectedDoc, selectDoc, isLoading: isDocsLoading } = useDocsStore();
  const [deleteDoc] = useDocsStore(useShallow((state) => [state.deleteDoc]));
  const [tabs, closeTab] = useTabsStore(useShallow((state) => [state.tabs, state.closeTab]));
  const [pendingDelete, setPendingDelete] = useState<Documentation | null>(null);
  const selectedDocId = selectedDoc?.id ?? null;

  const docItems = useMemo<ItemWithTags[]>(
    () =>
      installedDocs.map((doc) => ({
        id: doc.id,
        type: "documentation",
        title: doc.displayName,
        description: null,
        content: "",
        createdAt: doc.installedAt,
        updatedAt: doc.updatedAt,
        metadata: {
          docName: doc.name,
          version: doc.version,
          sourceUrl: doc.sourceUrl,
        },
        tags: [],
      })),
    [installedDocs],
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;

    const docId = pendingDelete.id;
    await deleteDoc(docId);

    for (const tab of tabs) {
      if (tab.docId === docId) {
        closeTab(tab.id);
      }
    }

    setPendingDelete(null);
  };

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

  if (selectedDoc) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <DocBrowser onClearSelection={() => selectDoc(null)} />
        </div>
      </div>
    );
  }

  // Если документация не выбрана, показываем список
  return (
    <>
      <div className="h-full overflow-y-auto rounded-md">
        {installedDocs.map((doc, index) => (
          <ContextMenu.Root key={doc.id}>
            <ContextMenu.Trigger asChild>
              <ItemCard
                item={docItems[index]}
                isSelected={selectedDocId === doc.id}
                onClick={() => selectDoc(doc)}
                leadingVisual={<DocLogo name={doc.name} />}
                footer={
                  <span className="text-xs text-muted-foreground select-none">
                    Версия: {doc.version}
                  </span>
                }
                className={cn(
                  index === 0 && "rounded-t-md",
                  index === installedDocs.length - 1 && "rounded-b-md",
                )}
              />
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Content className="z-20 min-w-40 rounded-md border border-border bg-primary-foreground p-1 text-sm shadow-md">
                <ContextMenu.Item
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-red-500 outline-none hover:bg-red-500/10"
                  onSelect={() => setPendingDelete(doc)}
                >
                  Удалить
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        ))}
      </div>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Удалить документацию?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Документация{" "}
            <span className="font-medium text-foreground">{pendingDelete?.displayName}</span> будет
            удалена вместе с локальными данными.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
