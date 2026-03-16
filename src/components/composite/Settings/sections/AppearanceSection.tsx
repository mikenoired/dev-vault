import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Input, Select, Switch } from "@/components/ui";
import {
  MAX_FONT_SIZE,
  MAX_READING_SPEED_WPM,
  MIN_FONT_SIZE,
  MIN_READING_SPEED_WPM,
} from "@/constants";
import { useSettingsStore } from "@/stores";
import type { Theme, UiConfig } from "@/types";

export const AppearanceSection = () => {
  const [config, updateUiConfig] = useSettingsStore(
    useShallow((state) => [state.config, state.updateUiConfig]),
  );

  if (!config) return null;

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
          <Switch
            label="Компактный режим списков"
            className="w-fit px-0"
            checked={config?.ui.compact_mode ?? false}
            onCheckedChange={(checked) =>
              handleUpdate((prev) => ({ ...prev, compact_mode: checked }))
            }
          />
          <Switch
            label="Live Preview Markdown для заметок"
            className="w-fit px-0"
            checked={config?.ui.markdown_live_preview ?? true}
            onCheckedChange={(checked) =>
              handleUpdate((prev) => ({ ...prev, markdown_live_preview: checked }))
            }
          />
        </div>
      </div>
    </div>
  );
};
