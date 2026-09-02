import { Design, DesignType, Layer, ProgressEvent } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

export async function listDesigns(): Promise<Design[]> {
  const res = await fetch(`${API_BASE}/designs`);
  return res.json();
}

export async function createBlankDesign(): Promise<Design> {
  const res = await fetch(`${API_BASE}/designs`, { method: "POST" });
  return res.json();
}

export async function updateDesign(id: string, patch: Partial<Design>): Promise<Design> {
  const res = await fetch(`${API_BASE}/designs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return res.json();
}

export async function deleteDesign(id: string): Promise<void> {
  await fetch(`${API_BASE}/designs/${id}`, { method: "DELETE" });
}

export async function duplicateDesign(design: Design): Promise<Design> {
  const blank = await createBlankDesign();
  return updateDesign(blank.id, {
    title: `${design.title} copy`,
    layers_json: design.layers_json,
  });
}

export async function uploadAsset(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/assets/upload`, { method: "POST", body: form });
  return res.json();
}

export function assetUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

/** Upload a data URL (e.g. a generated thumbnail) as a PNG asset. */
export async function uploadThumbnail(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("file", blob, "thumb.png");
  const res = await fetch(`${API_BASE}/assets/upload`, { method: "POST", body: form });
  const data = await res.json();
  return data.url as string;
}

/** Opens the generation WebSocket and streams progress events back via callback.
 * Resolves with the final Design once the "done" event arrives. */
export function generateDesign(
  prompt: string,
  designType: DesignType,
  designId: string | undefined,
  onProgress: (evt: ProgressEvent) => void
): Promise<Design> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}/generate/stream`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ prompt, design_type: designType, design_id: designId }));
    };

    ws.onmessage = (evt) => {
      const data: ProgressEvent = JSON.parse(evt.data);
      onProgress(data);
      if (data.type === "done" && data.design) {
        resolve(data.design);
        ws.close();
      } else if (data.type === "error") {
        reject(new Error(data.message || "Generation failed"));
        ws.close();
      }
    };

    ws.onerror = () => reject(new Error("Connection to generation service failed."));
  });
}

/** Re-generate a single layer with AI (new image for image/icon, rewritten
 *  copy for text). Returns the updated layer. */
export async function regenerateLayer(
  designId: string,
  layerId: string,
  prompt?: string
): Promise<Layer> {
  const res = await fetch(`${API_BASE}/generate/regenerate-layer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, layer_id: layerId, prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to regenerate layer");
  }
  const data = await res.json();
  return data.layer as Layer;
}
