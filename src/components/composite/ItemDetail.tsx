import { CalendarIcon, ClockIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { CodeEditor } from "./CodeEditor";

export const ItemDetail = () => {
  const { selectedItem, deleteItem, updateItem, isEditing, setEditing } = useItemsStore();

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditDescription(selectedItem.description || "");
      setEditContent(selectedItem.content);
      setEditTags(selectedItem.tags.map((t) => t.name).join(", "));
    }
  }, [selectedItem]);

  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-lg">Выберите элемент для просмотра</p>
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

  const handleSave = async () => {
    const tagNames = editTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    await updateItem(selectedItem.id, {
      title: editTitle,
      description: editDescription,
      content: editContent,
      tagNames,
    }).catch((error) => {
      console.error("Failed to update item:", error);
    });
    setEditing(false);
  };

  const getLanguage = (type: string): "javascript" | "python" | "rust" | "markdown" => {
    switch (type) {
      case "snippet":
        return "javascript";
      case "doc":
        return "markdown";
      case "note":
        return "markdown";
      default:
        return "markdown";
    }
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Редактирование</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Отмена
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-2">
            <label htmlFor="editTitle" className="text-sm font-medium">
              Заголовок
            </label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Введите заголовок"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="editDescription" className="text-sm font-medium">
              Описание
            </label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Введите описание (необязательно)"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="editTags" className="text-sm font-medium">
              Теги (через запятую)
            </label>
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="react, typescript, ui"
            />
          </div>

          <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
            <label htmlFor="editContent" className="text-sm font-medium">
              Контент
            </label>
            <div className="flex-1 border border-border rounded-md overflow-hidden">
              <CodeEditor
                value={editContent}
                onChange={setEditContent}
                language={getLanguage(selectedItem.type)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 line-clamp-1">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {selectedItem.type}
              </Badge>
              <h1 className="text-2xl font-bold leading-tight line-clamp-1">
                {selectedItem.title}
              </h1>
            </div>
            {selectedItem.description && (
              <p className="text-muted-foreground">{selectedItem.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Изменить
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Удалить
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex gap-1.5 flex-wrap">
            {selectedItem.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="bg-accent/30">
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="ml-auto flex gap-3">
            <div className="flex items-center gap-1">
              <CalendarIcon className="size-4" />
              <span className="text-xs leading-none">{formatDate(selectedItem.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="size-4" />
              <span className="text-xs leading-none">{formatDate(selectedItem.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden min-h-full">
          <CodeEditor
            value={selectedItem.content}
            readOnly={true}
            language={getLanguage(selectedItem.type)}
          />
        </div>
      </div>
    </div>
  );
};
