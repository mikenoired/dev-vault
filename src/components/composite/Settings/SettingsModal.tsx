import { useState } from "react";
import { useSettingsStore } from "../../../stores/settingsStore";
import { Modal } from "../../ui/Modal";
import { type SettingsSection, SettingsSidebar } from "./SettingsSidebar";
import { AppearanceSection } from "./sections/AppearanceSection";
import { DocumentationSection } from "./sections/DocumentationSection";
import { GeneralSection } from "./sections/GeneralSection";
import { SearchSection } from "./sections/SearchSection";

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
