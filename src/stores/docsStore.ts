import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { tauriService } from "@/services/tauri";
import type {
  AvailableDocumentation,
  DocEntry,
  DocTreeNode,
  Documentation,
  ScrapeProgress,
} from "@/types";

interface DocsState {
  availableDocs: AvailableDocumentation[];
  installedDocs: Documentation[];
  selectedDoc: Documentation | null;
  docTree: DocTreeNode[];
  selectedEntry: DocEntry | null;
  isLoading: boolean;
  isInstalling: boolean;
  error: string | null;
  installProgress: ScrapeProgress | null;
  updateProgress: ScrapeProgress | null;

  loadAvailableDocs: () => Promise<void>;
  loadInstalledDocs: () => Promise<void>;
  installDoc: (name: string) => Promise<void>;
  updateDoc: (docId: number) => Promise<void>;
  deleteDoc: (docId: number) => Promise<void>;
  selectDoc: (doc: Documentation | null) => void;
  loadDocTree: (docId: number) => Promise<void>;
  loadDocChildren: (docId: number, parentPath: string) => Promise<void>;
  loadDocEntry: (docId: number, path: string) => Promise<void>;
  clearSelectedEntry: () => void;
}

export const useDocsStore = create<DocsState>((set, get) => {
  // Настраиваем слушатели событий при создании store
  if (typeof window !== "undefined") {
    // Слушатель прогресса установки
    listen<ScrapeProgress>("doc-install-progress", (event) => {
      console.log("[DocsStore] 📊 Install progress:", event.payload);
      set({ installProgress: event.payload });
    }).catch((err) => {
      console.error("[DocsStore] Failed to listen to doc-install-progress:", err);
    });

    // Слушатель завершения установки
    listen<Documentation>("doc-install-complete", (event) => {
      console.log("[DocsStore] ✓ Install complete:", event.payload);
      set({ installProgress: null, isInstalling: false });
      const { installedDocs } = get();
      set({ installedDocs: [...installedDocs, event.payload] });
    }).catch((err) => {
      console.error("[DocsStore] Failed to listen to doc-install-complete:", err);
    });

    // Слушатель ошибки установки
    listen<string>("doc-install-error", (event) => {
      console.error("[DocsStore] ✗ Install error:", event.payload);
      set({ installProgress: null, isInstalling: false, error: event.payload });
    }).catch((err) => {
      console.error("[DocsStore] Failed to listen to doc-install-error:", err);
    });

    // Слушатель прогресса обновления
    listen<ScrapeProgress>("doc-update-progress", (event) => {
      console.log("[DocsStore] 📊 Update progress:", event.payload);
      set({ updateProgress: event.payload });
    }).catch((err) => {
      console.error("[DocsStore] Failed to listen to doc-update-progress:", err);
    });

    // Слушатель завершения обновления
    listen<Documentation>("doc-update-complete", (event) => {
      console.log("[DocsStore] ✓ Update complete:", event.payload);
      set({ updateProgress: null });
      const { installedDocs } = get();
      const newDocs = installedDocs.map((doc) =>
        doc.id === event.payload.id ? event.payload : doc,
      );
      set({ installedDocs: newDocs });
    }).catch((err) => {
      console.error("[DocsStore] Failed to listen to doc-update-complete:", err);
    });

    // Слушатель ошибки обновления
    listen<string>("doc-update-error", (event) => {
      console.error("[DocsStore] ✗ Update error:", event.payload);
      set({ updateProgress: null, error: event.payload });
    }).catch((err) => {
      console.error("[DocsStore] Failed to listen to doc-update-error:", err);
    });
  }

  return {
    availableDocs: [],
    installedDocs: [],
    selectedDoc: null,
    docTree: [],
    selectedEntry: null,
    isLoading: false,
    isInstalling: false,
    error: null,
    installProgress: null,
    updateProgress: null,

    loadAvailableDocs: async () => {
      console.log(`[DocsStore] 📋 Loading available docs...`);
      set({ isLoading: true, error: null });
      try {
        const docs = await tauriService.listAvailableDocs();
        console.log(`[DocsStore] ✓ Loaded ${docs.length} available docs:`, docs);
        set({ availableDocs: docs });
      } catch (error) {
        console.error(`[DocsStore] ✗ Failed to load available docs:`, error);
        set({ error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    loadInstalledDocs: async () => {
      console.log(`[DocsStore] 📋 Loading installed docs...`);
      set({ isLoading: true, error: null });
      try {
        const docs = await tauriService.listInstalledDocs();
        console.log(`[DocsStore] ✓ Loaded ${docs.length} installed docs:`, docs);
        set({ installedDocs: docs });
      } catch (error) {
        console.error(`[DocsStore] ✗ Failed to load installed docs:`, error);
        set({ error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    installDoc: async (name: string) => {
      console.log(`[DocsStore] 📥 Starting installation of '${name}'`);
      set({ isInstalling: true, error: null, installProgress: null });
      try {
        console.log(`[DocsStore] → Calling Tauri backend...`);
        const doc = await tauriService.installDocumentation(name);
        console.log(`[DocsStore] ✓ Installation successful:`, doc);

        // Обновление состояния произойдет через событие doc-install-complete
        // Но если событие не пришло, обновим вручную
        const { installedDocs } = get();
        if (!installedDocs.some((d) => d.id === doc.id)) {
          set({ installedDocs: [...installedDocs, doc] });
        }
        console.log(`[DocsStore] ✓ State updated, now ${installedDocs.length + 1} docs installed`);
      } catch (error) {
        console.error(`[DocsStore] ✗ Installation failed:`, error);
        set({ error: (error as Error).message, installProgress: null });
        throw error;
      } finally {
        set({ isInstalling: false });
        console.log(`[DocsStore] Installation process finished`);
      }
    },

    updateDoc: async (docId: number) => {
      console.log(`[DocsStore] 🔄 Starting update for doc_id: ${docId}`);
      set({ isLoading: true, error: null, updateProgress: null });
      try {
        console.log(`[DocsStore] → Calling Tauri backend to update...`);
        const updatedDoc = await tauriService.updateDocumentation(docId);
        console.log(`[DocsStore] ✓ Update successful:`, updatedDoc);

        // Обновление состояния произойдет через событие doc-update-complete
        // Но если событие не пришло, обновим вручную
        const { installedDocs } = get();
        const newDocs = installedDocs.map((doc) => (doc.id === docId ? updatedDoc : doc));
        set({ installedDocs: newDocs });
        console.log(`[DocsStore] ✓ State updated with new version`);
      } catch (error) {
        console.error(`[DocsStore] ✗ Update failed:`, error);
        set({ error: (error as Error).message, updateProgress: null });
        throw error;
      } finally {
        set({ isLoading: false });
        console.log(`[DocsStore] Update process finished`);
      }
    },

    deleteDoc: async (docId: number) => {
      console.log(`[DocsStore] 🗑️  Starting deletion for doc_id: ${docId}`);
      set({ isLoading: true, error: null });
      try {
        console.log(`[DocsStore] → Calling Tauri backend to delete...`);
        await tauriService.deleteDocumentation(docId);
        console.log(`[DocsStore] ✓ Deletion successful`);

        const { installedDocs } = get();
        const newDocs = installedDocs.filter((doc) => doc.id !== docId);
        set({
          installedDocs: newDocs,
          selectedDoc: null,
          docTree: [],
        });
        console.log(`[DocsStore] ✓ State updated, now ${newDocs.length} docs installed`);
      } catch (error) {
        console.error(`[DocsStore] ✗ Deletion failed:`, error);
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ isLoading: false });
        console.log(`[DocsStore] Deletion process finished`);
      }
    },

    selectDoc: (doc: Documentation | null) => {
      set({ selectedDoc: doc, selectedEntry: null });
      if (doc) {
        get().loadDocTree(doc.id);
      } else {
        set({ docTree: [] });
      }
    },

    loadDocTree: async (docId: number) => {
      set({ isLoading: true, error: null });
      try {
        // Загружаем только корневой уровень (без parentPath)
        const tree = await tauriService.getDocTree(docId);
        set({ docTree: tree });
      } catch (error) {
        set({ error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    loadDocChildren: async (docId: number, parentPath: string) => {
      try {
        const children = await tauriService.getDocTree(docId, parentPath);

        const updateChildrenRecursive = (nodes: DocTreeNode[]): DocTreeNode[] => {
          return nodes.map((node) => {
            if (node.path === parentPath) {
              return { ...node, children };
            }
            if (node.children && node.children.length > 0) {
              return { ...node, children: updateChildrenRecursive(node.children) };
            }
            return node;
          });
        };

        set((state) => ({
          docTree: updateChildrenRecursive(state.docTree),
        }));
      } catch (error) {
        console.error(`[DocsStore] Failed to load children for ${parentPath}:`, error);
      }
    },

    loadDocEntry: async (docId: number, path: string) => {
      set({ isLoading: true, error: null });
      try {
        const entry = await tauriService.getDocEntryByPath(docId, path);
        set({ selectedEntry: entry });
      } catch (error) {
        set({ error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    clearSelectedEntry: () => {
      set({ selectedEntry: null });
    },
  };
});
