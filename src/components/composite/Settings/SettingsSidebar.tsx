import { Book, Keyboard, Palette, Plug, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";

export type SettingsSection =
  | "general"
  | "appearance"
  | "search"
  | "shortcuts"
  | "documentation"
  | "mcp";

interface SidebarItemProps {
  id: SettingsSection;
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: (id: SettingsSection) => void;
}

type SidebarItem = Omit<SidebarItemProps, "onClick" | "isActive">;

const sidebarItems: SidebarItem[] = [
  { id: "general", label: "Общие", icon: <Settings size={16} /> },
  { id: "appearance", label: "Внешний вид", icon: <Palette size={16} /> },
  { id: "search", label: "Поиск", icon: <Search size={16} /> },
  { id: "shortcuts", label: "Сочетания клавиш", icon: <Keyboard size={16} /> },
  { id: "documentation", label: "Документация", icon: <Book size={16} /> },
  { id: "mcp", label: "MCP", icon: <Plug size={16} /> },
];

const SidebarItem = ({ id, label, icon, isActive, onClick }: SidebarItemProps) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export const SettingsSidebar = ({ activeSection, onSectionChange }: SettingsSidebarProps) => {
  return (
    <div className="w-52 shrink-0 rounded-2xl flex flex-col gap-1 bg-muted/35 p-2">
      {sidebarItems.map((item) => (
        <SidebarItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          isActive={activeSection === item.id}
          onClick={onSectionChange}
        />
      ))}
    </div>
  );
};
