import {
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  LightbulbIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";

interface AdmonitionBlockProps {
  type: string;
  children: ReactNode;
}

const typeStyles: Record<string, { labelColor: string; bg: string; icon: ReactNode }> = {
  info: {
    labelColor: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: <InfoIcon className="size-4" />,
  },
  warning: {
    labelColor: "text-yellow-500",
    bg: "bg-yellow-500/10",
    icon: <AlertTriangleIcon className="size-4" />,
  },
  error: {
    labelColor: "text-red-500",
    bg: "bg-red-500/10",
    icon: <XIcon className="size-4" />,
  },
  success: {
    labelColor: "text-green-500",
    bg: "bg-green-500/10",
    icon: <CheckIcon className="size-4" />,
  },
  note: {
    labelColor: "text-purple-500",
    bg: "bg-neutral-500/10",
    icon: <PencilIcon className="size-4" />,
  },
  tip: {
    labelColor: "text-purple-500",
    bg: "bg-purple-500/10",
    icon: <LightbulbIcon className="size-4" />,
  },
};

export default function AdmonitionBlock({ type, children }: AdmonitionBlockProps) {
  const style = typeStyles[type.toLowerCase()] || typeStyles.note;
  const displayType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

  return (
    <div className={`rounded-lg ${style.bg} p-5`}>
      <div className="flex items-start flex-col gap-2">
        <div className={cn("flex items-center gap-2", style.labelColor)}>
          {style.icon}
          <span className="font-semibold text-sm">{displayType}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-neutral-300 prose prose-invert prose-neutral max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
