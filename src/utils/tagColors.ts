import { cn } from "@/components/ui";

const TAG_COLOR_CLASS_MAP = [
  "border-red-300 bg-red-500/10 text-red-700 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-200",
  "border-orange-300 bg-orange-500/10 text-orange-700 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-200",
  "border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200",
  "border-yellow-300 bg-yellow-500/10 text-yellow-700 dark:border-yellow-400/35 dark:bg-yellow-500/15 dark:text-yellow-100",
  "border-lime-300 bg-lime-500/10 text-lime-700 dark:border-lime-400/35 dark:bg-lime-500/15 dark:text-lime-200",
  "border-green-300 bg-green-500/10 text-green-700 dark:border-green-400/35 dark:bg-green-500/15 dark:text-green-200",
  "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200",
  "border-cyan-300 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/35 dark:bg-cyan-500/15 dark:text-cyan-200",
  "border-sky-300 bg-sky-500/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-200",
  "border-blue-300 bg-blue-500/10 text-blue-700 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200",
  "border-indigo-300 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/35 dark:bg-indigo-500/15 dark:text-indigo-200",
  "border-violet-300 bg-violet-500/10 text-violet-700 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-200",
] as const;

export const TAG_COLOR_CODE_COUNT = TAG_COLOR_CLASS_MAP.length;

export const getTagColorClass = (colorCode: number, fallback = "") => {
  const normalized = Number.isInteger(colorCode) ? colorCode : 0;
  const index =
    ((normalized % TAG_COLOR_CLASS_MAP.length) + TAG_COLOR_CLASS_MAP.length) %
    TAG_COLOR_CLASS_MAP.length;
  return cn(TAG_COLOR_CLASS_MAP[index], fallback);
};
