import { Plus } from "lucide-react";
import { TabItem } from "@/components/composite/Tabs/TabItem";
import { Button } from "@/components/ui/Button";
import { useTabsStore } from "@/stores/tabsStore";

export const TabManager = () => {
  const { tabs, activeTabId, openNewTab } = useTabsStore();

  return (
    <div className="flex items-center h-full w-full overflow-hidden bg-card">
      <div className="flex items-center h-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} isActive={activeTabId === tab.id} />
        ))}
        <div className="px-2 border-r border-border h-full flex items-center bg-card shrink-0">
          <Button onClick={openNewTab} variant="ghost" size="iconSmall" className="hover:bg-accent">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      <div data-tauri-drag-region className="flex-1 shrink-0 h-full" />
    </div>
  );
};
