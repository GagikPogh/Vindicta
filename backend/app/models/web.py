import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WebNodeType(str, enum.Enum):
    PERSON = "person"
    FRIEND = "friend"
    EVENT = "event"
    PHONE = "phone"
    LOCATION = "location"
    ORGANIZATION = "organization"
    EVIDENCE = "evidence"
    DOCUMENT = "document"
    SUSPECT = "suspect"
    NOTE = "note"


class WebEdgeType(str, enum.Enum):
    KNOWS = "knows"
    FRIEND_OF = "friend_of"
    RELATED_TO = "related_to"
    ATTENDED = "attended"
    CALLED = "called"
    LOCATED_AT = "located_at"
    WORKS_AT = "works_at"
    OWNS = "owns"
    SUSPECTED = "suspected"
    WITNESSED = "witnessed"
    CUSTOM = "custom"


class InvestigationWeb(Base):
    __tablename__ = "investigation_webs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Моя паутина")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_default: Mapped[bool] = mapped_column(default=True, nullable=False)
    viewport: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    theme: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    nodes: Mapped[list["WebNode"]] = relationship(back_populates="web", cascade="all, delete-orphan")
    edges: Mapped[list["WebEdge"]] = relationship(back_populates="web", cascade="all, delete-orphan")


class WebNode(Base):
    __tablename__ = "web_nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    web_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigation_webs.id"), nullable=False, index=True)
    node_type: Mapped[WebNodeType] = mapped_column(Enum(WebNodeType), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    properties: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    web: Mapped["InvestigationWeb"] = relationship(back_populates="nodes")
    outgoing_edges: Mapped[list["WebEdge"]] = relationship(
        back_populates="source_node",
        foreign_keys="WebEdge.source_id",
        cascade="all, delete-orphan",
    )


class WebEdge(Base):
    __tablename__ = "web_edges"
    __table_args__ = (UniqueConstraint("web_id", "source_id", "target_id", "label", name="uq_web_edge"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    web_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigation_webs.id"), nullable=False, index=True)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("web_nodes.id"), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("web_nodes.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False, default="связан с")
    edge_type: Mapped[WebEdgeType] = mapped_column(Enum(WebEdgeType), default=WebEdgeType.CUSTOM, nullable=False)
    properties: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    strength: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    web: Mapped["InvestigationWeb"] = relationship(back_populates="edges")
    source_node: Mapped["WebNode"] = relationship(back_populates="outgoing_edges", foreign_keys=[source_id])
