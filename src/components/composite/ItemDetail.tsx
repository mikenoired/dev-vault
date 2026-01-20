import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CalendarIcon,
  ChevronDown,
  ClockIcon,
  Code2,
  Link2,
  Settings,
  StickyNote,
} from "lucide-react";
import { type ElementType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor from "@/components/composite/CodeEditor";
import { Badge, Input, Textarea } from "@/components/ui";
import { useItemsStore } from "@/stores/itemsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { ItemType } from "@/types";

interface ItemDetailProps {
  itemId?: number;
  draftType?: ItemType;
  draftTabId?: string;
  onInteraction?: () => void;
}

const itemTypeOptions: { value: ItemType; label: string; icon: ElementType }[] = [
  { value: "snippet", label: "Сниппет", icon: Code2 },
  { value: "note", label: "Заметка", icon: StickyNote },
  { value: "config", label: "Конфиг", icon: Settings },
  { value: "link", label: "Ссылка", icon: Link2 },
];

const getLanguage = (type: ItemType): "javascript" | "python" | "rust" | "markdown" => {
  switch (type) {
    case "snippet":
      return "javascript";
    case "note":
    case "documentation":
      return "markdown";
    case "config":
      return "markdown";
    case "link":
      return "markdown";
    default:
      return "markdown";
  }
};

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const ItemDetail = ({ itemId, draftType, draftTabId, onInteraction }: ItemDetailProps) => {
  const items = useItemsStore((state) => state.items);
  const storeSelectedItem = useItemsStore((state) => state.selectedItem);
  const { updateItem, createItem } = useItemsStore((state) => state);

  const updateTabTitle = useTabsStore((state) => state.updateTabTitle);
  const updateTabTitleById = useTabsStore((state) => state.updateTabTitleById);
  const promoteDraftTab = useTabsStore((state) => state.promoteDraftTab);
  const setTabDirty = useTabsStore((state) => state.setTabDirty);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  const autosaveEnabled = useSettingsStore(
    (state) => state.config?.ui.autosave_enabled ?? true,
  );
  const editorFontSize = useSettingsStore((state) => state.config?.ui.editor_font_size ?? 14);

  const selectedItem = useMemo(() => {
    if (!itemId) return null;
    const fromList = items.find((i) => i.id === itemId);
    if (fromList) return fromList;
    if (storeSelectedItem?.id === itemId) return storeSelectedItem;
    return null;
  }, [items, itemId, storeSelectedItem]);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [currentType, setCurrentType] = useState<ItemType>(draftType ?? "snippet");
  const [titleError, setTitleError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const titleBeforeEditRef = useRef("");
  const lastSavedRef = useRef({
    title: "",
    description: "",
    content: "",
    tags: "",
    type: draftType ?? "snippet",
  });
  const isCreatingRef = useRef(false);
  const hasPendingDraftChangesRef = useRef(false);

  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditDescription(selectedItem.description || "");
      setEditContent(selectedItem.content);
      setEditTags(selectedItem.tags.map((t) => t.name).join(", "));
      setCurrentType(selectedItem.type);
      setTitleError("");
      setIsDirty(false);
      lastSavedRef.current = {
        title: selectedItem.title,
        description: selectedItem.description || "",
        content: selectedItem.content,
        tags: selectedItem.tags.map((t) => t.name).join(", "),
        type: selectedItem.type,
      };
      return;
    }

    if (draftType && !itemId) {
      setEditTitle("");
      setEditDescription("");
      setEditContent("");
      setEditTags("");
      setCurrentType(draftType);
      setTitleError("");
      setIsDirty(false);
      lastSavedRef.current = {
        title: "",
        description: "",
        content: "",
        tags: "",
        type: draftType,
      };
    }
  }, [selectedItem?.id, selectedItem?.updatedAt, draftType, itemId]);

  const isDraft = !itemId && !!draftType;
  const isDocumentation = selectedItem?.type === "documentation";
  const resolvedTabId = draftTabId ?? (itemId ? `item-${itemId}` : activeTabId);

  useEffect(() => {
    if (!isDraft || !draftTabId) return;
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle) {
      updateTabTitleById(draftTabId, trimmedTitle);
    } else {
      const fallbackLabel = itemTypeOptions.find((opt) => opt.value === currentType)?.label;
      updateTabTitleById(draftTabId, `Новый ${fallbackLabel ?? "элемент"}`);
    }
  }, [editTitle, currentType, isDraft, draftTabId, updateTabTitleById]);

  useEffect(() => {
    if (!isDraft || !isCreatingRef.current) return;
    hasPendingDraftChangesRef.current = true;
  }, [editTitle, editDescription, editContent, editTags, currentType, isDraft]);

  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!selectedItem || isDocumentation) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle || titleError) return;

    const lastSaved = lastSavedRef.current;
    if (
      lastSaved.title === trimmedTitle &&
      lastSaved.description === editDescription &&
      lastSaved.content === editContent &&
      lastSaved.tags === editTags &&
      lastSaved.type === currentType
    ) {
      return;
    }

    const handler = window.setTimeout(async () => {
      const tagNames = parseTags(editTags);
      const shouldUpdateType = currentType !== lastSavedRef.current.type;
      await updateItem(selectedItem.id, {
        type: shouldUpdateType ? currentType : undefined,
        title: trimmedTitle,
        description: editDescription,
        content: editContent,
        tagNames,
      }).catch((error) => {
        console.error("Failed to update item:", error);
      });

      updateTabTitle(selectedItem.id, trimmedTitle);
      lastSavedRef.current = {
        title: trimmedTitle,
        description: editDescription,
        content: editContent,
        tags: editTags,
        type: currentType,
      };
    }, 500);

    return () => {
      window.clearTimeout(handler);
    };
  }, [
    autosaveEnabled,
    selectedItem,
    editTitle,
    editDescription,
    editContent,
    editTags,
    currentType,
    titleError,
    updateItem,
    updateTabTitle,
    isDocumentation,
  ]);

  const hasChanges = useCallback(() => {
    const trimmedTitle = editTitle.trim();
    const lastSaved = lastSavedRef.current;
    return (
      trimmedTitle !== lastSaved.title ||
      editDescription !== lastSaved.description ||
      editContent !== lastSaved.content ||
      editTags !== lastSaved.tags ||
      currentType !== lastSaved.type
    );
  }, [currentType, editContent, editDescription, editTags, editTitle]);

  useEffect(() => {
    if (autosaveEnabled) {
      setIsDirty(false);
      return;
    }
    setIsDirty(hasChanges());
  }, [autosaveEnabled, hasChanges]);

  useEffect(() => {
    if (!resolvedTabId) return;
    if (autosaveEnabled) {
      setTabDirty(resolvedTabId, false);
      return;
    }
    setTabDirty(resolvedTabId, isDirty);
  }, [autosaveEnabled, isDirty, resolvedTabId, setTabDirty]);

  const saveChanges = useCallback(async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setTitleError("Заголовок не может быть пустым.");
      return;
    }

    const tagNames = parseTags(editTags);

    if (isDraft && !itemId) {
      try {
        const created = await createItem({
          type: currentType,
          title: trimmedTitle,
          description: editDescription || undefined,
          content: editContent,
          tagNames,
        });
        if (draftTabId) {
          promoteDraftTab(draftTabId, created.id, currentType, trimmedTitle);
          setTabDirty(draftTabId, false);
        }
        lastSavedRef.current = {
          title: trimmedTitle,
          description: editDescription,
          content: editContent,
          tags: editTags,
          type: currentType,
        };
        setIsDirty(false);
        setTitleError("");
      } catch (error) {
        console.error("Failed to create item:", error);
      }
      return;
    }

    if (!selectedItem) return;

    try {
      const lastSaved = lastSavedRef.current;
      const shouldUpdateType = currentType !== lastSaved.type;
      await updateItem(selectedItem.id, {
        type: shouldUpdateType ? currentType : undefined,
        title: trimmedTitle,
        description: editDescription,
        content: editContent,
        tagNames,
      });
      updateTabTitle(selectedItem.id, trimmedTitle);
      lastSavedRef.current = {
        title: trimmedTitle,
        description: editDescription,
        content: editContent,
        tags: editTags,
        type: currentType,
      };
      setIsDirty(false);
      setTitleError("");
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  }, [
    createItem,
    currentType,
    draftTabId,
    editContent,
    editDescription,
    editTags,
    editTitle,
    isDraft,
    itemId,
    promoteDraftTab,
    selectedItem,
    setTabDirty,
    updateItem,
    updateTabTitle,
  ]);

  useEffect(() => {
    if (autosaveEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveChanges();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [autosaveEnabled, saveChanges]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("ru-RU");
  };

  const handleInteraction = () => {
    if (onInteraction) {
      onInteraction();
    }
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    const trimmed = value.trim();

    if (selectedItem) {
      if (!trimmed) {
        setTitleError("Заголовок не может быть пустым.");
      } else {
        setTitleError("");
      }
    }

    if (autosaveEnabled && !selectedItem && isDraft && trimmed && !isCreatingRef.current) {
      isCreatingRef.current = true;
      const tagNames = parseTags(editTags);
      createItem({
        type: currentType,
        title: trimmed,
        description: editDescription || undefined,
        content: editContent,
        tagNames,
      })
        .then(async (created) => {
          if (hasPendingDraftChangesRef.current) {
            hasPendingDraftChangesRef.current = false;
            await updateItem(created.id, {
              type: currentType,
              title: editTitle.trim() || created.title,
              description: editDescription,
              content: editContent,
              tagNames: parseTags(editTags),
            }).catch((error) => {
              console.error("Failed to sync draft changes:", error);
            });
          }
          if (draftTabId) {
            const finalTitle = editTitle.trim() || trimmed;
            promoteDraftTab(draftTabId, created.id, currentType, finalTitle);
          }
        })
        .catch((error) => {
          console.error("Failed to create item:", error);
        })
          .finally(() => {
            isCreatingRef.current = false;
          });
    }
  };

  const handleTitleFocus = () => {
    titleBeforeEditRef.current = editTitle;
  };

  const handleTitleBlur = () => {
    if (!selectedItem) return;

    if (!editTitle.trim()) {
      setEditTitle(titleBeforeEditRef.current);
      setTitleError("");
    }
  };

  if (!selectedItem && !isDraft) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-lg">Элемент не найден</p>
      </div>
    );
  }

  if (selectedItem && isDocumentation) {
    return (
      <div className="h-full flex flex-col overflow-hidden" onPointerDown={handleInteraction}>
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
              fontSize={editorFontSize}
            />
          </div>
        </div>
      </div>
    );
  }

  const activeType = currentType;
  const typeConfig =
    itemTypeOptions.find((option) => option.value === activeType) ?? itemTypeOptions[0];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="h-full flex flex-col overflow-hidden" onPointerDown={handleInteraction}>
      <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex size-10 items-center justify-center rounded-lg bg-accent/40 text-foreground">
              <TypeIcon className="size-5" />
            </div>
            <div className="flex-1">
              <Input
                id="editTitle"
                label="Заголовок"
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onFocus={handleTitleFocus}
                onBlur={handleTitleBlur}
                placeholder="Введите заголовок"
                error={titleError}
              />
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent/40 transition-colors"
                >
                  {typeConfig.label}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-md"
                >
                  {itemTypeOptions.map((option) => (
                    <DropdownMenu.Item
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none hover:bg-accent"
                      onSelect={() => {
                        setCurrentType(option.value);
                      }}
                    >
                      <option.icon className="size-4 text-muted-foreground" />
                      <span>{option.label}</span>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              id="editDescription"
              label="Описание"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Введите описание (необязательно)"
              rows={2}
            />
            <Input
              id="editTags"
              label="Теги (через запятую)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="react, typescript, ui"
            />
          </div>

          {selectedItem && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="size-4" />
                <span className="text-xs leading-none">{formatDate(selectedItem.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="size-4" />
                <span className="text-xs leading-none">{formatDate(selectedItem.updatedAt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-2 h-full">
          <label htmlFor="editContent" className="text-sm font-medium">
            Контент
          </label>
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden min-h-full">
            <CodeEditor
              value={editContent}
              onChange={setEditContent}
              language={getLanguage(activeType)}
              fontSize={editorFontSize}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
