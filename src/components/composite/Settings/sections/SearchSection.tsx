import { Input } from "@/components/ui";
import { useSettingsStore } from "@/stores/settingsStore";

export const SearchSection = () => {
  const config = useSettingsStore((state) => state.config);
  const updateSearchConfig = useSettingsStore((state) => state.updateSearchConfig);

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Настройки поиска</h3>
        <div className="grid gap-6">
          <div className="space-y-2">
            <label htmlFor="fts-weight-range" className="text-sm font-medium">
              Баланс весов (FTS / Semantic)
            </label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                FTS: {Math.round(config.search.fts_weight * 100)}%
              </span>
              <input
                id="fts-weight-range"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.search.fts_weight}
                onChange={(e) => {
                  const fts = Number.parseFloat(e.target.value);
                  updateSearchConfig({
                    fts_weight: fts,
                    semantic_weight: Number.parseFloat((1 - fts).toFixed(1)),
                  });
                }}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                AI: {Math.round(config.search.semantic_weight * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              FTS лучше находит точные вхождения, AI — смысл и похожие концепции.
            </p>
          </div>

          <Input
            label="Лимит результатов"
            type="number"
            value={config.search.results_limit}
            onChange={(e) => updateSearchConfig({ results_limit: Number.parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};
