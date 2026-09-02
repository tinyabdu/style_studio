import os
import uuid

from fastapi import APIRouter, UploadFile

from config import settings

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/upload")
async def upload_asset(file: UploadFile):
    os.makedirs(settings.asset_storage_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.asset_storage_dir, filename)

    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    return {"url": f"/static/{filename}"}
