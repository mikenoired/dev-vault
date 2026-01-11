import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import type { AppConfig } from "@/types";

interface SettingsState {
  config: AppConfig | null;
  isSettingsOpen: boolean;
  isLoading: boolean;

  openSettings: () => void;
  closeSettings: () => void;
  loadConfig: () => Promise<void>;
  updateConfig: (updater: (config: AppConfig) => AppConfig) => Promise<void>;
  updateSearchConfig: (config: Partial<AppConfig["search"]>) => Promise<void>;
  updateUiConfig: (config: Partial<AppConfig["ui"]>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  isSettingsOpen: false,
  isLoading: false,

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  loadConfig: async () => {
    set({ isLoading: true });
    try {
      const config = await invoke<AppConfig>("get_config");
      set({ config, isLoading: false });
    } catch (error) {
      console.error("Failed to load config:", error);
      set({ isLoading: false });
    }
  },

  updateConfig: async (updater) => {
    const currentConfig = get().config;
    if (!currentConfig) return;

    const newConfig = updater(currentConfig);
    set({ config: newConfig });

    try {
      await invoke("save_config", { config: newConfig });
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  },

  updateSearchConfig: async (searchConfig) => {
    await get().updateConfig((prev) => ({
      ...prev,
      search: { ...prev.search, ...searchConfig },
    }));
  },

  updateUiConfig: async (uiConfig) => {
    await get().updateConfig((prev) => ({
      ...prev,
      ui: { ...prev.ui, ...uiConfig },
    }));
  },
}));

useSettingsStore.getState().loadConfig();
