"""Pluggable image generation.

If REPLICATE_API_TOKEN is set, real AI images are generated via Replicate
(Flux). Otherwise we fall back to generated gradient/pattern placeholders
using Pillow so the whole pipeline still runs end-to-end for free / offline.
Swap `_generate_placeholder` for a call to your preferred provider
(fal.ai, OpenAI Images, Stability, etc.) as needed.
"""

import io
import os
import uuid

import httpx
from PIL import Image, ImageDraw

from config import settings

PALETTE_FALLBACK = ["#6C5CE7", "#00B894", "#FDCB6E", "#2D3436"]

ICON_KEYWORDS = ("icon", "logo", "symbol", "badge", "avatar", "mark", "glyph", "emblem")


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def _shade(hex_color: str, factor: float) -> str:
    """Return a lightened (factor>1) or darkened (factor<1) variant of a hex color."""
    r, g, b = _hex_to_rgb(hex_color)
    r = max(0, min(255, int(r * factor)))
    g = max(0, min(255, int(g * factor)))
    b = max(0, min(255, int(b * factor)))
    return f"#{r:02x}{g:02x}{b:02x}"


def _draw_gradient(width: int, height: int, base: str) -> Image.Image:
    """Tonal diagonal gradient built from the brand color to a darker shade of
    itself — keeps the background on-brand and within a narrow luminance band
    so text stays readable across the whole canvas."""
    c1 = base
    c2 = _shade(base, 0.55)
    rgb1, rgb2 = _hex_to_rgb(c1), _hex_to_rgb(c2)
    img = Image.new("RGB", (width, height), rgb1)
    draw = ImageDraw.Draw(img)
    diag = width + height
    for y in range(height):
        for x in range(0, width, 2):  # step by 2 for speed
            t = (x + y) / max(diag - 1, 1)
            r = int(rgb1[0] * (1 - t) + rgb2[0] * t)
            g = int(rgb1[1] * (1 - t) + rgb2[1] * t)
            b = int(rgb1[2] * (1 - t) + rgb2[2] * t)
            draw.line([(x, y), (x + 1, y)], fill=(r, g, b))
    return img


def _draw_icon(width: int, height: int, palette: list[str]) -> Image.Image:
    """Draw a simple, brand-colored geometric mark on a transparent canvas —
    a stand-in 'icon' placeholder that still reads as a logo symbol."""
    colors = palette or PALETTE_FALLBACK
    accent = colors[1] if len(colors) > 1 else colors[0]
    base = colors[0]
    rgb_accent, rgb_base = _hex_to_rgb(accent), _hex_to_rgb(base)

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    m = int(min(width, height) * 0.18)
    box = [m, m, width - m, height - m]
    # rounded square frame in the brand base color
    draw.rounded_rectangle(box, radius=int(min(width, height) * 0.22), outline=rgb_base, width=max(4, int(min(width, height) * 0.06)))
    # inner diamond / mark in the accent color
    cx, cy = width / 2, height / 2
    r = min(width, height) * 0.22
    draw.polygon(
        [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)],
        fill=rgb_accent,
    )
    return img


def _generate_placeholder(prompt: str, width: int, height: int, palette: list[str]) -> bytes:
    colors = palette or PALETTE_FALLBACK
    base = colors[0]

    p = (prompt or "").lower()
    if any(k in p for k in ICON_KEYWORDS) and width <= max(height * 2, 600):
        img = _draw_icon(width, height, colors)
    else:
        img = _draw_gradient(width, height, base)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _generate_replicate(prompt: str, width: int, height: int) -> bytes | None:
    if not settings.replicate_api_token:
        return None
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            create = await client.post(
                "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
                headers={"Authorization": f"Bearer {settings.replicate_api_token}"},
                json={"input": {"prompt": prompt, "width": width, "height": height}},
            )
            create.raise_for_status()
            prediction = create.json()
            get_url = prediction["urls"]["get"]

            for _ in range(30):
                poll = await client.get(
                    get_url, headers={"Authorization": f"Bearer {settings.replicate_api_token}"}
                )
                data = poll.json()
                if data["status"] == "succeeded":
                    image_url = data["output"][0] if isinstance(data["output"], list) else data["output"]
                    img_resp = await client.get(image_url)
                    return img_resp.content
                if data["status"] == "failed":
                    return None
                import asyncio

                await asyncio.sleep(1)
    except Exception:
        return None
    return None


async def _generate_pollinations(prompt: str, width: int, height: int) -> bytes | None:
    """Free, key-less AI image generation via Pollinations.ai (Flux-backed).
    Returns raw image bytes, or None on any failure (so we can fall back)."""
    if not settings.use_pollinations:
        return None
    try:
        from urllib.parse import quote

        safe = (prompt or "abstract design element").replace("\n", " ")
        url = (
            "https://image.pollinations.ai/prompt/"
            f"{quote(safe)}?width={width}&height={height}&nologo=true&model=flux&enhance=true"
        )
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.content[:4] in (b"\x89PNG", b"\xff\xd8\xff"):
                return resp.content
    except Exception:
        return None
    return None


async def generate_image(prompt: str, width: int, height: int, palette: list[str]) -> str:
    """Returns a URL (local static path) to the generated image.

    Order of providers: Replicate (if token set) → Pollinations (free, key-less)
    → offline procedural placeholder.
    """
    width, height = max(int(width), 32), max(int(height), 32)

    image_bytes = await _generate_replicate(prompt, width, height)
    if image_bytes is None:
        image_bytes = await _generate_pollinations(prompt, width, height)
    if image_bytes is None:
        image_bytes = _generate_placeholder(prompt, width, height, palette)

    os.makedirs(settings.asset_storage_dir, exist_ok=True)
    ext = "png" if image_bytes[:4] == b"\x89PNG" else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(settings.asset_storage_dir, filename)
    with open(path, "wb") as f:
        f.write(image_bytes)

    return f"/static/{filename}"
