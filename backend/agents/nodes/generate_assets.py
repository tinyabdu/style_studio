import asyncio

from agents.state import DesignState
from services.font_service import pick_font_pair
from services.image_gen import generate_image


async def generate_assets_node(state: DesignState) -> DesignState:
    image_elements = [el for el in state["layout_plan"] if el["type"] in ("image", "icon")]

    async def gen_one(el: dict) -> tuple[str, str]:
        url = await generate_image(
            prompt=el.get("description", state["headline"]),
            width=int(el["width"]),
            height=int(el["height"]),
            palette=state["palette"],
        )
        return el["id"], url

    results = await asyncio.gather(*[gen_one(el) for el in image_elements])
    assets = {el_id: url for el_id, url in results}
    fonts = pick_font_pair(state["mood"])

    return {**state, "assets": assets, "fonts": fonts, "step": "assets_generated"}
