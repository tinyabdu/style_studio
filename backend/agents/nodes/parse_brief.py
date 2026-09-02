from agents.llm import extract_json, get_llm
from agents.state import DesignState

CANVAS_SIZES = {
    "social_post": (1080, 1080),
    "poster": (1000, 1414),
    "presentation_slide": (1280, 720),
    "logo": (800, 800),
    "banner": (1500, 500),
    "flyer": (1000, 1400),
}

SYSTEM = """You are a senior graphic design brief analyst.
Given a user's design prompt, extract a structured creative brief.
Respond with ONLY a valid JSON object, no prose, no markdown fences.
Use double quotes for all keys and string values. No trailing commas.

{
  "mood": "3-5 words describing the visual mood (e.g. \"bold, energetic, modern\")",
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "headline": "the main short headline/wordmark text to feature (max 6 words)",
  "subtext": "optional supporting line, or empty string",
  "audience": "who this design is for, briefly"
}

Palette rules (very important for visual coherence):
- Return EXACTLY 4 hex colors, ordered as:
  - palette[0] = dominant BRAND/primary color (use any color the user names; otherwise pick one that fits the mood)
  - palette[1] = a complementary ACCENT color
  - palette[2] = a near-black ink color for text on light backgrounds (e.g. "#1A1A1A")
  - palette[3] = a near-white / light color for text on dark backgrounds (e.g. "#F5F5F5")
- For a logo, keep the palette minimal and strictly on-brand (primary, accent, black, white).
- If the user explicitly names colors, use those exact hex values.
"""


async def parse_brief_node(state: DesignState) -> DesignState:
    llm = get_llm()
    resp = await llm.ainvoke(
        [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Design type: {state['design_type']}\nPrompt: {state['prompt']}"},
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
        "step": "brief_parsed",
    }
