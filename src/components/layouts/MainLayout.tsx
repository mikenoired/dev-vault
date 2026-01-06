import { ItemDetail } from "../composite/ItemDetail";
import { ItemsList } from "../composite/ItemsList";
import { SearchBar } from "../composite/SearchBar";

export const MainLayout = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold">Dev Vault</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 border-r border-border flex flex-col">
          <SearchBar />
          <div className="flex-1 overflow-hidden">
            <ItemsList />
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          <ItemDetail />
        </main>
      </div>
    </div>
  );
};
