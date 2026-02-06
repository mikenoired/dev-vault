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
      <div className="flex items-center h-full w-full overflow-hidden bg-accent">
        <div className="flex items-center h-full overflow-x-auto no-scrollbar px-2 pt-1.5">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onRequestClose={requestCloseTab}
            />
          ))}
          <div className="px-0.5 h-full pb-0.75">
            <button
              className="relative px-2 h-full flex items-center bg-transparent hover:bg-primary-foreground/50 rounded-[5px] shrink-0 transition-colors cursor-pointer"
              type="button"
              onClick={openNewTab}
            >
              <span
                aria-hidden
                className="absolute right-0 top-1/2 h-3/5 w-px -translate-y-1/2 bg-accent/60"
              />
              <Plus className="size-4" />
            </button>
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
