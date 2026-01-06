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
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dev Vault</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>Создать</Button>
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
