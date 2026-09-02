from agents.state import DesignState


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = (hex_color or "#000000").lstrip("#")
    if len(hex_color) != 6:
        return (0, 0, 0)
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def _readable_on(bg_hex: str, light: str, dark: str) -> str:
    """Return `light` or `dark` depending on which is more readable on bg_hex."""
    r, g, b = _hex_to_rgb(bg_hex)
    # perceived luminance (Rec. 601)
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return dark if lum > 0.55 else light


def compose_node(state: DesignState) -> DesignState:
    """Deterministic — no LLM call. Maps the abstract layout_plan + generated
    assets into the concrete Fabric.js-ready layer schema the frontend consumes.
    """
    layers = []
    palette = state["palette"]
    fonts = state.get("fonts", {"headline": "Poppins", "body": "Inter"})
    assets = state.get("assets", {})

    for el in state["layout_plan"]:
        base = {
            "id": el["id"],
            "type": el["type"],
            "x": el["x"],
            "y": el["y"],
            "width": el["width"],
            "height": el["height"],
            "z_index": el.get("z_index", 0),
        }

        if el["type"] in ("image", "icon"):
            base["props"] = {
                "src": assets.get(el["id"], ""),
                "fit": "cover",
                "description": el.get("description", ""),
            }
        elif el["type"] == "text":
            role = el.get("role", "body")
            is_headline = role == "headline"
            # pick a text color readable against the brand background (palette[0])
            bg = palette[0] if palette else "#ffffff"
            light = palette[3] if len(palette) > 3 else "#F5F5F5"
            dark = palette[2] if len(palette) > 2 else "#1A1A1A"
            text_color = _readable_on(bg, light, dark)
            base["props"] = {
                "text": el.get("text", ""),
                "fontFamily": fonts.get("headline" if is_headline else "body"),
                "fontSize": 64 if is_headline else 28,
                "fontWeight": 700 if is_headline else 400,
                "color": text_color,
                "align": el.get("align", "left"),
            }
        elif el["type"] == "shape":
            base["props"] = {
                "fill": el.get("fill", palette[0] if palette else "#6C5CE7"),
                "shape": el.get("shape", "rect"),
                "opacity": el.get("opacity", 1),
            }

        layers.append(base)

    return {**state, "layers": layers, "step": "composed"}
