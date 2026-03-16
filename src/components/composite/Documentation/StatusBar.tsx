import * as Tooltip from "@radix-ui/react-tooltip";
import { BookOpenIcon, Clipboard, ClockIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/stores";
import calculateReadingTime from "@/utils/readTime";

interface StatusBarProps {
  content: string;
  markdownViewMode?: "source" | "live";
  onMarkdownViewModeChange?: (mode: "source" | "live") => void;
}

export default function StatusBar({
  content,
  markdownViewMode,
  onMarkdownViewModeChange,
}: StatusBarProps) {
  const readingSpeed = useSettingsStore((state) => state.config?.ui.reading_speed_wpm ?? 200);
  const { words, minutes } = calculateReadingTime(content, readingSpeed);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [content]);

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="w-full">
        <div className="flex min-h-10 items-center justify-between gap-3 px-1 py-1">
          <div className="flex items-center gap-1">
            <Tooltip.Root>
              <Tooltip.Trigger
                onClick={(event) => event.preventDefault()}
                onPointerDown={(event) => event.preventDefault()}
              >
                <Button
                  className="rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  size="iconSmall"
                  variant="ghost"
                  onClick={handleCopy}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-card border border-border px-3 py-2 rounded-md shadow-lg text-sm text-foreground"
                  sideOffset={5}
                  onPointerDownOutside={(event) => {
                    event.preventDefault();
                  }}
                >
                  {isCopied ? "Скопировано" : "Скопировать"}
                  <Tooltip.Arrow className="fill-border" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground sm:text-sm">
              <ClockIcon className="h-4 w-4" />
              {minutes} мин.
            </span>
            <span className="hidden items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground sm:flex sm:text-sm">
              <BookOpenIcon className="h-4 w-4" />
              {words} слов
            </span>
            {onMarkdownViewModeChange && markdownViewMode && (
              <div className="flex items-center rounded-md border border-border/50 bg-accent/20 p-0.5">
                <button
                  type="button"
                  onClick={() => onMarkdownViewModeChange("source")}
                  className={cn(
                    "cursor-pointer rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors",
                    markdownViewMode === "source"
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Source
                </button>
                <button
                  type="button"
                  onClick={() => onMarkdownViewModeChange("live")}
                  className={cn(
                    "cursor-pointer rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors",
                    markdownViewMode === "live"
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Live
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
