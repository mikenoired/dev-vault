import { useEffect } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { ItemCard } from "./ItemCard";

export const ItemsList = () => {
  const { items, selectedItem, isLoading, loadItems, selectItem } = useItemsStore();

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Ничего не найдено</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isSelected={selectedItem?.id === item.id}
          onClick={() => selectItem(item)}
        />
      ))}
    </div>
  );
};
