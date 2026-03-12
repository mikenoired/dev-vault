import type { HTMLAttributes } from "react";
import { cn } from "@/components/ui";

type KbdProps = HTMLAttributes<HTMLElement>;

export const Kbd = ({ className, ...props }: KbdProps) => (
  <kbd
    className={cn(
      "inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-background px-2 font-mono text-[11px] font-medium text-foreground shadow-xs",
      className,
    )}
    {...props}
  />
);

export const KbdGroup = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("inline-flex flex-wrap items-center gap-1", className)} {...props} />
);
