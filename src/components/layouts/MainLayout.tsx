import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { CreateItemModal } from "../composite/CreateItemModal";
import { ItemDetail } from "../composite/ItemDetail";
import { ItemsList } from "../composite/ItemsList";
import { SearchBar } from "../composite/SearchBar";
import { TypeFilter } from "../composite/TypeFilter";
import { Button } from "../ui/Button";

export const MainLayout = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const searchQuery = useItemsStore((state) => state.searchQuery);
  const showTypeFilter = searchQuery.trim().length === 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header
        data-tauri-drag-region
        className="border-b border-border bg-card h-10 flex items-center shrink-0 select-none"
      >
        <div
          data-tauri-drag-region
          className="w-full h-full px-2 flex items-center justify-between pl-[90px]"
        >
          <Button onClick={() => setIsCreateModalOpen(true)} size="iconSmall" variant="secondary">
            <PlusIcon className="size-4" />
          </Button>
          <div data-tauri-drag-region className="flex-1 h-full" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 border-r border-border flex flex-col">
          <SearchBar />
          {showTypeFilter && <TypeFilter />}
          <div className="flex-1 overflow-hidden">
            <ItemsList />
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          <ItemDetail />
        </main>
      </div>

      <CreateItemModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
