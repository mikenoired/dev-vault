import { Kbd, KbdGroup } from "@/components/ui";
import { formatShortcutParts, shortcutRegistry } from "@/lib/shortcuts";

const scopeLabels: Record<string, string> = {
  global: "Глобально",
  editor: "Редактор",
  search: "Поиск",
  dialog: "Диалоги",
};

export const ShortcutsSection = () => {
  const isMac = navigator.userAgent.toLowerCase().includes("mac");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-medium">Сочетания клавиш</h3>
        <p className="text-sm text-muted-foreground">
          Горячие клавиши пока доступны только для просмотра. Изменение раскладки добавим позже.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-background/55">
        <table className="w-full text-sm">
          <thead className="bg-accent/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Действие</th>
              <th className="px-4 py-3 font-medium">Сочетание</th>
              <th className="px-4 py-3 font-medium">Область</th>
            </tr>
          </thead>
          <tbody>
            {shortcutRegistry.map((shortcut) => (
              <tr
                key={shortcut.id}
                className="align-top odd:bg-background/20 even:bg-background/50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{shortcut.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{shortcut.description}</div>
                </td>
                <td className="px-4 py-3">
                  <KbdGroup>
                    {formatShortcutParts(shortcut.keys, isMac).map((key, index) => (
                      <div key={`${shortcut.id}-${key}`} className="flex items-center gap-1">
                        {index > 0 ? (
                          <span className="text-xs text-muted-foreground" aria-hidden="true">
                            +
                          </span>
                        ) : null}
                        <Kbd>{key}</Kbd>
                      </div>
                    ))}
                  </KbdGroup>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {scopeLabels[shortcut.scope] ?? shortcut.scope}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
