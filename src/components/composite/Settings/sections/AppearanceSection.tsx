import { useSettingsStore } from "../../../../stores/settingsStore";
import { Input } from "../../../ui/Input";

export const AppearanceSection = () => {
  const config = useSettingsStore((state) => state.config);
  const updateUiConfig = useSettingsStore((state) => state.updateUiConfig);

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Внешний вид</h3>
        <div className="grid gap-4">
          <Input
            label="Размер шрифта в редакторе (px)"
            type="number"
            value={config.ui.editor_font_size}
            onChange={(e) => updateUiConfig({ editor_font_size: Number.parseInt(e.target.value) })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="compact-mode"
              checked={config.ui.compact_mode}
              onChange={(e) => updateUiConfig({ compact_mode: e.target.checked })}
              className="size-4 rounded border-input bg-background"
            />
            <label htmlFor="compact-mode" className="text-sm font-medium leading-none">
              Компактный режим списков
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

