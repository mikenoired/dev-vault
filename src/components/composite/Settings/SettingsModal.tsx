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
      // case "search":
      //   return <SearchSection />;
      case "documentation":
        return <DocumentationSection />;
      case "mcp":
        return <McpSection />;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeSettings} title="Настройки">
      <div className="flex gap-6 min-h-100">
        <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 overflow-y-auto pr-2">{renderSection()}</div>
      </div>
    </Modal>
  );
};
