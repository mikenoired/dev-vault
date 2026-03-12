import CodeEditor from "@/components/composite/CodeEditor";
import { Badge, cn } from "@/components/ui";
import type { ItemWithTags } from "@/types";
import { getTagColorClass } from "@/utils/tagColors";
import { getLanguage } from "./utils";

interface ItemDetailDocumentationViewProps {
  editorFontSize: number;
  item: ItemWithTags;
  onInteraction?: () => void;
}

export const ItemDetailDocumentationView = ({
  editorFontSize,
  item,
  onInteraction,
}: ItemDetailDocumentationViewProps) => (
  <div className="h-full flex flex-col overflow-y-auto w-full" onPointerDown={onInteraction}>
    <div className="p-6 border-b border-border/40 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 line-clamp-1">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {item.type}
            </Badge>
            <h1 className="text-2xl font-bold leading-tight line-clamp-1">{item.title}</h1>
          </div>
          {item.description && <p className="text-muted-foreground">{item.description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex gap-1.5 flex-wrap">
          {item.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className={cn(getTagColorClass(tag.colorCode), "border")}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>

    <div className="flex-1 p-6 overflow-y-auto">
      <div className="rounded-xl bg-muted/30 overflow-hidden min-h-full">
        <CodeEditor
          value={item.content}
          readOnly={true}
          language={getLanguage(item.type)}
          fontSize={editorFontSize}
        />
      </div>
    </div>
  </div>
);
