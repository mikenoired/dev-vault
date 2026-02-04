import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { AiToolStatus, McpServerConfig } from "@/types";

const buildSnippet = (config: McpServerConfig | null) => {
  if (!config) return "";
  return `codex mcp add ${config.name} -- ${[config.command, ...config.args].join(" ")}`;
};

export const McpSection = () => {
  const [serverConfig, setServerConfig] = useState<McpServerConfig | null>(null);
  const [tools, setTools] = useState<AiToolStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snippet = useMemo(() => buildSnippet(serverConfig), [serverConfig]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [config, toolStatus] = await Promise.all([
        invoke<McpServerConfig>("get_mcp_server_config"),
        invoke<AiToolStatus[]>("list_ai_tools"),
      ]);
      setServerConfig(config);
      setTools(toolStatus);
    } catch (err) {
      setError("Не удалось загрузить статус MCP");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async (toolId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await invoke<AiToolStatus>("connect_mcp_server", { toolId });
      setTools((prev) => prev.map((tool) => (tool.id === updated.id ? updated : tool)));
    } catch (err) {
      setError("Не удалось подключить MCP");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium mb-2">MCP-сервер</h3>
        <p className="text-sm text-muted-foreground">
          Dev Vault предоставляет MCP-сервер в режиме только чтения. Подключение сейчас доступно
          только для Codex через CLI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация сервера</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {serverConfig ? (
            <div className="space-y-3">
              {!serverConfig.commandExists ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-xs">
                  MCP-бинарь не найден. В dev-режиме запусти `bun run dev:mcp` или
                  перезапусти `tauri dev`.
                </div>
              ) : null}
              <div className="text-sm">
                <div className="text-muted-foreground">Команда запуска</div>
                <div className="font-mono text-xs break-all">{serverConfig.command}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Аргументы</div>
                <div className="font-mono text-xs break-all">{serverConfig.args.join(" ")}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground mb-2">Команда подключения</div>
                <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 overflow-x-auto">
                  {snippet}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Конфигурация еще не готова</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Доступные агенты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <div className="text-sm text-red-500">{error}</div> : null}
          {tools.length === 0 && !isLoading ? (
            <div className="text-sm text-muted-foreground">Инструменты не обнаружены</div>
          ) : null}
          <div className="space-y-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between gap-4 border border-border rounded-md px-3 py-2"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tool.name}</span>
                    {tool.detected ? (
                      <Badge variant="secondary">Найден</Badge>
                    ) : (
                      <Badge variant="outline">Не найден</Badge>
                    )}
                    {tool.mcpInstalled ? <Badge>Подключен</Badge> : null}
                  </div>
                  {tool.configPath ? (
                    <div className="text-xs text-muted-foreground break-all">{tool.configPath}</div>
                  ) : null}
                  {tool.statusMessage ? (
                    <div className="text-xs text-muted-foreground">{tool.statusMessage}</div>
                  ) : null}
                  {!tool.detected ? (
                    <div className="text-xs text-muted-foreground">
                      Установите Codex CLI и убедитесь, что команда доступна в PATH.
                    </div>
                  ) : null}
                </div>
                <div>
                  {tool.supportsAutoConnect ? (
                    <Button
                      size="sm"
                      variant={tool.mcpInstalled ? "secondary" : "primary"}
                      onClick={() => handleConnect(tool.id)}
                      disabled={isLoading || !tool.detected}
                    >
                      {tool.mcpInstalled ? "Обновить" : "Подключить"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      Только вручную
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
