from agents.llm import extract_json, get_llm
from agents.state import DesignState

SYSTEM = """You are a senior graphic designer laying out elements on a canvas.
You will be given canvas dimensions and a creative brief. Produce an abstract
layout plan: a list of elements (NOT final pixel-perfect styling yet, just
placement, sizing, and role). Respond with ONLY a valid JSON object.
Use double quotes for all keys and string values. No trailing commas. No markdown fences.

{
  "elements": [
    {
      "id": "bg",
      "role": "background",
      "type": "image",
      "x": 0, "y": 0, "width": <canvas_width>, "height": <canvas_height>,
      "z_index": 0,
      "description": "subtle background in the brand's primary color (palette[0])"
    },
    {
      "id": "headline",
      "role": "headline",
      "type": "text",
      "x": 80, "y": 700, "width": 900, "height": 150,
      "z_index": 10,
      "text": "the headline copy",
      "align": "left"
    }
  ]
}

Rules:
- Always include a background element first (z_index 0) — its description should
  request a subtle, tonal gradient/pattern built from palette[0] (the brand primary).
- Include a headline text element with the brief's headline copy.
- Include a subtext element if subtext is non-empty.
- Add 1-2 supporting shape or icon elements ONLY if they clearly help the composition.
- Respect the canvas bounds. Leave sensible margins. Avoid overlapping text elements.
- Use hex colors from the given palette for any "fill" or "color" props you add.
- Supporting shapes used as glows/highlights MUST use a low opacity (0.15-0.35)
  and a circle/rounded form — never a hard, full-opacity rectangle behind text or icons.
- For LOGO design type: center a single icon/symbol element (type "image", role
  "icon") and a wordmark text element, with strong negative space and a
  symmetrical, balanced composition. Keep it minimal and premium.
"""


async def plan_layout_node(state: DesignState) -> DesignState:
    llm = get_llm()
    qa_note = ""
    if state.get("qa_issues"):
        qa_note = (
            "\nThe previous layout attempt had these issues — fix them this time:\n- "
            + "\n- ".join(state["qa_issues"])
        )

    user_msg = (
        f"Canvas: {state['canvas_width']}x{state['canvas_height']}\n"
        f"Design type: {state['design_type']}\n"
        f"Mood: {state['mood']}\n"
        f"Palette: {state['palette']}\n"
        f"Headline: {state['headline']}\n"
        f"Subtext: {state.get('subtext', '')}\n"
        f"Audience: {state['audience']}"
        f"{qa_note}"
    )

    resp = await llm.ainvoke([{"role": "system", "content": SYSTEM}, {"role": "user", "content": user_msg}])
    data = extract_json(resp.content)

    return {
        **state,
        "layout_plan": data.get("elements", []),
        "step": "layout_planned",
    }
