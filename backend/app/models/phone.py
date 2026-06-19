import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IntelSource(str, enum.Enum):
    INTERNAL = "internal"
    IMPORTED = "imported"
    INVESTIGATOR = "investigator"
    OSINT_PUBLIC = "osint_public"
    CARRIER_API = "carrier_api"
    DEMO = "demo"


class SocialPlatform(str, enum.Enum):
    TELEGRAM = "telegram"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    VIBER = "viber"
    WHATSAPP = "whatsapp"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    VK = "vk"
    OTHER = "other"


class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    e164: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    national: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(5), nullable=True)
    carrier: Mapped[str | None] = mapped_column(String(128), nullable=True)
    line_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_valid: Mapped[bool] = mapped_column(default=True, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    contact_tags: Mapped[list["ContactTag"]] = relationship(back_populates="phone", cascade="all, delete-orphan")
    social_profiles: Mapped[list["SocialProfile"]] = relationship(
        back_populates="phone", cascade="all, delete-orphan"
    )
    lookup_history: Mapped[list["PhoneLookupLog"]] = relationship(
        back_populates="phone", cascade="all, delete-orphan"
    )


class ContactTag(Base):
    __tablename__ = "contact_tags"
    __table_args__ = (UniqueConstraint("phone_id", "tag_name", "source", name="uq_contact_tag"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("phone_numbers.id"), nullable=False)
    tag_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source: Mapped[IntelSource] = mapped_column(Enum(IntelSource), nullable=False)
    source_detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    reported_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    properties: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    phone: Mapped["PhoneNumber"] = relationship(back_populates="contact_tags")


class SocialProfile(Base):
    __tablename__ = "social_profiles"
    __table_args__ = (UniqueConstraint("phone_id", "platform", "username", name="uq_social_profile"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("phone_numbers.id"), nullable=False)
    platform: Mapped[SocialPlatform] = mapped_column(Enum(SocialPlatform), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    profile_url: Mapped[str] = mapped_column(String(512), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source: Mapped[IntelSource] = mapped_column(Enum(IntelSource), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.8, nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    properties: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    phone: Mapped["PhoneNumber"] = relationship(back_populates="social_profiles")


class PhoneLookupLog(Base):
    __tablename__ = "phone_lookup_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("phone_numbers.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    query_raw: Mapped[str] = mapped_column(String(50), nullable=False)
    providers_used: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    result_summary: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    phone: Mapped["PhoneNumber"] = relationship(back_populates="lookup_history")
