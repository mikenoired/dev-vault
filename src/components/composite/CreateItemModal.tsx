import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/composite/CodeEditor";
import { Button, Input, Modal, Select } from "@/components/ui";
import { useItemsStore } from "@/stores/itemsStore";
import type { ItemType } from "@/types";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ItemType;
}

export const CreateItemModal = ({
  isOpen,
  onClose,
  initialType = "snippet",
}: CreateItemModalProps) => {
  const createItem = useItemsStore((state) => state.createItem);

  const [formData, setFormData] = useState({
    type: initialType,
    title: "",
    description: "",
    content: "",
    tags: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({ ...prev, type: initialType }));
    }
  }, [isOpen, initialType]);

  const itemTypes = [
    { value: "snippet", label: "Сниппет" },
    { value: "doc", label: "Документ" },
    { value: "config", label: "Конфиг" },
    { value: "note", label: "Заметка" },
    { value: "link", label: "Ссылка" },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Название обязательно";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Содержимое обязательно";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const tagNames = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createItem({
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        content: formData.content,
        tagNames,
      });

      setFormData({
        type: "snippet",
        title: "",
        description: "",
        content: "",
        tags: "",
      });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ submit: String(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: "snippet",
      title: "",
      description: "",
      content: "",
      tags: "",
    });
    setErrors({});
    onClose();
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Создать новый элемент">
      <form onSubmit={handleSubmit} className="space-y-4 flex flex-col max-h-[85vh]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <Select
            id="type"
            label="Тип"
            options={itemTypes}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ItemType })}
          />

          <Input
            id="title"
            label="Название *"
            placeholder="Введите название..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
          />

          <Input
            id="description"
            label="Описание"
            placeholder="Краткое описание (опционально)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Содержимое *</span>
            <div className="border border-border rounded-md overflow-hidden min-h-[300px]">
              <CodeEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                language={getLanguage(formData.type)}
              />
            </div>
            {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
          </div>

          <Input
            id="tags"
            label="Теги"
            placeholder="javascript, react, hooks (через запятую)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />

          {errors.submit && <div className="text-sm text-red-500">{errors.submit}</div>}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border bg-background">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Создание..." : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
