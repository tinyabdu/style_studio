from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from db import get_db
from models.design import Design
from schemas import DesignOut, DesignUpdate

router = APIRouter(prefix="/designs", tags=["designs"])


@router.get("", response_model=list[DesignOut])
async def list_designs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).order_by(Design.updated_at.desc()))
    return result.scalars().all()


@router.get("/{design_id}", response_model=DesignOut)
async def get_design(design_id: str, db: AsyncSession = Depends(get_db)):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(404, "Design not found")
    return design


@router.patch("/{design_id}", response_model=DesignOut)
async def update_design(design_id: str, update: DesignUpdate, db: AsyncSession = Depends(get_db)):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(404, "Design not found")
    if update.title is not None:
        design.title = update.title
    if update.layers_json is not None:
        design.layers_json = update.layers_json
    if update.thumbnail_url is not None:
        design.thumbnail_url = update.thumbnail_url
    await db.commit()
    await db.refresh(design)
    return design


@router.delete("/{design_id}")
async def delete_design(design_id: str, db: AsyncSession = Depends(get_db)):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(404, "Design not found")
    await db.delete(design)
    await db.commit()
    return {"ok": True}


@router.post("", response_model=DesignOut)
async def create_blank_design(db: AsyncSession = Depends(get_db)):
    design = Design(title="Untitled design", layers_json=[])
    db.add(design)
    await db.commit()
    await db.refresh(design)
    return design
