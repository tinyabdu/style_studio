import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class Design(Base):
    __tablename__ = "designs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    title: Mapped[str] = mapped_column(String, default="Untitled design")
    canvas_width: Mapped[int] = mapped_column(default=1080)
    canvas_height: Mapped[int] = mapped_column(default=1080)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    layers_json: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    jobs: Mapped[list["GenerationJob"]] = relationship(back_populates="design")


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    design_id: Mapped[str | None] = mapped_column(ForeignKey("designs.id"), nullable=True)
    prompt: Mapped[str] = mapped_column(Text)
    design_type: Mapped[str] = mapped_column(String, default="social_post")
    status: Mapped[str] = mapped_column(String, default="queued")
    current_step: Mapped[str | None] = mapped_column(String, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    design: Mapped[Design | None] = relationship(back_populates="jobs")
