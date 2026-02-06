import * as Tooltip from "@radix-ui/react-tooltip";
import { BookOpenIcon, Clipboard, ClockIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/stores/settingsStore";
import calculateReadingTime from "@/utils/readTime";

interface StatusBarProps {
  content: string;
}

export default function StatusBar({ content }: StatusBarProps) {
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
      <div className="w-full p-0.5 bg-primary-foreground border-t border-border flex items-center justify-between min-h-8">
        <div>
          <Tooltip.Root>
            <Tooltip.Trigger
              onClick={(event) => event.preventDefault()}
              onPointerDown={(event) => event.preventDefault()}
            >
              <Button size="iconSmall" variant="ghost" onClick={handleCopy}>
                <Clipboard className="w-4 h-4 text-neutral-400" />
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
                {isCopied ? "Copied to clipboard" : "Copy to clipboard"}
                <Tooltip.Arrow className="fill-border" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
        <div className="flex items-center gap-4 pr-4">
          <span className="flex items-center gap-1 text-sm text-neutral-500">
            <ClockIcon className="w-4 h-4 text-neutral-400" />
            {minutes} мин.
          </span>
          <span className="flex items-center gap-1 text-sm text-neutral-500">
            <BookOpenIcon className="w-4 h-4 text-neutral-400" />
            {words} слов
          </span>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
