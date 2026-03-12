import type { HotkeyConfig } from "@/hooks/useHotkey";
import shortcutsData from "@/shared/shortcuts.json";

type ShortcutScope = "global" | "editor" | "search" | "dialog";

export interface ShortcutDefinition {
  id: string;
  category: string;
  label: string;
  description: string;
  scope: ShortcutScope;
  keys: string[];
  frontend?: HotkeyConfig;
  menuItemId?: string;
  tauriAccelerator?: string;
}

const shortcuts = shortcutsData as ShortcutDefinition[];
const shortcutMap = new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut]));

const isMacPlatform = () => navigator.userAgent.toLowerCase().includes("mac");

const platformKeyMap: Record<string, { mac: string; other: string }> = {
  Mod: { mac: "Cmd", other: "Ctrl" },
  Alt: { mac: "Option", other: "Alt" },
  Meta: { mac: "Cmd", other: "Meta" },
};

export const shortcutRegistry = shortcuts;

export const getShortcut = (id: string) => shortcutMap.get(id);

export const getShortcutHotkey = (id: string): HotkeyConfig => {
  const shortcut = getShortcut(id);
  if (!shortcut?.frontend) {
    throw new Error(`Shortcut "${id}" does not have a frontend config.`);
  }

  return shortcut.frontend;
};

export const formatShortcutParts = (keys: string[], isMac = isMacPlatform()) =>
  keys.map((key) => {
    const mapped = platformKeyMap[key];
    if (!mapped) return key;
    return isMac ? mapped.mac : mapped.other;
  });

export const formatShortcutKeys = (keys: string[], isMac = isMacPlatform()) =>
  formatShortcutParts(keys, isMac).join(" + ");
