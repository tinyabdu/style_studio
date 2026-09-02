import { Copy, Eye, EyeOff, GripVertical, Image, Lock, Shapes, Trash2, Type, Unlock } from "lucide-react";
import { useState } from "react";
import { useDesignStore } from "../store/useDesignStore";

const ICONS: Record<string, any> = { text: Type, image: Image, icon: Image, shape: Shapes };

export default function LayersPanel() {
  const design = useDesignStore((s) => s.design);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);
  const duplicateLayer = useDesignStore((s) => s.duplicateLayer);
  const toggleVisibility = useDesignStore((s) => s.toggleVisibility);
  const toggleLock = useDesignStore((s) => s.toggleLock);
  const setLayerOrder = useDesignStore((s) => s.setLayerOrder);

  const [dragId, setDragId] = useState<string | null>(null);

  // top layer first (highest z_index)
  const layers = design ? [...design.layers_json].sort((a, b) => b.z_index - a.z_index) : [];

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = layers.findIndex((l) => l.id === dragId);
    const to = layers.findIndex((l) => l.id === targetId);
    const next = [...layers];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // store wants bottom -> top order (z_index = index)
    setLayerOrder([...next].reverse().map((l) => l.id));
    setDragId(null);
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-2">
      <div className="px-2 py-2 text-[11px] font-medium uppercase tracking-wider text-surface-400">
        Layers
      </div>
      {layers.length === 0 && (
        <div className="px-2 py-6 text-center text-xs text-surface-400 leading-relaxed">
          No layers yet.
          <br />
          Generate a design with a prompt to get started.
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {layers.map((layer) => {
          const Icon = ICONS[layer.type] ?? Shapes;
          const isSelected = layer.id === selectedLayerId;
          const isHidden = layer.visible === false;
          const isLocked = layer.locked;
          const label =
            layer.type === "text"
              ? layer.props.text?.slice(0, 22) || "Text"
              : layer.type.charAt(0).toUpperCase() + layer.type.slice(1);

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={() => setDragId(layer.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(layer.id)}
              onClick={() => selectLayer(layer.id)}
              className={`group flex items-center gap-1.5 pl-1 pr-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                isSelected ? "bg-accent-muted text-surface-50" : "text-surface-200 hover:bg-surface-800"
              } ${isHidden ? "opacity-50" : ""}`}
            >
              <GripVertical size={12} className="text-surface-500 shrink-0 cursor-grab" />
              <Icon size={13} className={isSelected ? "text-accent shrink-0" : "text-surface-400 shrink-0"} />
              <span className="flex-1 truncate">{label}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(layer.id);
                  }}
                  className="p-1 rounded hover:bg-surface-700 text-surface-300"
                  title={isHidden ? "Show" : "Hide"}
                >
                  {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-surface-700 ${isLocked ? "text-accent" : "text-surface-300"}`}
                  title={isLocked ? "Unlock" : "Lock"}
                >
                  {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateLayer(layer.id);
                  }}
                  className="p-1 rounded hover:bg-surface-700 text-surface-300"
                  title="Duplicate"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                  className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
