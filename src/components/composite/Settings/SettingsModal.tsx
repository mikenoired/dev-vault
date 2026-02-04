import { useState } from "react";
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
} from "@/components/composite/Settings/sections";
import { Modal } from "@/components/ui/Modal";
import { useSettingsStore } from "@/stores/settingsStore";

export const SettingsModal = () => {
  const isOpen = useSettingsStore((state) => state.isSettingsOpen);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSection />;
      case "appearance":
        return <AppearanceSection />;
      case "search":
        return <SearchSection />;
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
      <div className="flex gap-6 min-h-[400px]">
        <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 overflow-y-auto pr-2">{renderSection()}</div>
      </div>
    </Modal>
  );
};
