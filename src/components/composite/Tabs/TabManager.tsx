import { Plus } from "lucide-react";
import { TabItem } from "@/components/composite/Tabs/TabItem";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useTabsStore } from "@/stores/tabsStore";

export const TabManager = () => {
  const {
    tabs,
    activeTabId,
    openNewTab,
    requestCloseTab,
    pendingCloseTabId,
    confirmCloseTab,
    cancelCloseTab,
  } = useTabsStore();
  const pendingTab = tabs.find((tab) => tab.id === pendingCloseTabId);

  return (
    <>
      <div className="flex items-center h-full w-full overflow-hidden bg-card">
        <div className="flex items-center h-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onRequestClose={requestCloseTab}
            />
          ))}
          <div className="px-2 border-r border-border h-full flex items-center bg-card shrink-0">
            <Button onClick={openNewTab} variant="ghost" size="iconSmall" className="hover:bg-accent">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <div data-tauri-drag-region className="flex-1 shrink-0 h-full" />
      </div>
      <Modal
        isOpen={Boolean(pendingCloseTabId)}
        onClose={cancelCloseTab}
        title="Закрыть вкладку без сохранения?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Во вкладке «{pendingTab?.title ?? "Без названия"}» есть несохраненные изменения.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancelCloseTab}>
              Отмена
            </Button>
            <Button variant="danger" onClick={confirmCloseTab}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
