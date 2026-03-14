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
      headerClassName="border-b-0 pl-5 pr-3 py-3"
      bodyClassName="flex-1 p-0"
    >
      <div className="flex h-full min-h-0 gap-3 p-3">
        <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-muted/35 px-6 py-5">
          {renderSection()}
        </div>
      </div>
    </Modal>
  );
};
