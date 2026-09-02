from agents.state import DesignState


def _overlaps(a: dict, b: dict) -> bool:
    ax1, ay1, ax2, ay2 = a["x"], a["y"], a["x"] + a["width"], a["y"] + a["height"]
    bx1, by1, bx2, by2 = b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]
    return ax1 < bx2 and ax2 > bx1 and ay1 < by2 and ay2 > by1


def qa_check_node(state: DesignState) -> DesignState:
    """Deterministic sanity checks (fast, free) before we'd loop back to the
    LLM planner. Catches the most common composition bugs: out-of-bounds
    elements and overlapping text boxes."""
    issues: list[str] = []
    layers = state["layers"]
    cw, ch = state["canvas_width"], state["canvas_height"]

    text_layers = [l for l in layers if l["type"] == "text"]

    for layer in layers:
        if layer["x"] < 0 or layer["y"] < 0:
            issues.append(f"Element '{layer['id']}' is positioned off-canvas (negative x/y).")
        if layer["x"] + layer["width"] > cw + 1 or layer["y"] + layer["height"] > ch + 1:
            issues.append(f"Element '{layer['id']}' extends beyond the canvas bounds.")

    for i, a in enumerate(text_layers):
        for b in text_layers[i + 1 :]:
            if _overlaps(a, b):
                issues.append(f"Text elements '{a['id']}' and '{b['id']}' overlap.")

    return {
        **state,
        "qa_issues": issues,
        "retry_count": state.get("retry_count", 0) + (1 if issues else 0),
        "step": "qa_checked",
    }
