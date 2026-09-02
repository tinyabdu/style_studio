from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class LayerSchema(BaseModel):
    id: str
    type: Literal["text", "image", "shape", "icon"]
    x: float
    y: float
    width: float
    height: float
    z_index: int = 0
    props: dict[str, Any] = {}


class DesignOut(BaseModel):
    id: str
    title: str
    canvas_width: int
    canvas_height: int
    thumbnail_url: str | None
    layers_json: list[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DesignUpdate(BaseModel):
    title: str | None = None
    layers_json: list[dict] | None = None
    thumbnail_url: str | None = None


class GenerateRequest(BaseModel):
    prompt: str
    design_type: Literal[
        "social_post", "poster", "presentation_slide", "logo", "banner", "flyer"
    ] = "social_post"
    design_id: str | None = None  # if set, overwrite an existing design


class RegenerateLayerRequest(BaseModel):
    design_id: str
    layer_id: str
    prompt: str | None = None  # optional extra instruction / override prompt


class JobCreated(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    id: str
    status: str
    current_step: str | None
    design_id: str | None
    error: str | None
