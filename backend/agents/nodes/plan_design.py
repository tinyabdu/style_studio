from agents.llm import call_llm, extract_json
from agents.state import DesignState

CANVAS_SIZES = {
    "social_post": (1080, 1080),
    "poster": (1000, 1414),
    "presentation_slide": (1280, 720),
    "logo": (800, 800),
    "banner": (1500, 500),
    "flyer": (1000, 1400),
}

SYSTEM = """You are a senior graphic designer AND creative-brief analyst.
Given a user's design prompt and type, produce BOTH a creative brief and a
layout plan in a single JSON object. Respond with ONLY valid JSON — no prose,
no markdown fences. Use double quotes for all keys/strings. No trailing commas.

{
  "mood": "3-5 words describing the visual mood (e.g. \"bold, energetic, modern\")",
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "headline": "the main short headline/wordmark text to feature (max 6 words)",
  "subtext": "optional supporting line, or empty string",
  "audience": "who this design is for, briefly",
  "elements": [
    {
      "id": "bg",
      "role": "background",
      "type": "image",
      "x": 0, "y": 0, "width": <canvas_width>, "height": <canvas_height>,
      "z_index": 0,
      "description": "subtle, tonal background built from the brand primary color (palette[0])"
    },
    {
      "id": "headline",
      "role": "headline",
      "type": "text",
      "x": 80, "y": 700, "width": 900, "height": 150,
      "z_index": 10,
      "text": "the headline copy",
      "align": "center"
    }
  ]
}

Palette rules (critical for coherence):
- Exactly 4 hex colors, ordered:
  - palette[0] = dominant BRAND/primary color (use any color the user names)
  - palette[1] = a complementary ACCENT color
  - palette[2] = a near-black ink color for text on light backgrounds (e.g. "#1A1A1A")
  - palette[3] = a near-white color for text on dark backgrounds (e.g. "#F5F5F5")
- For a logo keep the palette minimal and strictly on-brand.
- If the user explicitly names colors, use those exact hex values.

Layout rules:
- Always include a background element first (z_index 0).
- Include a headline text element with the brief's headline copy.
- Include a subtext element if subtext is non-empty.
- Add 1-2 supporting shape/icon elements ONLY if they clearly help.
- Respect canvas bounds. Sensible margins. Avoid overlapping text.
- Use palette hex colors for any "fill"/"color" props.
- Supporting shapes used as glows/highlights MUST use low opacity (0.15-0.35)
  and a circle/rounded form — never a hard full-opacity rectangle.
- For LOGO: center a single icon/symbol element (type "image", role "icon")
  and a wordmark text element, strong negative space, symmetrical and premium.
"""


async def plan_design_node(state: DesignState) -> DesignState:
    qa_note = ""
    if state.get("qa_issues"):
        qa_note = (
            "\nThe previous layout attempt had these issues — fix them this time:\n- "
            + "\n- ".join(state["qa_issues"])
        )

    user_msg = (
        f"Design type: {state['design_type']}\n"
        f"Prompt: {state['prompt']}"
        f"{qa_note}"
    )

    resp = await call_llm(
        [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_msg},
        ]
    )
    data = extract_json(resp.content)
    width, height = CANVAS_SIZES.get(state["design_type"], (1080, 1080))

    return {
        **state,
        "canvas_width": width,
        "canvas_height": height,
        "mood": data.get("mood", "modern, clean"),
        "palette": data.get("palette", ["#6C5CE7", "#00B894", "#FDCB6E", "#2D3436"]),
        "headline": data.get("headline", "Your Headline Here"),
        "subtext": data.get("subtext", ""),
        "audience": data.get("audience", "general"),
        "layout_plan": data.get("elements", []),
        "step": "layout_planned",
    }
