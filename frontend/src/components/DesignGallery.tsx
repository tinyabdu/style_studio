import { useEffect, useState } from "react";
import { Copy, Loader2, Trash2, X } from "lucide-react";
import { assetUrl, deleteDesign, duplicateDesign, listDesigns } from "../lib/api";
import { Design } from "../lib/types";
import { useDesignStore } from "../store/useDesignStore";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function DesignGallery() {
  const open = useDesignStore((s) => s.galleryOpen);
  const closeGallery = useDesignStore((s) => s.closeGallery);
  const setDesign = useDesignStore((s) => s.setDesign);

  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setDesigns(await listDesigns());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (!open) return null;

  async function handleOpen(d: Design) {
    setDesign(d);
    closeGallery();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteDesign(id);
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(d: Design) {
    setBusyId(d.id);
    try {
      const copy = await duplicateDesign(d);
      setDesigns((prev) => [copy, ...prev]);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
      onClick={closeGallery}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] bg-surface-900 border border-surface-700 rounded-xl2 shadow-floating flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <h2 className="text-sm font-semibold text-surface-50">Your designs</h2>
          <button
            onClick={closeGallery}
            className="w-7 h-7 rounded-md flex items-center justify-center text-surface-300 hover:bg-surface-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-surface-400 gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-16 text-surface-400 text-sm">
              No saved designs yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {designs.map((d) => (
                <div
                  key={d.id}
                  className="group rounded-lg border border-surface-700 bg-surface-800 overflow-hidden hover:border-accent/50 transition-colors"
                >
                  <button
                    onClick={() => handleOpen(d)}
                    className="block w-full aspect-square bg-surface-950 relative overflow-hidden"
                  >
                    {d.thumbnail_url ? (
                      <img src={assetUrl(d.thumbnail_url)} alt={d.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-surface-600 text-xs">
                        {d.layers_json?.length ?? 0} layers
                      </div>
                    )}
                  </button>
                  <div className="px-2.5 py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-100 font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-surface-400">{timeAgo(d.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicate(d)}
                        disabled={busyId === d.id}
                        className="p-1 rounded hover:bg-surface-700 text-surface-300"
                        title="Duplicate"
                      >
                        {busyId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={busyId === d.id}
                        className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
