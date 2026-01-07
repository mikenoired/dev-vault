import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarWidth: number;
  isSidebarVisible: boolean;
  lastSidebarWidth: number;
  minSidebarWidth: number;
  maxSidebarWidth: number;

  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSidebarVisibility: (visible: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarWidth: 320,
      isSidebarVisible: true,
      lastSidebarWidth: 320,
      minSidebarWidth: 200,
      maxSidebarWidth: 600,

      setSidebarWidth: (width) => {
        const { minSidebarWidth } = get();
        if (width < minSidebarWidth) {
          set({ isSidebarVisible: false, sidebarWidth: 0 });
        } else {
          set({ sidebarWidth: width, isSidebarVisible: true, lastSidebarWidth: width });
        }
      },

      toggleSidebar: () => {
        const { isSidebarVisible, lastSidebarWidth } = get();
        if (isSidebarVisible) {
          set({ isSidebarVisible: false, sidebarWidth: 0 });
        } else {
          set({ isSidebarVisible: true, sidebarWidth: lastSidebarWidth });
        }
      },

      setSidebarVisibility: (visible) => {
        const { lastSidebarWidth } = get();
        if (visible) {
          set({ isSidebarVisible: true, sidebarWidth: lastSidebarWidth });
        } else {
          set({ isSidebarVisible: false, sidebarWidth: 0 });
        }
      },
    }),
    {
      name: "dev-vault-ui-storage",
    },
  ),
);
