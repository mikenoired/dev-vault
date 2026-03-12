import CodeEditor from "@/components/composite/CodeEditor";
import StatusBar from "@/components/composite/Documentation/StatusBar";
import {
  getLanguage,
  ItemDetailDocumentationView,
  ItemDetailHeader,
  useItemDetailForm,
  useItemDetailSelection,
} from "@/components/composite/item-detail";
import { cn } from "@/components/ui";
import { useSettingsStore } from "@/stores";
import type { ItemType } from "@/types";

interface ItemDetailProps {
  itemId?: number;
  draftType?: ItemType;
  draftTabId?: string;
  onInteraction?: () => void;
}

export const ItemDetail = ({ itemId, draftType, draftTabId, onInteraction }: ItemDetailProps) => {
  const editorFontSize = useSettingsStore((state) => state.config?.ui.editor_font_size ?? 14);
  const { activeTabId, selectedItem, tagColorByName } = useItemDetailSelection(itemId);
  const form = useItemDetailForm({
    activeTabId,
    draftTabId,
    draftType,
    itemId,
    selectedItem,
  });

  const handleInteraction = () => {
    onInteraction?.();
  };

  if (!selectedItem && !form.isDraft) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-lg">Элемент не найден</p>
      </div>
    );
  }

  if (selectedItem && form.isDocumentation) {
    return (
      <ItemDetailDocumentationView
        editorFontSize={editorFontSize}
        item={selectedItem}
        onInteraction={handleInteraction}
      />
    );
  }

  const activeType = form.currentType;
  const resolvedMarkdownViewMode = activeType === "note" ? form.markdownViewMode : "source";
  const isNoteEditor = activeType === "note";
  const headerContent = (
    <ItemDetailHeader form={form} isNoteEditor={isNoteEditor} tagColorByName={tagColorByName} />
  );

  return (
    <div
      className={cn("h-full flex flex-col w-full relative", "overflow-hidden")}
      onPointerDown={handleInteraction}
    >
      {isNoteEditor ? null : headerContent}

      <div className={cn(isNoteEditor ? "flex-1 min-h-0 overflow-y-auto" : "flex-1 min-h-0")}>
        {isNoteEditor ? headerContent : null}
        <div
          className={cn(
            isNoteEditor ? "mx-auto min-h-full w-full max-w-[70ch] px-6 py-4" : "h-full w-full",
          )}
        >
          <CodeEditor
            value={form.editContent}
            onChange={form.setEditContent}
            language={getLanguage(activeType)}
            markdownViewMode={resolvedMarkdownViewMode}
            noteMode={isNoteEditor}
            fontSize={editorFontSize}
          />
        </div>
      </div>

      {isNoteEditor && (
        <div className="z-10 w-full shrink-0">
          <StatusBar
            content={form.editContent}
            markdownViewMode={resolvedMarkdownViewMode}
            onMarkdownViewModeChange={form.handleMarkdownModeChange}
          />
        </div>
      )}
    </div>
  );
};
