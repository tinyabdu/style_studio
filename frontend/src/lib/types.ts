export type LayerType = "text" | "image" | "shape" | "icon";

export interface Layer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  props: Record<string, any>;
  visible?: boolean;
  locked?: boolean;
}

export interface Design {
  id: string;
  title: string;
  canvas_width: number;
  canvas_height: number;
  thumbnail_url?: string | null;
  layers_json: Layer[];
  created_at?: string;
  updated_at?: string;
}

export type DesignType =
  | "social_post"
  | "poster"
  | "presentation_slide"
  | "logo"
  | "banner"
  | "flyer";

export interface ProgressEvent {
  type: "progress" | "done" | "error";
  node?: string;
  label?: string;
  design?: Design;
  message?: string;
}
