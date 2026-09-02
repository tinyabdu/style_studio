import * as fabric from "fabric";
import { Minus, Plus, Square, Type as TypeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../lib/api";
import { starPoints } from "../lib/shapes";
import { Layer } from "../lib/types";
import { useDesignStore } from "../store/useDesignStore";

const OBJ_ID = "__layerId";

// shared reference so non-React code (thumbnail capture) can reach the live canvas
let fabricCanvas: fabric.Canvas | null = null;

export default function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const skipNextSync = useRef(false);
  const rebuilding = useRef(false);
  const [zoom, setZoom] = useState(0.55);

  const design = useDesignStore((s) => s.design);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const pushHistory = useDesignStore((s) => s.pushHistory);

  // init fabric canvas once
  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new fabric.Canvas(canvasElRef.current, {
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selectionColor: "rgba(108,92,231,0.15)",
      selectionBorderColor: "#6C5CE7",
    });
    fabricRef.current = canvas;
    fabricCanvas = canvas;

    canvas.on("selection:created", (e) => {
      if (rebuilding.current) return;
      const obj = e.selected?.[0] as any;
      if (obj?.[OBJ_ID]) selectLayer(obj[OBJ_ID]);
    });
    canvas.on("selection:updated", (e) => {
      if (rebuilding.current) return;
      const obj = e.selected?.[0] as any;
      if (obj?.[OBJ_ID]) selectLayer(obj[OBJ_ID]);
    });
    canvas.on("selection:cleared", () => {
      if (rebuilding.current) return;
      selectLayer(null);
    });

    canvas.on("object:modified", (e) => {
      const obj = e.target as any;
      if (!obj?.[OBJ_ID]) return;
      pushHistory();
      skipNextSync.current = true;
      updateLayer(obj[OBJ_ID], {
        x: Math.round(obj.left),
        y: Math.round(obj.top),
        width: Math.round(obj.width * obj.scaleX),
        height: Math.round(obj.height * obj.scaleY),
      });
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      fabricCanvas = null;
    };
  }, []);

  // rebuild objects whenever the design (or its layers) changes externally
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !design) return;

    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    rebuilding.current = true;
    canvas.clear();
    canvas.setDimensions({ width: design.canvas_width, height: design.canvas_height });
    canvas.backgroundColor = "#ffffff";

    const sorted = [...design.layers_json].sort((a, b) => a.z_index - b.z_index);

    let selectedObj: fabric.Object | null = null;
    const selectedId = useDesignStore.getState().selectedLayerId;
    sorted.forEach((layer) => {
      const obj = buildFabricObject(layer);
      if (!obj) return;
      (obj as any)[OBJ_ID] = layer.id;
      if (layer.visible === false) obj.visible = false;
      if (layer.locked) {
        obj.selectable = false;
        obj.evented = false;
        obj.hoverCursor = "not-allowed";
      }
      canvas.add(obj);
      if (layer.id === selectedId) selectedObj = obj;
    });

    if (selectedObj) canvas.setActiveObject(selectedObj);
    canvas.renderAll();
    rebuilding.current = false;
  }, [design]);

  // apply zoom — scale the DISPLAY size only, keep the logical canvas at full
  // resolution so objects added at full coordinates stay on-canvas.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setZoom(zoom);
    if (design) {
      canvas.setDimensions(
        {
          width: design.canvas_width * zoom,
          height: design.canvas_height * zoom,
        },
        { cssOnly: true }
      );
    }
    canvas.renderAll();
  }, [zoom, design]);

  function addText() {
    if (!design) return;
    pushHistory();
    const id = `text-${Date.now()}`;
    const layer: Layer = {
      id,
      type: "text",
      x: design.canvas_width / 2 - 150,
      y: design.canvas_height / 2 - 20,
      width: 300,
      height: 40,
      z_index: design.layers_json.length + 1,
      props: { text: "Add your text", fontFamily: "Inter", fontSize: 32, fontWeight: 600, color: "#111111", align: "left" },
    };
    skipNextSync.current = false;
    useDesignStore.setState({ design: { ...design, layers_json: [...design.layers_json, layer] } });
  }

  function addShape(shape: string = "rect") {
    if (!design) return;
    pushHistory();
    const id = `shape-${Date.now()}`;
    const layer: Layer = {
      id,
      type: "shape",
      x: design.canvas_width / 2 - 75,
      y: design.canvas_height / 2 - 75,
      width: 150,
      height: 150,
      z_index: design.layers_json.length + 1,
      props: { fill: "#6C5CE7", shape, opacity: 1, strokeWidth: 0 },
    };
    skipNextSync.current = false;
    useDesignStore.setState({ design: { ...design, layers_json: [...design.layers_json, layer] } });
  }

  function addImage(url: string) {
    if (!design) return;
    pushHistory();
    const id = `image-${Date.now()}`;
    const w = Math.min(400, design.canvas_width * 0.6);
    const h = w; // resized on canvas once the user drags it anyway
    const layer: Layer = {
      id,
      type: "image",
      x: design.canvas_width / 2 - w / 2,
      y: design.canvas_height / 2 - h / 2,
      width: w,
      height: h,
      z_index: design.layers_json.length + 1,
      props: { src: url, fit: "cover" },
    };
    skipNextSync.current = false;
    useDesignStore.setState({ design: { ...design, layers_json: [...design.layers_json, layer] } });
  }

  // expose add handlers to parent via a global-ish pattern using data attrs is messy;
  // instead we lift these via window custom events consumed by Sidebar's buttons.
  useEffect(() => {
    const onAddText = () => addText();
    const onAddShape = (e: Event) => addShape((e as CustomEvent<string>).detail || "rect");
    const onAddImage = (e: Event) => addImage((e as CustomEvent<string>).detail);
    window.addEventListener("studio:add-text", onAddText);
    window.addEventListener("studio:add-shape", onAddShape);
    window.addEventListener("studio:add-image", onAddImage);
    return () => {
      window.removeEventListener("studio:add-text", onAddText);
      window.removeEventListener("studio:add-shape", onAddShape);
      window.removeEventListener("studio:add-image", onAddImage);
    };
  }, [design]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div ref={containerRef} className="flex-1 canvas-backdrop overflow-auto flex items-center justify-center p-10">
        <div
          className={`shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden animate-fade-in ${
            design ? "" : "opacity-0 pointer-events-none absolute"
          }`}
        >
          <canvas ref={canvasElRef} />
        </div>
        {!design && (
          <div className="text-center text-surface-400 max-w-xs animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-dashed border-surface-600 flex items-center justify-center">
              <TypeIcon size={22} className="text-surface-500" />
            </div>
            <p className="text-sm font-medium text-surface-200 mb-1">Nothing here yet</p>
            <p className="text-xs">Use the prompt panel on the left to generate your first design.</p>
          </div>
        )}
      </div>

      <div className="h-11 shrink-0 border-t border-surface-700 bg-surface-900 flex items-center justify-center gap-3 text-surface-300">
        <button
          onClick={() => setZoom((z) => Math.max(0.1, +(z - 0.1).toFixed(2)))}
          className="w-7 h-7 rounded-md hover:bg-surface-800 flex items-center justify-center transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
          className="w-7 h-7 rounded-md hover:bg-surface-800 flex items-center justify-center transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function buildShadow(props: Record<string, any>): fabric.Shadow | null {
  const s = props.shadow;
  if (!s || s.color === undefined) return null;
  return new fabric.Shadow({
    color: s.color,
    blur: s.blur ?? 10,
    offsetX: s.offsetX ?? 0,
    offsetY: s.offsetY ?? 0,
  });
}

function buildFilters(props: Record<string, any>): any[] {
  const f = props.filters || {};
  const filters: any[] = [];
  if (f.grayscale) filters.push(new fabric.filters.Grayscale());
  if (f.sepia) filters.push(new fabric.filters.Sepia());
  if (f.invert) filters.push(new fabric.filters.Invert());
  if (typeof f.brightness === "number" && f.brightness !== 0)
    filters.push(new fabric.filters.Brightness({ brightness: f.brightness }));
  if (typeof f.blur === "number" && f.blur !== 0)
    filters.push(new fabric.filters.Blur({ blur: f.blur }));
  return filters;
}

function buildFabricObject(layer: Layer): fabric.Object | null {
  const { x, y, width, height, props } = layer;

  if (layer.type === "text") {
    const obj = new fabric.Textbox(props.text || "", {
      left: x,
      top: y,
      width,
      fontFamily: props.fontFamily || "Inter",
      fontSize: props.fontSize || 32,
      fontWeight: props.fontWeight || 400,
      fontStyle: props.fontStyle || "normal",
      fill: props.color || "#111111",
      textAlign: props.align || "left",
    });
    obj.shadow = buildShadow(props);
    return obj;
  }

  if (layer.type === "shape") {
    const fill = props.fill || "#6C5CE7";
    const opacity = props.opacity ?? 1;
    const stroke = props.stroke && props.strokeWidth ? props.stroke : undefined;
    const strokeWidth = props.strokeWidth || 0;
    const common: any = { left: x, top: y, fill, opacity, stroke, strokeWidth };

    let obj: fabric.Object;
    switch (props.shape) {
      case "circle":
        obj = new fabric.Circle({ ...common, radius: width / 2 });
        break;
      case "ellipse":
        obj = new fabric.Ellipse({ ...common, rx: width / 2, ry: height / 2 });
        break;
      case "triangle":
        obj = new fabric.Triangle({ ...common, width, height });
        break;
      case "star": {
        const points = starPoints(width / 2, height / 2, width / 2, width / 4);
        obj = new fabric.Polygon(points, { ...common, originX: "left", originY: "top" });
        break;
      }
      case "rect":
      default:
        obj = new fabric.Rect({
          ...common,
          width,
          height,
          rx: props.radius || 0,
          ry: props.radius || 0,
        });
    }
    obj.shadow = buildShadow(props);
    return obj;
  }

  if (layer.type === "image" || layer.type === "icon") {
    // placeholder rect shown while the real image loads async
    const placeholder = new fabric.Rect({
      left: x,
      top: y,
      width,
      height,
      fill: "#2c2c34",
    });
    if (props.src) {
      fabric.FabricImage.fromURL(assetUrl(props.src), { crossOrigin: "anonymous" }).then((img) => {
        img.set({ left: x, top: y, scaleX: width / (img.width || width), scaleY: height / (img.height || height) });
        (img as any)[OBJ_ID] = layer.id;
        img.shadow = buildShadow(props);
        const filters = buildFilters(props);
        if (filters.length) {
          img.filters = filters;
          img.applyFilters();
        }
        const canvas = placeholder.canvas;
        if (canvas) {
          canvas.remove(placeholder);
          canvas.add(img);
          canvas.renderAll();
        }
      });
    }
    return placeholder;
  }

  return null;
}

/** Render the current canvas at full resolution and return a downscaled PNG
 *  data URL suitable for use as a design thumbnail. Restores zoom afterwards. */
export function captureThumbnail(maxSize = 480): string | null {
  const canvas = fabricCanvas;
  if (!canvas) return null;
  const prevZoom = canvas.getZoom();
  canvas.setZoom(1);
  canvas.renderAll();
  const src = canvas.lowerCanvasEl;
  const out = document.createElement("canvas");
  const size = Math.min(maxSize, src.width, src.height);
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(src, 0, 0, size, size);
  }
  const dataUrl = out.toDataURL("image/png");
  canvas.setZoom(prevZoom);
  canvas.renderAll();
  return dataUrl;
}

/** Export the canvas at full resolution as a PNG or JPG. When `transparent`
 *  is true the background is dropped (PNG only keeps alpha). Restores the
 *  live view/zoom afterwards. */
export function exportImage(format: "png" | "jpeg", transparent: boolean): string | null {
  const canvas = fabricCanvas;
  if (!canvas) return null;
  const prevZoom = canvas.getZoom();
  const prevBg = canvas.backgroundColor;
  canvas.setZoom(1);
  canvas.backgroundColor = transparent ? "" : "#ffffff";
  canvas.renderAll();
  const dataUrl = canvas.toDataURL({
    format,
    quality: 0.92,
    multiplier: 1,
  });
  canvas.setZoom(prevZoom);
  canvas.backgroundColor = prevBg;
  canvas.renderAll();
  return dataUrl;
}
