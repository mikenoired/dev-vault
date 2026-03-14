import { X } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/utils";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  titleClassName?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  overlayClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  titleClassName,
  ...props
}: ModalProps) => {
  const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", className)}
      {...props}
    >
      <div
        className={cn("absolute inset-0 bg-black/30 backdrop-blur-xs", overlayClassName)}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-primary-foreground shadow-xl",
          contentClassName,
        )}
      >
        <div
          className={cn(
            "sticky top-0 flex items-center justify-between border-b border-border bg-primary-foreground px-6 py-4",
            headerClassName,
          )}
        >
          <h2 className={cn("text-xl font-semibold", titleClassName)}>{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className={cn("min-h-0 overflow-y-auto p-4", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
};
