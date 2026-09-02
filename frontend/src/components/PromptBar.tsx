import { ArrowUp, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { generateDesign } from "../lib/api";
import { DesignType } from "../lib/types";
import { useDesignStore } from "../store/useDesignStore";

const DESIGN_TYPES: { value: DesignType; label: string }[] = [
  { value: "social_post", label: "Social post" },
  { value: "poster", label: "Poster" },
  { value: "presentation_slide", label: "Slide" },
  { value: "logo", label: "Logo" },
  { value: "banner", label: "Banner" },
  { value: "flyer", label: "Flyer" },
];

export default function PromptBar() {
  const [prompt, setPrompt] = useState("");
  const [designType, setDesignType] = useState<DesignType>("social_post");
  const [typeOpen, setTypeOpen] = useState(false);
  const { design, setDesign, setGenerating, isGenerating, progressLabel, pushHistory } =
    useDesignStore();

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    if (design) pushHistory();
    setGenerating(true, "Starting…");
    try {
      const result = await generateDesign(prompt, designType, design?.id, (evt) => {
        if (evt.type === "progress") setGenerating(true, evt.label || "");
      });
      setDesign(result);
    } catch (err: any) {
      console.error(err);
      setGenerating(false, "");
      alert(err.message || "Generation failed. Check that the backend is running and GEMINI_API_KEY is set.");
      return;
    }
    setGenerating(false, "");
    setPrompt("");
  }

  return (
    <div className="px-3 pb-3 pt-2">
      <div
        className={`relative rounded-xl2 border transition-all duration-200 ${
          isGenerating ? "border-accent/50 shadow-[0_0_0_3px_rgba(108,92,231,0.15)]" : "border-surface-600 focus-within:border-accent/60"
        } bg-surface-800 shadow-panel`}
      >
        {isGenerating && (
          <div className="absolute inset-x-0 -top-8 flex items-center justify-center gap-2 text-xs text-surface-200 animate-fade-in">
            <Loader2 size={12} className="animate-spin text-accent" />
            {progressLabel}
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Describe the design you want… e.g. 'Instagram promo for a weekend coffee pop-up, warm and cozy'"
          rows={2}
          className="w-full bg-transparent resize-none px-3.5 pt-3 pb-1.5 text-sm text-surface-50 placeholder:text-surface-400 focus-ring outline-none"
        />

        <div className="flex items-center justify-between px-2.5 pb-2">
          <div className="relative">
            <button
              onClick={() => setTypeOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-surface-300 hover:text-surface-100 px-2 py-1 rounded-md hover:bg-surface-700 transition-colors"
            >
              {DESIGN_TYPES.find((t) => t.value === designType)?.label}
              <ChevronDown size={12} />
            </button>
            {typeOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-40 bg-surface-700 border border-surface-600 rounded-lg shadow-floating py-1 animate-slide-up z-20">
                {DESIGN_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setDesignType(t.value);
                      setTypeOpen(false);
                    }}
                    className={`w-full text-left text-xs px-3 py-1.5 hover:bg-surface-600 transition-colors ${
                      t.value === designType ? "text-accent" : "text-surface-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-7 h-7 rounded-lg bg-accent hover:bg-accent-hover disabled:bg-surface-600 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={13} className="animate-spin text-white" />
            ) : (
              <ArrowUp size={14} className="text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 px-1 text-[11px] text-surface-400">
        <Sparkles size={11} />
        AI plans the layout, generates images, and composes editable layers
      </div>
    </div>
  );
}
