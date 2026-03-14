import { useShallow } from "zustand/react/shallow";
import { Switch } from "@/components/ui";
import { useSettingsStore } from "@/stores";

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
          <Switch
            label="Автосохранение изменений"
            className="w-fit"
            checked={config.ui.autosave_enabled}
            onCheckedChange={(checked) => updateUiConfig({ autosave_enabled: checked })}
          />
        </div>
      </div>
    </div>
  );
};
