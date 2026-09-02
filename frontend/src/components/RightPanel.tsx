import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, RefreshCw, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { regenerateLayer, uploadAsset } from "../lib/api";
import { FONTS } from "../lib/fonts";
import { SHAPE_OPTIONS } from "../lib/shapes";
import { useDesignStore } from "../store/useDesignStore";

const SWATCHES = ["#111111", "#FFFFFF", "#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#0984E3", "#D63031"];

export default function RightPanel() {
  const design = useDesignStore((s) => s.design);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const updateLayerProps = useDesignStore((s) => s.updateLayerProps);
  const pushHistory = useDesignStore((s) => s.pushHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    if (!design || !layer) return;
    setRegenerating(true);
    try {
      const updated = await regenerateLayer(design.id, layer.id);
      pushHistory();
      updateLayerProps(layer.id, updated.props);
    } catch (err) {
      alert("Regeneration failed: " + (err as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  const layer = design?.layers_json.find((l) => l.id === selectedLayerId);

  function setPos(patch: { x?: number; y?: number }) {
    if (!layer) return;
    pushHistory();
    updateLayer(layer.id, patch);
  }

  async function handleReplaceImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !layer) return;
    setUploading(true);
    try {
      const { url } = await uploadAsset(file);
      pushHistory();
      updateLayerProps(layer.id, { src: url });
    } catch (err) {
      alert("Upload failed — check that the backend is running.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!layer) {
    return (
      <aside className="w-64 shrink-0 border-l border-surface-700 bg-surface-900 flex items-center justify-center px-6">
        <p className="text-xs text-surface-400 text-center leading-relaxed">
          Select an element on the canvas to edit its properties.
        </p>
      </aside>
    );
  }

  function set(props: Record<string, any>) {
    pushHistory();
    updateLayerProps(layer!.id, props);
  }

  return (
    <aside className="w-64 shrink-0 border-l border-surface-700 bg-surface-900 flex flex-col overflow-y-auto animate-fade-in">
      <div className="px-3.5 py-3 border-b border-surface-700">
        <p className="text-[11px] font-medium uppercase tracking-wider text-surface-400">
          {layer.type} properties
        </p>
      </div>

      {layer.type !== "shape" && (
        <div className="p-3.5 pb-0">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="w-full flex items-center justify-center gap-2 h-8 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors disabled:opacity-60"
          >
            <Sparkles size={13} className={regenerating ? "animate-pulse" : ""} />
            {regenerating ? "Generating…" : "Regenerate with AI"}
          </button>
        </div>
      )}

      <div className="p-3.5 flex flex-col gap-4">
        {layer.type === "text" && (
          <>
            <Field label="Text">
              <textarea
                value={layer.props.text || ""}
                onChange={(e) => set({ text: e.target.value })}
                rows={2}
                className="w-full bg-surface-800 border border-surface-600 rounded-md px-2.5 py-1.5 text-xs text-surface-50 focus-ring resize-none"
              />
            </Field>

            <Field label="Font">
              <select
                value={layer.props.fontFamily || "Inter"}
                onChange={(e) => set({ fontFamily: e.target.value })}
                className="w-full bg-surface-800 border border-surface-600 rounded-md px-2 py-1.5 text-xs text-surface-50 focus-ring"
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Style">
              <div className="flex gap-1">
                <button
                  onClick={() => set({ fontWeight: layer.props.fontWeight === 700 ? 400 : 700 })}
                  className={`flex-1 h-7 rounded-md flex items-center justify-center border transition-colors ${
                    layer.props.fontWeight === 700
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-surface-600 text-surface-300 hover:bg-surface-800"
                  }`}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  onClick={() => set({ fontStyle: layer.props.fontStyle === "italic" ? "normal" : "italic" })}
                  className={`flex-1 h-7 rounded-md flex items-center justify-center border transition-colors ${
                    layer.props.fontStyle === "italic"
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-surface-600 text-surface-300 hover:bg-surface-800"
                  }`}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <div className="flex gap-1 flex-1">
                  {[
                    { v: "left", Icon: AlignLeft },
                    { v: "center", Icon: AlignCenter },
                    { v: "right", Icon: AlignRight },
                  ].map(({ v, Icon }) => (
                    <button
                      key={v}
                      onClick={() => set({ align: v })}
                      className={`flex-1 h-7 rounded-md flex items-center justify-center border transition-colors ${
                        layer.props.align === v
                          ? "border-accent bg-accent-muted text-accent"
                          : "border-surface-600 text-surface-300 hover:bg-surface-800"
                      }`}
                    >
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label="Font size">
              <input
                type="range"
                min={12}
                max={120}
                value={layer.props.fontSize || 32}
                onChange={(e) => set({ fontSize: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>

            <ColorField label="Text color" value={layer.props.color} onChange={(c) => set({ color: c })} />
          </>
        )}

        {layer.type === "shape" && (
          <>
            <Field label="Shape">
              <div className="grid grid-cols-3 gap-1.5">
                {SHAPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set({ shape: opt.value })}
                    className={`py-1.5 rounded-md border text-[11px] transition-colors ${
                      layer.props.shape === opt.value
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-surface-600 text-surface-300 hover:bg-surface-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {layer.props.shape === "rect" && (
              <Field label="Corner radius">
                <input
                  type="range"
                  min={0}
                  max={Math.min(layer.width, layer.height) / 2}
                  value={layer.props.radius || 0}
                  onChange={(e) => set({ radius: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </Field>
            )}

            <ColorField label="Fill color" value={layer.props.fill} onChange={(c) => set({ fill: c })} />

            <ColorField label="Stroke color" value={layer.props.stroke} onChange={(c) => set({ stroke: c })} />

            <Field label="Stroke width">
              <input
                type="range"
                min={0}
                max={40}
                value={layer.props.strokeWidth || 0}
                onChange={(e) => set({ strokeWidth: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>

            <Field label="Opacity">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={layer.props.opacity ?? 1}
                onChange={(e) => set({ opacity: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>
          </>
        )}

        {(layer.type === "image" || layer.type === "icon") && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReplaceImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 h-8 rounded-md border border-surface-600 hover:bg-surface-800 text-xs text-surface-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={uploading ? "animate-spin" : ""} />
              {uploading ? "Uploading…" : "Replace image"}
            </button>
          </>
        )}

        {/* Effects */}
        <div className="flex flex-col gap-3 pt-3 border-t border-surface-700">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-surface-400">Drop shadow</span>
            <button
              onClick={() =>
                set(
                  layer.props.shadow
                    ? { shadow: null }
                    : { shadow: { color: "#000000", blur: 12, offsetX: 0, offsetY: 6 } }
                )
              }
              className={`h-6 px-2.5 rounded-md text-[11px] border transition-colors ${
                layer.props.shadow
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-surface-600 text-surface-300 hover:bg-surface-800"
              }`}
            >
              {layer.props.shadow ? "On" : "Off"}
            </button>
          </div>

          {layer.props.shadow && (
            <>
              <ColorField
                label="Shadow color"
                value={layer.props.shadow.color}
                onChange={(c) => set({ shadow: { ...(layer.props.shadow || {}), color: c } })}
              />
              <Field label={`Blur · ${Math.round(layer.props.shadow.blur ?? 10)}`}>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={layer.props.shadow.blur ?? 10}
                  onChange={(e) => set({ shadow: { ...(layer.props.shadow || {}), blur: Number(e.target.value) } })}
                  className="w-full accent-accent"
                />
              </Field>
              <Field label={`Offset X · ${layer.props.shadow.offsetX ?? 0}`}>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={layer.props.shadow.offsetX ?? 0}
                  onChange={(e) => set({ shadow: { ...(layer.props.shadow || {}), offsetX: Number(e.target.value) } })}
                  className="w-full accent-accent"
                />
              </Field>
              <Field label={`Offset Y · ${layer.props.shadow.offsetY ?? 0}`}>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={layer.props.shadow.offsetY ?? 0}
                  onChange={(e) => set({ shadow: { ...(layer.props.shadow || {}), offsetY: Number(e.target.value) } })}
                  className="w-full accent-accent"
                />
              </Field>
            </>
          )}

          {(layer.type === "image" || layer.type === "icon") && (
            <>
              <span className="text-[11px] uppercase tracking-wider text-surface-400 pt-1">Filters</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "grayscale", label: "Gray" },
                  { key: "sepia", label: "Sepia" },
                  { key: "invert", label: "Invert" },
                ].map(({ key, label }) => {
                  const active = !!layer.props.filters?.[key];
                  return (
                    <button
                      key={key}
                      onClick={() => set({ filters: { ...(layer.props.filters || {}), [key]: !active } })}
                      className={`py-1.5 rounded-md border text-[11px] transition-colors ${
                        active
                          ? "border-accent bg-accent-muted text-accent"
                          : "border-surface-600 text-surface-300 hover:bg-surface-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <Field label={`Brightness · ${layer.props.filters?.brightness ?? 0}`}>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={layer.props.filters?.brightness ?? 0}
                  onChange={(e) => set({ filters: { ...(layer.props.filters || {}), brightness: Number(e.target.value) } })}
                  className="w-full accent-accent"
                />
              </Field>
              <Field label={`Blur · ${layer.props.filters?.blur ?? 0}`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={layer.props.filters?.blur ?? 0}
                  onChange={(e) => set({ filters: { ...(layer.props.filters || {}), blur: Number(e.target.value) } })}
                  className="w-full accent-accent"
                />
              </Field>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-700">
          <Field label="X">
            <NumberInput value={layer.x} onChange={(v) => setPos({ x: v })} />
          </Field>
          <Field label="Y">
            <NumberInput value={layer.y} onChange={(v) => setPos({ y: v })} />
          </Field>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] text-surface-400">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-surface-800 border border-surface-600 rounded-md px-2 py-1 text-xs text-surface-50 focus-ring"
    />
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (c: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              value === c ? "border-accent" : "border-surface-600"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={value || "#111111"}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded-full overflow-hidden border-2 border-surface-600 bg-transparent cursor-pointer"
        />
      </div>
    </Field>
  );
}
