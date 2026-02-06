import { type ElementType, forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/components/ui";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ElementType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium leading-none" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <Icon className="size-4 text-muted-foreground/50" />
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50",
              className,
              Icon && "pl-9",
              error && "border-red-500 focus-visible:ring-red-500",
            )}
            {...props}
          />
        </div>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
