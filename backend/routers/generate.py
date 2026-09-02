from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from agents.graph import design_graph
from agents.llm import call_llm
from db import get_db
from models.design import Design
from schemas import GenerateRequest, JobCreated, RegenerateLayerRequest
from services.image_gen import generate_image

router = APIRouter(prefix="/generate", tags=["generate"])

STEP_LABELS = {
    "brief_parsed": "Understanding your prompt…",
    "layout_planned": "Planning the layout…",
    "assets_generated": "Generating images & picking fonts…",
    "composed": "Composing the design…",
    "qa_checked": "Reviewing composition…",
}


@router.websocket("/stream")
async def generate_stream(ws: WebSocket, db: AsyncSession = Depends(get_db)):
    """The frontend opens this socket, sends one JSON message with the
    GenerateRequest payload, then receives a stream of progress events
    followed by a final { type: "done", design } event."""
    await ws.accept()
    try:
        payload = await ws.receive_json()
        req = GenerateRequest(**payload)

        thread_id = req.design_id or f"gen-{id(req)}"
        config = {"configurable": {"thread_id": thread_id}}

        initial_state = {
            "prompt": req.prompt,
            "design_type": req.design_type,
            "retry_count": 0,
        }

        final_state = None
        async for event in design_graph.astream(initial_state, config=config):
            for node_name, node_output in event.items():
                step = node_output.get("step", node_name)
                await ws.send_json(
                    {
                        "type": "progress",
                        "node": node_name,
                        "label": STEP_LABELS.get(step, step),
                    }
                )
                final_state = node_output

        if final_state is None:
            await ws.send_json({"type": "error", "message": "Generation produced no output."})
            return

        # persist
        if req.design_id:
            design = await db.get(Design, req.design_id)
        else:
            design = None

        if design:
            design.layers_json = final_state["layers"]
            design.canvas_width = final_state["canvas_width"]
            design.canvas_height = final_state["canvas_height"]
        else:
            design = Design(
                title=final_state.get("headline", "Untitled design"),
                canvas_width=final_state["canvas_width"],
                canvas_height=final_state["canvas_height"],
                layers_json=final_state["layers"],
            )
            db.add(design)

        await db.commit()
        await db.refresh(design)

        await ws.send_json(
            {
                "type": "done",
                "design": {
                    "id": design.id,
                    "title": design.title,
                    "canvas_width": design.canvas_width,
                    "canvas_height": design.canvas_height,
                    "layers_json": design.layers_json,
                },
            }
        )
    except WebSocketDisconnect:
        pass
    except Exception as e:  # surface generation errors to the editor instead of hanging
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass


async def _rewrite_copy(current_text: str, instruction: str | None) -> str:
    """Ask Gemini to rewrite a piece of design copy (text layer)."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior design copywriter. Rewrite the given design text. "
                "Return ONLY the rewritten text — no quotes, no commentary, no explanation."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Current text:\n{current_text}\n"
                + (f"Instruction: {instruction}\n" if instruction else "")
                + "Return only the new text."
            ),
        },
    ]
    resp = await call_llm(messages)
    content = resp.content
    if isinstance(content, list):
        content = "".join(b.get("text", "") for b in content if isinstance(b, dict) and "text" in b)
    text = str(content).strip().strip('"').strip("'").strip()
    return text or current_text


@router.post("/regenerate-layer")
async def regenerate_layer(body: RegenerateLayerRequest, db: AsyncSession = Depends(get_db)):
    """Re-generate a single layer with AI: image/icon layers get a fresh AI
    image, text layers get rewritten copy. Returns the updated layer."""
    design = await db.get(Design, body.design_id)
    if not design:
        raise HTTPException(404, "Design not found")

    layers = design.layers_json or []
    layer = next((l for l in layers if l["id"] == body.layer_id), None)
    if not layer:
        raise HTTPException(404, "Layer not found")

    ltype = layer["type"]
    if ltype in ("image", "icon"):
        prompt = body.prompt or layer.get("props", {}).get("description") or design.title
        width = max(int(layer.get("width", 300)), 32)
        height = max(int(layer.get("height", 300)), 32)
        url = await generate_image(prompt=prompt, width=width, height=height, palette=[])
        layer.setdefault("props", {})["src"] = url
    elif ltype == "text":
        current = layer.get("props", {}).get("text", "")
        new_text = await _rewrite_copy(current, body.prompt)
        layer.setdefault("props", {})["text"] = new_text
    else:
        raise HTTPException(400, f"Cannot regenerate a '{ltype}' layer")

    design.layers_json = layers
    await db.commit()
    await db.refresh(design)
    return {"layer": layer}
