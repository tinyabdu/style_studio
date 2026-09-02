import { FilePlus2, Image as ImageIcon, Layers, Loader2, Sparkles, Type, Shapes as ShapesIcon } from "lucide-react";
import { useRef, useState } from "react";
import { createBlankDesign, uploadAsset } from "../lib/api";
import { SHAPE_OPTIONS } from "../lib/shapes";
import LayersPanel from "./LayersPanel";
import PromptBar from "./PromptBar";
import { useDesignStore } from "../store/useDesignStore";

type Tab = "generate" | "layers" | "elements";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "generate", label: "Generate", icon: Sparkles },
  { key: "layers", label: "Layers", icon: Layers },
  { key: "elements", label: "Elements", icon: ShapesIcon },
];

export default function Sidebar() {
  const [tab, setTab] = useState<Tab>("generate");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const design = useDesignStore((s) => s.design);
  const setDesign = useDesignStore((s) => s.setDesign);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const onAddText = () => window.dispatchEvent(new Event("studio:add-text"));
  const onAddShape = (shape: string) => {
    window.dispatchEvent(new CustomEvent("studio:add-shape", { detail: shape }));
    setShapeMenuOpen(false);
  };

  async function handleBlank() {
    const blank = await createBlankDesign();
    setDesign(blank);
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadAsset(file);
      window.dispatchEvent(new CustomEvent("studio:add-image", { detail: url }));
    } catch {
      alert("Upload failed — check that the backend is running.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <aside className="w-72 shrink-0 border-r border-surface-700 bg-surface-900 flex flex-col">
      <div className="flex items-center gap-0.5 p-1.5 border-b border-surface-700">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                active ? "bg-surface-800 text-surface-50" : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/60"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "generate" && (
        <div className="flex-1 flex flex-col justify-end">
          {!design && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-fuchsia-500/20 flex items-center justify-center">
                <Sparkles size={20} className="text-accent" />
              </div>
              <p className="text-sm text-surface-200 font-medium">Start with a prompt</p>
              <p className="text-xs text-surface-400 leading-relaxed">
                Describe what you want to design below — the AI plans the layout, generates
                imagery, and hands you fully editable layers.
              </p>
              <button
                onClick={handleBlank}
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-600 hover:border-accent/50 hover:bg-surface-800 text-xs text-surface-200 transition-colors"
              >
                <FilePlus2 size={13} /> Or start from blank
              </button>
            </div>
          )}
          <PromptBar />
        </div>
      )}

      {tab === "layers" && <LayersPanel />}

      {tab === "elements" && (
        <div className="p-3">
          {!design && (
            <p className="text-xs text-surface-400 mb-3 leading-relaxed">
              Generate a design first (or start a blank one) before adding elements.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAddText}
              disabled={!design}
              className="flex flex-col items-center gap-2 py-5 rounded-lg border border-surface-700 hover:border-accent/50 hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:hover:border-surface-700 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <Type size={18} className="text-surface-300" />
              <span className="text-xs text-surface-300">Add text</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShapeMenuOpen((v) => !v)}
                disabled={!design}
                className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border border-surface-700 hover:border-accent/50 hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:hover:border-surface-700 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ShapesIcon size={18} className="text-surface-300" />
                <span className="text-xs text-surface-300">Add shape</span>
              </button>
              {shapeMenuOpen && (
                <div className="absolute z-20 mt-1 right-0 w-full rounded-lg border border-surface-700 bg-surface-800 shadow-floating p-1 animate-slide-up">
                  {SHAPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onAddShape(opt.value)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-surface-200 hover:bg-surface-700 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!design || uploading}
              className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-lg border border-dashed border-surface-700 hover:border-accent/50 hover:bg-surface-800 transition-colors text-surface-400 disabled:opacity-40 disabled:hover:border-surface-700 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              <span className="text-xs">{uploading ? "Uploading…" : "Upload image"}</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
