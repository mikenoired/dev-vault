import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Code2, Link2, Settings, StickyNote, X } from "lucide-react";
import {
  type ElementType,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CodeEditor from "@/components/composite/CodeEditor";
import { Badge, cn, Textarea } from "@/components/ui";
import { tauriService } from "@/services/tauri";
import { useItemsStore } from "@/stores/itemsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { ItemType, Tag } from "@/types";

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

const normalizeTag = (value: string) => value.trim();
const tagSignature = (tags: string[]) => tags.map((tag) => tag.trim()).join("|");

export const ItemDetail = ({ itemId, draftType, draftTabId, onInteraction }: ItemDetailProps) => {
  const items = useItemsStore((state) => state.items);
  const storeSelectedItem = useItemsStore((state) => state.selectedItem);
  const { updateItem, createItem } = useItemsStore((state) => state);

  const updateTabTitle = useTabsStore((state) => state.updateTabTitle);
  const updateTabTitleById = useTabsStore((state) => state.updateTabTitleById);
  const promoteDraftTab = useTabsStore((state) => state.promoteDraftTab);
  const setTabDirty = useTabsStore((state) => state.setTabDirty);
  const activeTabId = useTabsStore((state) => state.activeTabId);

  const autosaveEnabled = useSettingsStore((state) => state.config?.ui.autosave_enabled ?? true);
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
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [focusedTagIndex, setFocusedTagIndex] = useState(0);
  const [currentType, setCurrentType] = useState<ItemType>(draftType ?? "snippet");
  const [titleError, setTitleError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const titleBeforeEditRef = useRef("");
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
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
      setTagList(selectedItem.tags.map((t) => t.name));
      setTagInput("");
      setTagSuggestions([]);
      setIsTagDropdownOpen(false);
      setCurrentType(selectedItem.type);
      setTitleError("");
      setIsDirty(false);
      lastSavedRef.current = {
        title: selectedItem.title,
        description: selectedItem.description || "",
        content: selectedItem.content,
        tags: tagSignature(selectedItem.tags.map((t) => t.name)),
        type: selectedItem.type,
      };
      return;
    }

    if (draftType && !itemId) {
      setEditTitle("");
      setEditDescription("");
      setEditContent("");
      setTagList([]);
      setTagInput("");
      setTagSuggestions([]);
      setIsTagDropdownOpen(false);
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
  }, [editTitle, editDescription, editContent, tagList, currentType, isDraft]);

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
      lastSaved.tags === tagSignature(tagList) &&
      lastSaved.type === currentType
    ) {
      return;
    }

    const handler = window.setTimeout(async () => {
      const tagNames = tagList.map((tag) => normalizeTag(tag)).filter(Boolean);
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
        tags: tagSignature(tagList),
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
    tagList,
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
      tagSignature(tagList) !== lastSaved.tags ||
      currentType !== lastSaved.type
    );
  }, [currentType, editContent, editDescription, editTitle, tagList]);

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

    const tagNames = tagList.map((tag) => normalizeTag(tag)).filter(Boolean);

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
          tags: tagSignature(tagList),
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
        tags: tagSignature(tagList),
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
    tagList,
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

  const handleInteraction = () => {
    if (onInteraction) {
      onInteraction();
    }
  };

  const addTags = useCallback((nextTags: string[]) => {
    setTagList((prev) => {
      const existing = new Set(prev.map((tag) => tag.toLowerCase()));
      const merged = [...prev];
      for (const tag of nextTags) {
        const normalized = normalizeTag(tag);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        merged.push(normalized);
      }
      return merged;
    });
  }, []);

  const applyTagInput = useCallback(
    (value: string, finalize: boolean) => {
      const hasTrailingSpace = /\s$/.test(value);
      const parts = value.split(/\s+/).filter(Boolean);
      if (parts.length === 0) {
        setTagInput("");
        return;
      }

      let pending = "";
      let toAdd = parts;
      if (!finalize && !hasTrailingSpace) {
        pending = parts[parts.length - 1] ?? "";
        toAdd = parts.slice(0, -1);
      }

      if (toAdd.length > 0) {
        addTags(toAdd);
      }

      setTagInput(pending);
    },
    [addTags],
  );

  const handleTagInputChange = (value: string) => {
    if (value.includes(" ")) {
      applyTagInput(value, false);
      return;
    }
    setTagInput(value);
  };

  const handleTagInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && tagInput.length === 0 && tagList.length > 0) {
      event.preventDefault();
      setTagList((prev) => prev.slice(0, -1));
      return;
    }

    if (event.key === "Tab" && isTagDropdownOpen && tagSuggestions.length > 0) {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      setFocusedTagIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return tagSuggestions.length - 1;
        if (next >= tagSuggestions.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter" && isTagDropdownOpen && tagSuggestions.length > 0) {
      event.preventDefault();
      const target = tagSuggestions[focusedTagIndex];
      if (target) {
        addTags([target.name]);
        setTagInput("");
        setIsTagDropdownOpen(false);
        setFocusedTagIndex(0);
      }
      return;
    }

    if (event.key === " " || event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applyTagInput(`${tagInput} `, false);
    }
  };

  const handleTagInputBlur = () => {
    if (tagInput.trim()) {
      applyTagInput(tagInput, true);
    }
    setIsTagDropdownOpen(false);
    setFocusedTagIndex(0);
  };

  const handleRemoveTag = (tag: string) => {
    setTagList((prev) => prev.filter((item) => item !== tag));
  };

  useEffect(() => {
    const query = tagInput.trim();
    if (query.length < 2) {
      setTagSuggestions([]);
      setIsTagDropdownOpen(false);
      setFocusedTagIndex(0);
      return;
    }

    let isActive = true;
    const handler = window.setTimeout(async () => {
      try {
        const suggestions = await tauriService.searchTags(query, 8);
        if (!isActive) return;
        const existing = new Set(tagList.map((tag) => tag.toLowerCase()));
        const filtered = suggestions.filter((tag) => !existing.has(tag.name.toLowerCase()));
        setTagSuggestions(filtered);
        setIsTagDropdownOpen(filtered.length > 0);
        setFocusedTagIndex(0);
      } catch (error) {
        console.error("Failed to search tags:", error);
      }
    }, 200);

    return () => {
      isActive = false;
      window.clearTimeout(handler);
    };
  }, [tagInput, tagList]);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = "0px";
    const next = Math.max(element.scrollHeight, 24);
    element.style.height = `${next}px`;
  }, [editDescription]);

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
      const tagNames = tagList.map((tag) => normalizeTag(tag)).filter(Boolean);
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
              tagNames: tagList.map((tag) => normalizeTag(tag)).filter(Boolean),
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
        <div className="p-6 border-b border-border/40 backdrop-blur-sm sticky top-0 z-10">
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
                <Badge key={tag.id} variant="secondary" className="bg-accent/30">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="rounded-xl bg-muted/30 overflow-hidden min-h-full">
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
      <div className="p-6 border-b border-border/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col gap-2">
          <div className="relative pb-4">
            <div className="flex items-center gap-3">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Тип элемента"
                    className="mt-1 flex size-10 items-center justify-center rounded-lg bg-accent/40 text-foreground transition-colors hover:bg-accent/60 cursor-pointer"
                  >
                    <TypeIcon className="size-5" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    className="min-w-48 rounded-md border border-border bg-popover p-1 shadow-md z-20"
                  >
                    {itemTypeOptions.map((option) => (
                      <DropdownMenu.Item
                        key={option.value}
                        className={cn(
                          "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none transition-colors data-highlighted:bg-accent/40",
                          option.value === activeType ? "cursor-not-allowed" : "cursor-pointer",
                        )}
                        onSelect={() => {
                          if (option.value !== activeType) {
                            setCurrentType(option.value);
                          }
                        }}
                      >
                        <option.icon className="size-4 text-muted-foreground" />
                        <span className="pointer-events-none">{option.label}</span>
                        <span className="ml-auto flex size-4 items-center justify-center">
                          {option.value === activeType && (
                            <Check className="size-4 text-emerald-500" />
                          )}
                        </span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <div className="flex-1">
                <input
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onFocus={handleTitleFocus}
                  onBlur={handleTitleBlur}
                  placeholder="Введите заголовок..."
                  className="border-none font-medium text-2xl w-full focus:outline-0"
                />
              </div>
            </div>
            <span className="text-sm text-red-500 absolute left-0 -bottom-2.5">
              {titleError ? titleError : " "}
            </span>
          </div>

          <div className="relative pb-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 pr-2">
              <div className="flex flex-col gap-0 text-sm font-mono italic text-muted-foreground/40">
                {editDescription.length === 0
                  ? null
                  : editDescription.split("\n").map((_) => (
                      <span key={`slash-${_}`} className="leading-6">
                        &#47;&#47;
                      </span>
                    ))}
              </div>
            </div>
            <Textarea
              ref={descriptionRef}
              id="editDescription"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Введите описание (необязательно)"
              rows={1}
              className="relative min-h-6 border-none bg-transparent pl-6 pr-0 py-0 font-mono italic text-muted-foreground/70 leading-6 focus-visible:ring-0 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2 pb-2">
            {tagList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                {tagList.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="group inline-flex items-center gap-1 rounded-full bg-accent/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent/60"
                    aria-label={`Удалить тег ${tag}`}
                  >
                    <span>{tag}</span>
                    <X className="size-3 text-muted-foreground group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <input
                id="editTags"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={handleTagInputBlur}
                placeholder="Введите теги через пробел"
                className="w-full border-none bg-transparent px-0 text-sm text-foreground focus:outline-none"
              />

              {isTagDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-md border border-border/50 bg-popover p-1 shadow-md">
                  {tagSuggestions.map((tag, index) => (
                    <button
                      key={tag.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        addTags([tag.name]);
                        setTagInput("");
                        setIsTagDropdownOpen(false);
                        setFocusedTagIndex(0);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors",
                        focusedTagIndex === index ? "bg-accent/40" : "hover:bg-accent/40",
                      )}
                    >
                      <span>{tag.name}</span>
                      <span className="text-xs text-muted-foreground">Добавить</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CodeEditor
          value={editContent}
          onChange={setEditContent}
          language={getLanguage(activeType)}
          fontSize={editorFontSize}
        />
      </div>
    </div>
  );
};
