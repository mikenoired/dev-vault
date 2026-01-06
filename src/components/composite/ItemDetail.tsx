import { useItemsStore } from "../../stores/itemsStore";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export const ItemDetail = () => {
  const { selectedItem, deleteItem } = useItemsStore();

  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Выберите элемент для просмотра</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("ru-RU");
  };

  const handleDelete = async () => {
    if (confirm("Вы уверены, что хотите удалить этот элемент?")) {
      await deleteItem(selectedItem.id);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-3xl font-bold">{selectedItem.title}</h1>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          Удалить
        </Button>
      </div>

      {selectedItem.description && (
        <p className="text-muted-foreground mb-4">{selectedItem.description}</p>
      )}

      <div className="flex gap-2 mb-4">
        {selectedItem.tags.map((tag) => (
          <Badge key={tag.id}>{tag.name}</Badge>
        ))}
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        <p>Создано: {formatDate(selectedItem.createdAt)}</p>
        <p>Обновлено: {formatDate(selectedItem.updatedAt)}</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
          {selectedItem.content}
        </pre>
      </div>
    </div>
  );
};
