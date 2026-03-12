import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  itemTypeOptions,
  normalizeTag,
  tagSignature,
} from "@/components/composite/item-detail/utils";
import { tauriService } from "@/services/tauri";
import { useItemsStore, useSettingsStore, useTabsStore } from "@/stores";
import type { ItemType, ItemWithTags, Tag } from "@/types";

interface UseItemDetailFormParams {
  activeTabId: string | null;
  draftTabId?: string;
  draftType?: ItemType;
  itemId?: number;
  selectedItem: ItemWithTags | null;
}

interface LastSavedState {
  title: string;
  description: string;
  content: string;
  tags: string;
  type: ItemType;
}

const buildLastSavedState = (
  item: Pick<ItemWithTags, "title" | "description" | "content" | "tags" | "type">,
): LastSavedState => ({
  title: item.title,
  description: item.description || "",
  content: item.content,
  tags: tagSignature(item.tags.map((tag) => tag.name)),
  type: item.type,
});

const buildDraftState = (type: ItemType): LastSavedState => ({
  title: "",
  description: "",
  content: "",
  tags: "",
  type,
});

export interface ItemDetailForm {
  addTags: (tags: string[]) => void;
  currentType: ItemType;
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>;
  editContent: string;
  editDescription: string;
  editTitle: string;
  focusedTagIndex: number;
  handleMarkdownModeChange: (mode: "source" | "live") => void;
  handleRemoveTag: (tag: string) => void;
  handleTagInputBlur: () => void;
  handleTagInputChange: (value: string) => void;
  handleTagInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  handleTitleBlur: () => void;
  handleTitleChange: (value: string) => void;
  handleTitleFocus: () => void;
  isDirty: boolean;
  isDocumentation: boolean;
  isDraft: boolean;
  isTagDropdownOpen: boolean;
  markdownViewMode: "source" | "live";
  resolvedTabId: string | null;
  saveChanges: () => Promise<void>;
  setCurrentType: (type: ItemType) => void;
  setEditContent: (value: string) => void;
  setEditDescription: (value: string) => void;
  setFocusedTagIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsTagDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTagInput: (value: string) => void;
  tagInput: string;
  tagList: string[];
  tagSuggestions: Tag[];
  titleError: string;
}

export const useItemDetailForm = ({
  activeTabId,
  draftTabId,
  draftType,
  itemId,
  selectedItem,
}: UseItemDetailFormParams): ItemDetailForm => {
  const [updateItem, createItem] = useItemsStore(
    useShallow((state) => [state.updateItem, state.createItem]),
  );
  const [updateTabTitle, updateTabTitleById, promoteDraftTab, setTabDirty, failAutosaveClose] =
    useTabsStore(
      useShallow((state) => [
        state.updateTabTitle,
        state.updateTabTitleById,
        state.promoteDraftTab,
        state.setTabDirty,
        state.failAutosaveClose,
      ]),
    );
  const [autosaveEnabled, markdownLivePreviewEnabled] = useSettingsStore(
    useShallow((state) => [
      state.config?.ui.autosave_enabled ?? true,
      state.config?.ui.markdown_live_preview ?? true,
    ]),
  );

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [focusedTagIndex, setFocusedTagIndex] = useState(0);
  const [currentType, setCurrentType] = useState<ItemType>(draftType ?? "snippet");
  const [markdownViewMode, setMarkdownViewMode] = useState<"source" | "live">(
    markdownLivePreviewEnabled ? "live" : "source",
  );
  const [titleError, setTitleError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const titleBeforeEditRef = useRef("");
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSavedRef = useRef<LastSavedState>(buildDraftState(draftType ?? "snippet"));
  const isCreatingRef = useRef(false);
  const hasPendingDraftChangesRef = useRef(false);

  const isDraft = !itemId && !!draftType;
  const isDocumentation = selectedItem?.type === "documentation";
  const resolvedTabId = draftTabId ?? (itemId ? `item-${itemId}` : activeTabId);

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

  const resetTagUiState = useCallback(() => {
    setTagInput("");
    setTagSuggestions([]);
    setIsTagDropdownOpen(false);
    setFocusedTagIndex(0);
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

  const handleTagInputChange = useCallback(
    (value: string) => {
      if (value.includes(" ")) {
        applyTagInput(value, false);
        return;
      }
      setTagInput(value);
    },
    [applyTagInput],
  );

  const handleTagInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
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
    },
    [
      addTags,
      applyTagInput,
      focusedTagIndex,
      isTagDropdownOpen,
      tagInput,
      tagList.length,
      tagSuggestions,
    ],
  );

  const handleTagInputBlur = useCallback(() => {
    if (tagInput.trim()) {
      applyTagInput(tagInput, true);
    }
    setIsTagDropdownOpen(false);
    setFocusedTagIndex(0);
  }, [applyTagInput, tagInput]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagList((prev) => prev.filter((item) => item !== tag));
  }, []);

  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditDescription(selectedItem.description || "");
      setEditContent(selectedItem.content);
      setTagList(selectedItem.tags.map((tag) => tag.name));
      setCurrentType(selectedItem.type);
      setTitleError("");
      setIsDirty(false);
      lastSavedRef.current = buildLastSavedState(selectedItem);
      resetTagUiState();
      return;
    }

    if (draftType && !itemId) {
      setEditTitle("");
      setEditDescription("");
      setEditContent("");
      setTagList([]);
      setCurrentType(draftType);
      setTitleError("");
      setIsDirty(false);
      lastSavedRef.current = buildDraftState(draftType);
      resetTagUiState();
    }
  }, [draftType, itemId, resetTagUiState, selectedItem]);

  useEffect(() => {
    if (!isDraft || !draftTabId) return;
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle) {
      updateTabTitleById(draftTabId, trimmedTitle);
      return;
    }

    const fallbackLabel = itemTypeOptions.find((option) => option.value === currentType)?.label;
    updateTabTitleById(draftTabId, `Новый ${fallbackLabel ?? "элемент"}`);
  }, [currentType, draftTabId, editTitle, isDraft, updateTabTitleById]);

  useEffect(() => {
    if (!isDraft || !isCreatingRef.current) return;
    hasPendingDraftChangesRef.current = true;
  }, [currentType, editContent, editDescription, editTitle, isDraft, tagList]);

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
      const updated = await updateItem(selectedItem.id, {
        type: shouldUpdateType ? currentType : undefined,
        title: trimmedTitle,
        description: editDescription,
        content: editContent,
        tagNames,
      })
        .then(() => true)
        .catch((error) => {
          console.error("Failed to update item:", error);
          if (resolvedTabId) {
            failAutosaveClose(resolvedTabId);
          }
          return false;
        });

      if (!updated) return;

      updateTabTitle(selectedItem.id, trimmedTitle);
      lastSavedRef.current = {
        title: trimmedTitle,
        description: editDescription,
        content: editContent,
        tags: tagSignature(tagList),
        type: currentType,
      };
      setIsDirty(false);
    }, 500);

    return () => {
      window.clearTimeout(handler);
    };
  }, [
    autosaveEnabled,
    currentType,
    editContent,
    editDescription,
    editTitle,
    failAutosaveClose,
    isDocumentation,
    resolvedTabId,
    selectedItem,
    tagList,
    titleError,
    updateItem,
    updateTabTitle,
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
    setIsDirty(hasChanges());
  }, [hasChanges]);

  useEffect(() => {
    if (!resolvedTabId) return;
    setTabDirty(resolvedTabId, isDirty);
  }, [isDirty, resolvedTabId, setTabDirty]);

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
    editTitle,
    isDraft,
    itemId,
    promoteDraftTab,
    selectedItem,
    setTabDirty,
    tagList,
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

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = "0px";
    const next = Math.max(element.scrollHeight, 24);
    element.style.height = `${next}px`;
  }, [editDescription]);

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

  const handleTitleChange = useCallback(
    (value: string) => {
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
    },
    [
      autosaveEnabled,
      createItem,
      currentType,
      draftTabId,
      editContent,
      editDescription,
      editTitle,
      isDraft,
      promoteDraftTab,
      selectedItem,
      tagList,
      updateItem,
    ],
  );

  const handleTitleFocus = useCallback(() => {
    titleBeforeEditRef.current = editTitle;
  }, [editTitle]);

  const handleTitleBlur = useCallback(() => {
    if (!selectedItem) return;
    if (!editTitle.trim()) {
      setEditTitle(titleBeforeEditRef.current);
      setTitleError("");
    }
  }, [editTitle, selectedItem]);

  useEffect(() => {
    setMarkdownViewMode(markdownLivePreviewEnabled ? "live" : "source");
  }, [markdownLivePreviewEnabled]);

  const handleMarkdownModeChange = useCallback((mode: "source" | "live") => {
    setMarkdownViewMode(mode);
  }, []);

  return {
    addTags,
    currentType,
    descriptionRef,
    editContent,
    editDescription,
    editTitle,
    focusedTagIndex,
    handleMarkdownModeChange,
    handleRemoveTag,
    handleTagInputBlur,
    handleTagInputChange,
    handleTagInputKeyDown,
    handleTitleBlur,
    handleTitleChange,
    handleTitleFocus,
    isDirty,
    isDocumentation,
    isDraft,
    isTagDropdownOpen,
    markdownViewMode,
    resolvedTabId,
    saveChanges,
    setCurrentType,
    setEditContent,
    setEditDescription,
    setFocusedTagIndex,
    setIsTagDropdownOpen,
    setTagInput,
    tagInput,
    tagList,
    tagSuggestions,
    titleError,
  };
};
