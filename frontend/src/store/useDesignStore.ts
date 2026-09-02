import { create } from "zustand";
import { Design, Layer } from "../lib/types";

interface DesignStore {
  design: Design | null;
  selectedLayerId: string | null;
  isGenerating: boolean;
  progressLabel: string;
  history: Design[]; // undo stack (pre-change snapshots)
  future: Design[]; // redo stack
  galleryOpen: boolean;

  setDesign: (d: Design) => void;
  setGenerating: (v: boolean, label?: string) => void;
  selectLayer: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateLayerProps: (id: string, props: Record<string, any>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setLayerOrder: (orderedIds: string[]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  openGallery: () => void;
  closeGallery: () => void;
}

const snapshot = (d: Design) => JSON.parse(JSON.stringify(d)) as Design;

export const useDesignStore = create<DesignStore>((set, get) => ({
  design: null,
  selectedLayerId: null,
  isGenerating: false,
  progressLabel: "",
  history: [],
  future: [],
  galleryOpen: false,

  setDesign: (d) => set({ design: d, selectedLayerId: null }),

  setGenerating: (v, label = "") => set({ isGenerating: v, progressLabel: label }),

  selectLayer: (id) => set({ selectedLayerId: id }),

  updateLayer: (id, patch) =>
    set((state) => {
      if (!state.design) return state;
      const layers = state.design.layers_json.map((l) => (l.id === id ? { ...l, ...patch } : l));
      return { design: { ...state.design, layers_json: layers } };
    }),

  updateLayerProps: (id, props) =>
    set((state) => {
      if (!state.design) return state;
      const layers = state.design.layers_json.map((l) =>
        l.id === id ? { ...l, props: { ...l.props, ...props } } : l
      );
      return { design: { ...state.design, layers_json: layers } };
    }),

  removeLayer: (id) => {
    get().pushHistory();
    set((state) => {
      if (!state.design) return state;
      const layers = state.design.layers_json.filter((l) => l.id !== id);
      return {
        design: { ...state.design, layers_json: layers },
        selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      };
    });
  },

  duplicateLayer: (id) => {
    get().pushHistory();
    set((state) => {
      if (!state.design) return state;
      const src = state.design.layers_json.find((l) => l.id === id);
      if (!src) return state;
      const copy: Layer = {
        ...JSON.parse(JSON.stringify(src)),
        id: `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        x: src.x + 24,
        y: src.y + 24,
        z_index: state.design.layers_json.length,
      };
      return { design: { ...state.design, layers_json: [...state.design.layers_json, copy] } };
    });
  },

  toggleVisibility: (id) => {
    get().pushHistory();
    set((state) => {
      if (!state.design) return state;
      const layers = state.design.layers_json.map((l) =>
        l.id === id ? { ...l, visible: l.visible === false ? true : false } : l
      );
      return { design: { ...state.design, layers_json: layers } };
    });
  },

  toggleLock: (id) => {
    get().pushHistory();
    set((state) => {
      if (!state.design) return state;
      const layers = state.design.layers_json.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l
      );
      return { design: { ...state.design, layers_json: layers } };
    });
  },

  setLayerOrder: (orderedIds) => {
    get().pushHistory();
    set((state) => {
      if (!state.design) return state;
      const byId = new Map(state.design.layers_json.map((l) => [l.id, l]));
      const reordered = orderedIds
        .map((id, i) => {
          const l = byId.get(id);
          return l ? { ...l, z_index: i } : null;
        })
        .filter(Boolean) as Layer[];
      return { design: { ...state.design, layers_json: reordered } };
    });
  },

  pushHistory: () =>
    set((state) => {
      if (!state.design) return state;
      return {
        history: [...state.history.slice(-19), snapshot(state.design)],
        future: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0 || !state.design) return state;
      const prev = state.history[state.history.length - 1];
      return {
        design: prev,
        history: state.history.slice(0, -1),
        future: [...state.future, snapshot(state.design)],
        selectedLayerId: null,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0 || !state.design) return state;
      const next = state.future[state.future.length - 1];
      return {
        design: next,
        future: state.future.slice(0, -1),
        history: [...state.history, snapshot(state.design)],
        selectedLayerId: null,
      };
    }),

  canUndo: () => get().history.length > 0,
  canRedo: () => get().future.length > 0,

  openGallery: () => set({ galleryOpen: true }),
  closeGallery: () => set({ galleryOpen: false }),
}));
