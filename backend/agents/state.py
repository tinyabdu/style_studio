from typing import Any, TypedDict


class DesignState(TypedDict, total=False):
    # inputs
    prompt: str
    design_type: str

    # parse_brief output
    canvas_width: int
    canvas_height: int
    mood: str
    palette: list[str]
    headline: str
    subtext: str
    audience: str

    # plan_layout output — abstract element plan, no assets yet
    layout_plan: list[dict[str, Any]]

    # generate_assets output — resolved image URLs / font choices keyed by plan element id
    assets: dict[str, Any]
    fonts: dict[str, str]

    # compose output — final Fabric.js-ready layers
    layers: list[dict[str, Any]]

    # qa_check output
    qa_issues: list[str]
    retry_count: int

    # progress reporting (streamed over websocket)
    step: str
