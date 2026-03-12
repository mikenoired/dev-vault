import { Code2, Link2, Settings, StickyNote } from "lucide-react";
import type { ElementType } from "react";
import type { ItemType } from "@/types";

export const itemTypeOptions: { value: ItemType; label: string; icon: ElementType }[] = [
  { value: "snippet", label: "Сниппет", icon: Code2 },
  { value: "note", label: "Заметка", icon: StickyNote },
  { value: "config", label: "Конфиг", icon: Settings },
  { value: "link", label: "Ссылка", icon: Link2 },
];

export const getLanguage = (type: ItemType): "javascript" | "python" | "rust" | "markdown" =>
  type === "snippet" ? "javascript" : "markdown";

export const normalizeTag = (value: string) => value.trim();

export const tagSignature = (tags: string[]) => tags.map((tag) => tag.trim()).join("|");
