import { useState } from "react";
import { useItemsStore } from "../../stores/itemsStore";
import type { ItemType } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateItemModal = ({ isOpen, onClose }: CreateItemModalProps) => {
  const createItem = useItemsStore((state) => state.createItem);

  const [formData, setFormData] = useState({
    type: "snippet" as ItemType,
    title: "",
    description: "",
    content: "",
    tags: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Создать новый элемент">
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Textarea
          id="content"
          label="Содержимое *"
          placeholder="Введите код, текст или другое содержимое..."
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={12}
          error={errors.content}
          className="font-mono text-sm"
        />

        <Input
          id="tags"
          label="Теги"
          placeholder="javascript, react, hooks (через запятую)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />

        {errors.submit && <div className="text-sm text-red-500">{errors.submit}</div>}

        <div className="flex gap-3 justify-end pt-4">
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
