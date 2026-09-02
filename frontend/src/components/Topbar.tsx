import { Download, FilePlus2, FolderOpen, Redo2, Share2, Sparkles, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createBlankDesign } from "../lib/api";
import { exportImage } from "./Canvas";
import { useDesignStore } from "../store/useDesignStore";

export default function Topbar() {
  const design = useDesignStore((s) => s.design);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.history.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const setDesign = useDesignStore((s) => s.setDesign);
  const openGallery = useDesignStore((s) => s.openGallery);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function doExport(format: "png" | "jpeg", transparent: boolean) {
    const url = exportImage(format, transparent);
    if (!url) return;
    const ext = format === "jpeg" ? "jpg" : "png";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(design?.title || "design").replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    a.click();
    setExportOpen(false);
  }

  async function handleNew() {
    const blank = await createBlankDesign();
    setDesign(blank);
  }

  return (
    <header className="h-14 shrink-0 border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm flex items-center px-4 gap-3">
      <div className="flex items-center gap-2 pr-3 mr-1 border-r border-surface-700">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 flex items-center justify-center">
          <Sparkles size={15} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-surface-50 tracking-tight">Design Studio</span>
      </div>

      <input
        className="bg-transparent text-sm text-surface-100 font-medium px-2 py-1 rounded-md hover:bg-surface-800 focus-ring w-56 truncate"
        value={design?.title ?? "Untitled design"}
        onChange={(e) => {
          if (!design) return;
          useDesignStore.setState({ design: { ...design, title: e.target.value } });
        }}
      />

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          disabled={!canUndo}
          onClick={undo}
          className="w-8 h-8 rounded-md flex items-center justify-center text-surface-300 hover:bg-surface-800 hover:text-surface-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          disabled={!canRedo}
          onClick={redo}
          className="w-8 h-8 rounded-md flex items-center justify-center text-surface-300 hover:bg-surface-800 hover:text-surface-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-surface-700 mx-1" />

      <button
        onClick={handleNew}
        className="h-8 px-3 rounded-md flex items-center gap-1.5 text-sm text-surface-200 hover:bg-surface-800 hover:text-surface-50 transition-colors"
        title="New blank design"
      >
        <FilePlus2 size={14} />
        New
      </button>
      <button
        onClick={openGallery}
        className="h-8 px-3 rounded-md flex items-center gap-1.5 text-sm text-surface-200 hover:bg-surface-800 hover:text-surface-50 transition-colors"
        title="Open designs"
      >
        <FolderOpen size={14} />
        Designs
      </button>
      <button
        disabled
        title="Coming soon"
        className="h-8 px-3 rounded-md flex items-center gap-1.5 text-sm text-surface-500 cursor-not-allowed transition-colors"
      >
        <Share2 size={14} />
        Share
      </button>
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen((o) => !o)}
          className="h-8 px-3 rounded-md flex items-center gap-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors shadow-floating"
        >
          <Download size={14} />
          Export
        </button>
        {exportOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-lg border border-surface-700 bg-surface-900 shadow-floating p-1.5 z-50 animate-fade-in">
            {[
              { label: "PNG · white background", fmt: "png" as const, t: false },
              { label: "PNG · transparent", fmt: "png" as const, t: true },
              { label: "JPG", fmt: "jpeg" as const, t: false },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => doExport(opt.fmt, opt.t)}
                className="w-full text-left px-2.5 py-2 rounded-md text-xs text-surface-200 hover:bg-surface-800 hover:text-surface-50 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
