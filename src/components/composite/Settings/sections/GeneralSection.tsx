import { useShallow } from "zustand/react/shallow";
import { Checkbox, Select } from "@/components/ui";
import { useSettingsStore } from "@/stores";
import type { Theme } from "@/types";

export const GeneralSection = () => {
  const [config, updateUiConfig] = useSettingsStore(
    useShallow((state) => [state.config, state.updateUiConfig]),
  );

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Основные настройки</h3>
        <div className="grid gap-4">
          <Select
            label="Тема оформления"
            value={config.ui.theme}
            onChange={(e) => updateUiConfig({ theme: e.target.value as Theme })}
            options={[
              { value: "dark", label: "Темная" },
              { value: "light", label: "Светлая" },
              { value: "system", label: "Системная" },
            ]}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="autosave-enabled"
              checked={config.ui.autosave_enabled}
              onCheckedChange={(checked) => updateUiConfig({ autosave_enabled: checked === true })}
            />
            <label htmlFor="autosave-enabled" className="text-sm font-medium leading-none">
              Автосохранение изменений
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
