import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db import init_db
from routers import assets, designs, generate

app = FastAPI(title="AI Design Studio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.asset_storage_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.asset_storage_dir), name="static")

app.include_router(designs.router)
app.include_router(generate.router)
app.include_router(assets.router)


@app.on_event("startup")
async def on_startup():
    await init_db()


@app.get("/")
async def root():
    return {"status": "ok", "service": "ai-design-studio-backend"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
