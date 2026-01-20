import { createContext, type ReactNode, useContext, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useItemsStore } from "@/stores/itemsStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { ItemWithTags } from "@/types";

interface ItemActionsContextValue {
  requestDelete: (item: ItemWithTags) => void;
}

const ItemActionsContext = createContext<ItemActionsContextValue | null>(null);

export const useItemActions = () => {
  const context = useContext(ItemActionsContext);
  if (!context) {
    throw new Error("useItemActions must be used within ItemActionsProvider.");
  }
  return context;
};

interface ItemActionsProviderProps {
  children: ReactNode;
}

export const ItemActionsProvider = ({ children }: ItemActionsProviderProps) => {
  const deleteItem = useItemsStore((state) => state.deleteItem);
  const [pendingDelete, setPendingDelete] = useState<ItemWithTags | null>(null);

  const requestDelete = (item: ItemWithTags) => {
    setPendingDelete(item);
  };

  const handleClose = () => {
    setPendingDelete(null);
  };

  const handleConfirm = async () => {
    if (!pendingDelete) return;

    await deleteItem(pendingDelete.id);
    const { tabs, closeTab } = useTabsStore.getState();
    for (const tab of tabs) {
      if (tab.itemId === pendingDelete.id) {
        closeTab(tab.id);
      }
    }
    setPendingDelete(null);
  };

  return (
    <ItemActionsContext.Provider value={{ requestDelete }}>
      {children}
      <Modal isOpen={!!pendingDelete} onClose={handleClose} title="Удалить элемент?">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Элемент <span className="font-medium text-foreground">{pendingDelete?.title}</span>{" "}
            будет удален без возможности восстановления.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </ItemActionsContext.Provider>
  );
};
