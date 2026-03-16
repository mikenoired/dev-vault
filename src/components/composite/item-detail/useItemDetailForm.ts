import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  itemTypeOptions,
  normalizeTag,
  tagSignature,
} from "@/components/composite/item-detail/utils";
import { useHotkey } from "@/hooks/useHotkey";
import { getShortcutHotkey } from "@/lib/shortcuts";
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

interface FormSnapshot {
  title: string;
  description: string;
  content: string;
  tags: string[];
  type: ItemType;
}

interface PersistState {
  currentItemId: number | null;
  inFlight: boolean;
  needsAnotherPass: boolean;
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

const buildSnapshotState = (snapshot: FormSnapshot): LastSavedState => ({
  title: snapshot.title,
  description: snapshot.description,
  content: snapshot.content,
  tags: tagSignature(snapshot.tags),
  type: snapshot.type,
});

const hasPersistableDraftContent = (snapshot: FormSnapshot) =>
  snapshot.title.length > 0 ||
  snapshot.description.trim().length > 0 ||
  snapshot.content.trim().length > 0 ||
  snapshot.tags.length > 0;

const getDraftFallbackTitle = (type: ItemType) =>
  `Новый ${itemTypeOptions.find((option) => option.value === type)?.label ?? "элемент"}`;

const isSameState = (left: LastSavedState, right: LastSavedState) =>
  left.title === right.title &&
  left.description === right.description &&
  left.content === right.content &&
  left.tags === right.tags &&
  left.type === right.type;

const buildHydrationKey = (
  item: Pick<ItemWithTags, "id" | "title" | "description" | "content" | "tags" | "type">,
) =>
  [
    item.id,
    item.type,
    item.title,
    item.description || "",
    item.content,
    tagSignature(item.tags.map((tag) => tag.name)),
  ].join("::");

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
  const hydratedItemKeyRef = useRef<string | null>(null);
  const latestFormSnapshotRef = useRef<FormSnapshot>({
    title: "",
    description: "",
    content: "",
    tags: [],
    type: draftType ?? "snippet",
  });
  const persistStateRef = useRef<PersistState>({
    currentItemId: selectedItem?.id ?? itemId ?? null,
    inFlight: false,
    needsAnotherPass: false,
  });

  const isDraft = !itemId && !!draftType;
  const isDocumentation = selectedItem?.type === "documentation";
  const resolvedTabId = draftTabId ?? (itemId ? `item-${itemId}` : activeTabId);

  useEffect(() => {
    latestFormSnapshotRef.current = {
      title: editTitle.trim(),
      description: editDescription,
      content: editContent,
      tags: tagList,
      type: currentType,
    };
  }, [currentType, editContent, editDescription, editTitle, tagList]);

  useEffect(() => {
    persistStateRef.current.currentItemId = selectedItem?.id ?? itemId ?? null;
  }, [itemId, selectedItem?.id]);

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
      const itemKey = buildHydrationKey(selectedItem);
      if (hydratedItemKeyRef.current === itemKey) {
        return;
      }

      setEditTitle(selectedItem.title);
      setEditDescription(selectedItem.description || "");
      setEditContent(selectedItem.content);
      setTagList(selectedItem.tags.map((tag) => tag.name));
      setCurrentType(selectedItem.type);
      setTitleError("");
      setIsDirty(false);
      lastSavedRef.current = buildLastSavedState(selectedItem);
      hydratedItemKeyRef.current = itemKey;
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
      hydratedItemKeyRef.current = null;
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

    updateTabTitleById(draftTabId, getDraftFallbackTitle(currentType));
  }, [currentType, draftTabId, editTitle, isDraft, updateTabTitleById]);

  const flushAutosave = useCallback(async () => {
    const persistState = persistStateRef.current;
    if (persistState.inFlight) {
      persistState.needsAnotherPass = true;
      return;
    }

    persistState.inFlight = true;

    try {
      while (true) {
        persistState.needsAnotherPass = false;
        const snapshot = latestFormSnapshotRef.current;
        const nextState = buildSnapshotState(snapshot);
        const currentItemId = persistState.currentItemId;

        if (!currentItemId && !hasPersistableDraftContent(snapshot)) {
          break;
        }

        if (currentItemId && snapshot.title.length === 0) {
          break;
        }

        if (currentItemId && isSameState(lastSavedRef.current, nextState)) {
          if (!persistState.needsAnotherPass) {
            break;
          }
          continue;
        }

        const tagNames = snapshot.tags.map((tag) => normalizeTag(tag)).filter(Boolean);

        if (!currentItemId) {
          const createdTitle = snapshot.title || getDraftFallbackTitle(snapshot.type);
          const created = await createItem({
            type: snapshot.type,
            title: createdTitle,
            description: snapshot.description || undefined,
            content: snapshot.content,
            tagNames,
          });

          persistState.currentItemId = created.id;
          lastSavedRef.current = { ...nextState, title: createdTitle };
          hydratedItemKeyRef.current = buildHydrationKey(created);

          if (draftTabId) {
            promoteDraftTab(draftTabId, created.id, snapshot.type, createdTitle);
          }

          if (snapshot.title !== createdTitle) {
            persistState.needsAnotherPass = true;
          }
        } else {
          const shouldUpdateType = snapshot.type !== lastSavedRef.current.type;
          await updateItem(currentItemId, {
            type: shouldUpdateType ? snapshot.type : undefined,
            title: snapshot.title,
            description: snapshot.description,
            content: snapshot.content,
            tagNames,
          });
          updateTabTitle(currentItemId, snapshot.title);
          lastSavedRef.current = nextState;
        }

        setTitleError("");
        setIsDirty(false);

        if (!persistState.needsAnotherPass) {
          const latestState = buildSnapshotState(latestFormSnapshotRef.current);
          if (isSameState(lastSavedRef.current, latestState)) {
            break;
          }
          persistState.needsAnotherPass = true;
        }
      }
    } catch (error) {
      console.error("Failed to autosave item:", error);
      if (resolvedTabId) {
        failAutosaveClose(resolvedTabId);
      }
    } finally {
      persistState.inFlight = false;
    }
  }, [
    createItem,
    draftTabId,
    failAutosaveClose,
    promoteDraftTab,
    resolvedTabId,
    updateItem,
    updateTabTitle,
  ]);

  useEffect(() => {
    if (!autosaveEnabled || isDocumentation) return;

    const snapshot = latestFormSnapshotRef.current;
    const currentItemId = persistStateRef.current.currentItemId;
    if (!currentItemId && !hasPersistableDraftContent(snapshot)) return;
    if (currentItemId && snapshot.title.length === 0) return;

    void flushAutosave();
  }, [
    autosaveEnabled,
    currentType,
    editContent,
    editDescription,
    editTitle,
    flushAutosave,
    isDocumentation,
    tagList,
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
        persistStateRef.current.currentItemId = created.id;
        hydratedItemKeyRef.current = buildHydrationKey(created);
        if (draftTabId) {
          promoteDraftTab(draftTabId, created.id, currentType, trimmedTitle);
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
    tagList,
    updateItem,
    updateTabTitle,
  ]);

  useHotkey(
    getShortcutHotkey("save-item"),
    () => {
      void saveChanges();
    },
    !autosaveEnabled,
  );

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

  const handleTitleChange = useCallback((value: string) => {
    setEditTitle(value);
    if (!persistStateRef.current.currentItemId) {
      setTitleError("");
      return;
    }

    if (!value.trim()) {
      setTitleError("Заголовок не может быть пустым.");
      return;
    }

    setTitleError("");
  }, []);

  const handleTitleFocus = useCallback(() => {
    titleBeforeEditRef.current = editTitle;
  }, [editTitle]);

  const handleTitleBlur = useCallback(() => {
    if (!persistStateRef.current.currentItemId) return;
    if (!editTitle.trim()) {
      setEditTitle(titleBeforeEditRef.current);
      setTitleError("");
    }
  }, [editTitle]);

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
