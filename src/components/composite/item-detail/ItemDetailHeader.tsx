import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, X } from "lucide-react";
import { cn, Textarea } from "@/components/ui";
import { getTagColorClass } from "@/utils/tagColors";
import type { ItemDetailForm } from "./useItemDetailForm";
import { itemTypeOptions } from "./utils";

interface ItemDetailHeaderProps {
  form: ItemDetailForm;
  isNoteEditor: boolean;
  tagColorByName: Map<string, number>;
}

export const ItemDetailHeader = ({ form, isNoteEditor, tagColorByName }: ItemDetailHeaderProps) => {
  const {
    addTags,
    currentType,
    descriptionRef,
    editDescription,
    editTitle,
    focusedTagIndex,
    handleRemoveTag,
    handleTagInputBlur,
    handleTagInputChange,
    handleTagInputKeyDown,
    handleTitleBlur,
    handleTitleChange,
    handleTitleFocus,
    isTagDropdownOpen,
    setCurrentType,
    setEditDescription,
    setFocusedTagIndex,
    setIsTagDropdownOpen,
    setTagInput,
    tagInput,
    tagList,
    tagSuggestions,
    titleError,
  } = form;
  const typeConfig =
    itemTypeOptions.find((option) => option.value === currentType) ?? itemTypeOptions[0];
  const TypeIcon = typeConfig.icon;
  const descriptionLineKeys: string[] = [];
  let descriptionOffset = 0;
  for (const line of editDescription.split("\n")) {
    descriptionLineKeys.push(`${descriptionOffset}-${line.length}`);
    descriptionOffset += line.length + 1;
  }

  return (
    <div
      className={cn(
        isNoteEditor
          ? "mx-auto flex w-full max-w-[70ch] flex-col gap-2 px-6 pt-6"
          : "flex w-full flex-col gap-2 p-6",
        !isNoteEditor && "border-b border-border/40",
      )}
    >
      <div className="relative pb-2">
        <div className="flex items-center gap-3">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild disabled={isNoteEditor}>
              <button
                type="button"
                aria-label="Тип элемента"
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg bg-accent/40 text-foreground transition-colors",
                  !isNoteEditor && "hover:bg-accent/60 cursor-pointer",
                )}
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
                      option.value === currentType ? "cursor-not-allowed" : "cursor-pointer",
                    )}
                    onSelect={() => {
                      if (option.value !== currentType) {
                        setCurrentType(option.value);
                      }
                    }}
                  >
                    <option.icon className="size-4 text-muted-foreground" />
                    <span className="pointer-events-none">{option.label}</span>
                    <span className="ml-auto flex size-4 items-center justify-center">
                      {option.value === currentType && (
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
              onChange={(event) => handleTitleChange(event.target.value)}
              onFocus={handleTitleFocus}
              onBlur={handleTitleBlur}
              placeholder="Введите заголовок..."
              className="border-none font-bold text-2xl w-full focus:outline-0"
            />
          </div>
        </div>
        <span className="text-sm text-red-500 absolute left-0 -bottom-2.5">
          {titleError ? titleError : " "}
        </span>
      </div>

      <div className="relative pb-2">
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 pr-2",
            isNoteEditor ? "-left-6" : "left-0",
          )}
        >
          <div className="flex flex-col gap-0 text-sm font-mono italic text-muted-foreground/40">
            {editDescription.length === 0
              ? null
              : descriptionLineKeys.map((key) => (
                  <span key={key} className="leading-6">
                    &#47;&#47;
                  </span>
                ))}
          </div>
        </div>
        <Textarea
          ref={descriptionRef}
          id="editDescription"
          value={editDescription}
          onChange={(event) => setEditDescription(event.target.value)}
          placeholder="Введите описание (необязательно)"
          rows={1}
          className={cn(
            "relative min-h-6 border-none bg-transparent pr-0 py-0 font-mono italic text-muted-foreground/70 leading-6 focus-visible:ring-0 resize-none focus:outline-0 placeholder:text-muted-foreground/50",
            isNoteEditor ? "pl-0" : "pl-6",
          )}
        />
      </div>

      <div className="flex flex-col gap-1 pb-2">
        {tagList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            {tagList.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className={cn(
                  "group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:brightness-110",
                  getTagColorClass(tagColorByName.get(tag.toLowerCase()) ?? 0),
                )}
                aria-label={`Удалить тег ${tag}`}
              >
                <span>{tag}</span>
                <X className="size-3 text-muted-foreground group-hover:text-foreground cursor-pointer" />
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            id="editTags"
            value={tagInput}
            onChange={(event) => handleTagInputChange(event.target.value)}
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
                    setIsTagDropdownOpen(false);
                    setFocusedTagIndex(0);
                    setTagInput("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors",
                    focusedTagIndex === index ? "bg-accent/40" : "hover:bg-accent/40",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full border",
                        getTagColorClass(tag.colorCode),
                      )}
                    />
                    <span>{tag.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">Добавить</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
