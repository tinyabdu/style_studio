import { useEffect, useRef } from "react";
import Canvas, { captureThumbnail } from "./components/Canvas";
import DesignGallery from "./components/DesignGallery";
import RightPanel from "./components/RightPanel";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { updateDesign, uploadThumbnail } from "./lib/api";
import { useDesignStore } from "./store/useDesignStore";

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function App() {
  const design = useDesignStore((s) => s.design);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounced autosave whenever the design changes
  useEffect(() => {
    if (!design) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const hasContent = design.layers_json.length > 0;
      updateDesign(design.id, {
        title: design.title,
        layers_json: design.layers_json,
      })
        .then(async () => {
          if (!hasContent) return;
          const thumb = captureThumbnail();
          if (thumb) {
            const url = await uploadThumbnail(thumb);
            await updateDesign(design.id, { thumbnail_url: url });
          }
        })
        .catch(() => {
          // non-fatal — backend may not be reachable yet
        });
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [design]);

  // global keyboard shortcuts for canvas editing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      const store = useDesignStore.getState();
      const id = store.selectedLayerId;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        if (!id) return;
        e.preventDefault();
        store.duplicateLayer(id);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!id) return;
        e.preventDefault();
        store.removeLayer(id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-950 text-surface-50 overflow-hidden">
      <Topbar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <Canvas />
        <RightPanel />
      </div>
      <DesignGallery />
    </div>
  );
}
