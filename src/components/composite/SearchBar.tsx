import { useEffect, useState } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { Input } from "../ui/Input";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const searchItems = useItemsStore((state) => state.searchItems);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchItems(query);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, searchItems]);

  return (
    <div className="w-full p-4 border-b border-border">
      <Input
        type="text"
        placeholder="Поиск сниппетов, документов, конфигов..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="text-base"
      />
    </div>
  );
};
