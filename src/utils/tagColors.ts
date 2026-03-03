import { cn } from "@/components/ui";

const TAG_COLOR_CLASS_MAP = [
  "border-red-400/35 bg-red-500/15 text-red-200",
  "border-orange-400/35 bg-orange-500/15 text-orange-200",
  "border-amber-400/35 bg-amber-500/15 text-amber-200",
  "border-yellow-400/35 bg-yellow-500/15 text-yellow-100",
  "border-lime-400/35 bg-lime-500/15 text-lime-200",
  "border-green-400/35 bg-green-500/15 text-green-200",
  "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
  "border-cyan-400/35 bg-cyan-500/15 text-cyan-200",
  "border-sky-400/35 bg-sky-500/15 text-sky-200",
  "border-blue-400/35 bg-blue-500/15 text-blue-200",
  "border-indigo-400/35 bg-indigo-500/15 text-indigo-200",
  "border-purple-400/35 bg-purple-500/15 text-purple-200",
] as const;

export const TAG_COLOR_CODE_COUNT = TAG_COLOR_CLASS_MAP.length;

export const getTagColorClass = (colorCode: number, fallback = "") => {
  const normalized = Number.isInteger(colorCode) ? colorCode : 0;
  const index = ((normalized % TAG_COLOR_CLASS_MAP.length) + TAG_COLOR_CLASS_MAP.length)
    % TAG_COLOR_CLASS_MAP.length;
  return cn(TAG_COLOR_CLASS_MAP[index], fallback);
};
