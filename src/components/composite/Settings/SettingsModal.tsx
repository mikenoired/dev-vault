import { X } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  type SettingsSection,
  SettingsSidebar,
} from "@/components/composite/Settings/SettingsSidebar";
import {
  AppearanceSection,
  DocumentationSection,
  GeneralSection,
  McpSection,
  SearchSection,
  ShortcutsSection,
} from "@/components/composite/Settings/sections";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSettingsStore } from "@/stores";

export const SettingsModal = () => {
  const [isOpen, closeSettings] = useSettingsStore(
    useShallow((state) => [state.isSettingsOpen, state.closeSettings]),
  );
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSection />;
      case "appearance":
        return <AppearanceSection />;
      case "search":
        return <SearchSection />;
      case "shortcuts":
        return <ShortcutsSection />;
      case "documentation":
        return <DocumentationSection />;
      case "mcp":
        return <McpSection />;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeSettings}
      title="Настройки"
      contentClassName="max-w-5xl h-[min(86vh,760px)] rounded-2xl border-none shadow-2xl"
      headerClassName="hidden"
      bodyClassName="flex-1 p-0"
    >
      <div className="flex h-full min-h-0 gap-3 pl-3">
        <Button
          variant="ghost"
          size="iconSmall"
          onClick={closeSettings}
          className="text-muted-foreground hover:text-foreground transition-colors absolute top-3 right-3"
          aria-label="Закрыть"
        >
          <X className="size-4" />
        </Button>
        <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 min-h-0 overflow-y-auto bg-muted/35 px-6 py-5">
          {renderSection()}
        </div>
      </div>
    </Modal>
  );
};
