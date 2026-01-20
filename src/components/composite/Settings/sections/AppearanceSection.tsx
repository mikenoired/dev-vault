import { toast } from "sonner";
import { Input } from "@/components/ui";
import {
  MAX_FONT_SIZE,
  MAX_READING_SPEED_WPM,
  MIN_FONT_SIZE,
  MIN_READING_SPEED_WPM,
} from "@/constants";
import { useSettingsStore } from "@/stores/settingsStore";
import type { UiConfig } from "@/types";

export const AppearanceSection = () => {
  const config = useSettingsStore((state) => state.config);
  const updateUiConfig = useSettingsStore((state) => state.updateUiConfig);

  const handleUpdate = (updater: (config: UiConfig) => UiConfig) => {
    if (!config) return;
    const newConfig = updater(config.ui);
    if (newConfig.editor_font_size < MIN_FONT_SIZE || newConfig.editor_font_size > MAX_FONT_SIZE) {
      toast.error(`Размер шрифта должен быть между ${MIN_FONT_SIZE} и ${MAX_FONT_SIZE}px`);
      return;
    }
    if (
      newConfig.reading_speed_wpm < MIN_READING_SPEED_WPM ||
      newConfig.reading_speed_wpm > MAX_READING_SPEED_WPM
    ) {
      toast.error(
        `Скорость чтения должна быть между ${MIN_READING_SPEED_WPM} и ${MAX_READING_SPEED_WPM} слов/мин`,
      );
      return;
    }
    updateUiConfig(newConfig);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Внешний вид</h3>
        <div className="grid gap-4">
          <Input
            label="Размер шрифта в редакторе (px)"
            type="number"
            value={config?.ui.editor_font_size ?? 0}
            onChange={(e) =>
              handleUpdate((prev) => ({
                ...prev,
                editor_font_size: Number.parseInt(e.target.value, 10),
              }))
            }
          />
          <Input
            label="Скорость чтения (слов/мин)"
            type="number"
            value={config?.ui.reading_speed_wpm ?? 0}
            onChange={(e) =>
              handleUpdate((prev) => ({
                ...prev,
                reading_speed_wpm: Number.parseInt(e.target.value, 10),
              }))
            }
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="compact-mode"
              checked={config?.ui.compact_mode ?? false}
              onChange={(e) =>
                handleUpdate((prev) => ({ ...prev, compact_mode: e.target.checked }))
              }
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
