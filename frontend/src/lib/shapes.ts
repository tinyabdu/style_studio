export const SHAPE_OPTIONS: { value: string; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "triangle", label: "Triangle" },
  { value: "star", label: "Star" },
];

/** Build 5-point star points centered at (cx, cy). */
export function starPoints(cx: number, cy: number, outer: number, inner: number, spikes = 5) {
  const pts: { x: number; y: number }[] = [];
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: cx + Math.cos(rot) * outer, y: cy + Math.sin(rot) * outer });
    rot += step;
    pts.push({ x: cx + Math.cos(rot) * 1 * inner, y: cy + Math.sin(rot) * inner });
    rot += step;
  }
  return pts;
}
