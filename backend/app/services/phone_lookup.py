import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.phone import ContactTag, IntelSource, PhoneLookupLog, PhoneNumber, SocialPlatform, SocialProfile
from app.redis_client import CacheService

settings = get_settings()

E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def normalize_phone(raw: str) -> tuple[str, str]:
    digits = re.sub(r"\D", "", raw.strip())
    if not digits:
        raise ValueError("Invalid phone number")

    if raw.strip().startswith("+"):
        e164 = f"+{digits}"
    elif digits.startswith("8") and len(digits) == 11:
        e164 = f"+7{digits[1:]}"
    elif digits.startswith("7") and len(digits) == 11:
        e164 = f"+{digits}"
    elif len(digits) == 10:
        e164 = f"+1{digits}"
    else:
        e164 = f"+{digits}"

    if not E164_RE.match(e164):
        raise ValueError("Phone number format is invalid")

    return e164, raw.strip()


class PhoneIntelProvider(ABC):
    name: str

    @abstractmethod
    async def lookup(self, e164: str, db: AsyncSession) -> dict[str, Any]:
        pass


class InternalDatabaseProvider(PhoneIntelProvider):
    name = "internal_database"

    async def lookup(self, e164: str, db: AsyncSession) -> dict[str, Any]:
        result = await db.execute(
            select(PhoneNumber).where(PhoneNumber.e164 == e164)
        )
        phone = result.scalar_one_or_none()
        if not phone:
            return {"contact_tags": [], "social_profiles": [], "carrier": None}

        tags_result = await db.execute(
            select(ContactTag).where(ContactTag.phone_id == phone.id).order_by(ContactTag.recorded_at.desc())
        )
        profiles_result = await db.execute(
            select(SocialProfile).where(SocialProfile.phone_id == phone.id).order_by(SocialProfile.confidence.desc())
        )

        return {
            "carrier": {
                "name": phone.carrier,
                "line_type": phone.line_type,
                "region": phone.region,
                "country_code": phone.country_code,
            } if phone.carrier else None,
            "contact_tags": [
                {
                    "id": str(t.id),
                    "tag_name": t.tag_name,
                    "source": t.source.value,
                    "source_detail": t.source_detail,
                    "confidence": t.confidence,
                    "reported_by": t.reported_by,
                    "recorded_at": t.recorded_at.isoformat(),
                    "properties": t.properties,
                }
                for t in tags_result.scalars().all()
            ],
            "social_profiles": [
                {
                    "id": str(p.id),
                    "platform": p.platform.value,
                    "username": p.username,
                    "display_name": p.display_name,
                    "profile_url": p.profile_url,
                    "avatar_url": p.avatar_url,
                    "source": p.source.value,
                    "confidence": p.confidence,
                    "is_verified": p.is_verified,
                    "discovered_at": p.discovered_at.isoformat(),
                    "last_seen_at": p.last_seen_at.isoformat() if p.last_seen_at else None,
                    "properties": p.properties,
                }
                for p in profiles_result.scalars().all()
            ],
        }


class NumverifyProvider(PhoneIntelProvider):
    name = "numverify"

    async def lookup(self, e164: str, db: AsyncSession) -> dict[str, Any]:
        api_key = settings.NUMVERIFY_API_KEY
        if not api_key:
            return {"carrier": None}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "http://apilayer.net/api/validate",
                    params={"access_key": api_key, "number": e164, "format": 1},
                )
                if resp.status_code != 200:
                    return {"carrier": None}
                data = resp.json()
                if not data.get("valid"):
                    return {"carrier": None, "is_valid": False}
                return {
                    "carrier": {
                        "name": data.get("carrier"),
                        "line_type": data.get("line_type"),
                        "region": f"{data.get('location', '')} {data.get('country_name', '')}".strip(),
                        "country_code": data.get("country_code"),
                    },
                    "is_valid": True,
                    "national": data.get("local_format"),
                }
        except Exception:
            return {"carrier": None}


class TwilioLookupProvider(PhoneIntelProvider):
    """Enterprise carrier + CNAM + fraud signals via official Twilio Lookup API."""

    name = "twilio_lookup"

    async def lookup(self, e164: str, db: AsyncSession) -> dict[str, Any]:
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            return {"carrier": None, "contact_tags": []}

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"https://lookups.twilio.com/v2/PhoneNumbers/{e164}",
                    params={"Fields": "line_type_intelligence,caller_name"},
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                )
                if resp.status_code != 200:
                    return {"carrier": None}

                data = resp.json()
                line_intel = data.get("line_type_intelligence", {}) or {}
                caller_name = data.get("caller_name", {}) or {}

                result: dict[str, Any] = {
                    "carrier": {
                        "name": line_intel.get("carrier_name"),
                        "line_type": line_intel.get("type"),
                        "region": f"{data.get('country_code', '')} {line_intel.get('mobile_country_code', '')}".strip(),
                        "country_code": data.get("country_code"),
                    },
                    "national": data.get("national_format"),
                    "is_valid": data.get("valid", True),
                }

                cnam = caller_name.get("caller_name")
                if cnam and caller_name.get("caller_type") != "UNDETERMINED":
                    result["contact_tags"] = [{
                        "id": f"twilio-cnam-{e164}",
                        "tag_name": cnam,
                        "source": IntelSource.CARRIER_API.value,
                        "source_detail": "twilio_cnam",
                        "confidence": 0.75,
                        "reported_by": None,
                        "recorded_at": datetime.now(timezone.utc).isoformat(),
                        "properties": {"caller_type": caller_name.get("caller_type")},
                    }]

                return result
        except Exception:
            return {"carrier": None}


class CarrierLookupProvider(NumverifyProvider):
    """Backward-compatible alias."""
    name = "carrier_api"


class SocialSearchLinksProvider(PhoneIntelProvider):
    """Generates direct search URLs for manual OSINT verification."""

    name = "social_search_links"

    PLATFORM_URLS = {
        "telegram": "https://t.me/{username}",
        "instagram": "https://instagram.com/{username}",
        "facebook": "https://facebook.com/{username}",
        "viber": "https://chats.viber.com/{username}",
        "whatsapp": "https://wa.me/{phone}",
        "twitter": "https://twitter.com/{username}",
        "linkedin": "https://linkedin.com/in/{username}",
        "tiktok": "https://tiktok.com/@{username}",
        "vk": "https://vk.com/{username}",
    }

    async def lookup(self, e164: str, db: AsyncSession) -> dict[str, Any]:
        phone_digits = e164.lstrip("+")
        search_links = [
            {
                "platform": "google",
                "label": "Google Search",
                "url": f"https://www.google.com/search?q={e164}",
                "type": "search",
            },
            {
                "platform": "telegram",
                "label": "Telegram (by phone)",
                "url": f"https://t.me/+{phone_digits}",
                "type": "deep_link",
            },
            {
                "platform": "whatsapp",
                "label": "WhatsApp",
                "url": f"https://wa.me/{phone_digits}",
                "type": "deep_link",
            },
            {
                "platform": "truecaller",
                "label": "Truecaller Web",
                "url": f"https://www.truecaller.com/search/{phone_digits}",
                "type": "search",
            },
        ]
        return {"search_links": search_links}


class PhoneLookupService:
    def __init__(self):
        self.providers: list[PhoneIntelProvider] = [
            InternalDatabaseProvider(),
            TwilioLookupProvider(),
            NumverifyProvider(),
            SocialSearchLinksProvider(),
        ]

    async def lookup(
        self,
        db: AsyncSession,
        cache: CacheService,
        raw_phone: str,
        user_id: uuid.UUID,
    ) -> dict[str, Any]:
        import time

        start = time.perf_counter()
        e164, query_raw = normalize_phone(raw_phone)

        cache_key = f"phone_lookup:{e164}"
        cached = await cache.get(cache_key)
        if cached:
            cached["cached"] = True
            cached["took_ms"] = round((time.perf_counter() - start) * 1000, 2)
            return cached

        merged: dict[str, Any] = {
            "e164": e164,
            "query_raw": query_raw,
            "contact_tags": [],
            "social_profiles": [],
            "search_links": [],
            "carrier": None,
            "providers_used": [],
            "risk_indicators": [],
        }

        for provider in self.providers:
            try:
                result = await provider.lookup(e164, db)
                merged["providers_used"].append(provider.name)

                if result.get("contact_tags"):
                    existing = {t["tag_name"] for t in merged["contact_tags"]}
                    for tag in result["contact_tags"]:
                        if tag["tag_name"] not in existing:
                            merged["contact_tags"].append(tag)
                            existing.add(tag["tag_name"])

                if result.get("social_profiles"):
                    existing = {(p["platform"], p.get("username")) for p in merged["social_profiles"]}
                    for profile in result["social_profiles"]:
                        key = (profile["platform"], profile.get("username"))
                        if key not in existing:
                            merged["social_profiles"].append(profile)
                            existing.add(key)

                if result.get("search_links"):
                    merged["search_links"].extend(result["search_links"])

                if result.get("carrier") and not merged["carrier"]:
                    merged["carrier"] = result["carrier"]

                if result.get("national"):
                    merged["national"] = result["national"]

                if result.get("is_valid") is False:
                    merged["is_valid"] = False

            except Exception:
                continue

        merged["contact_tags"].sort(key=lambda t: t.get("recorded_at", ""), reverse=True)
        merged["social_profiles"].sort(key=lambda p: p.get("confidence", 0), reverse=True)
        merged["tag_count"] = len(merged["contact_tags"])
        merged["profile_count"] = len(merged["social_profiles"])
        merged["took_ms"] = round((time.perf_counter() - start) * 1000, 2)
        merged["is_valid"] = merged.get("is_valid", True)

        if merged["tag_count"] >= 5:
            merged["risk_indicators"].append({
                "type": "high_visibility",
                "label": "High contact book exposure",
                "severity": "medium",
            })

        await self._log_lookup(db, e164, query_raw, user_id, merged)
        await cache.set(cache_key, merged, ttl=300)
        return merged

    async def _log_lookup(
        self,
        db: AsyncSession,
        e164: str,
        query_raw: str,
        user_id: uuid.UUID,
        result: dict[str, Any],
    ) -> None:
        phone_result = await db.execute(select(PhoneNumber).where(PhoneNumber.e164 == e164))
        phone = phone_result.scalar_one_or_none()
        if not phone:
            phone = PhoneNumber(e164=e164, carrier=result.get("carrier", {}).get("name") if result.get("carrier") else None)
            db.add(phone)
            await db.flush()

        log = PhoneLookupLog(
            phone_id=phone.id,
            user_id=user_id,
            query_raw=query_raw,
            providers_used=result.get("providers_used", []),
            result_summary={
                "tag_count": result.get("tag_count", 0),
                "profile_count": result.get("profile_count", 0),
            },
        )
        db.add(log)

    async def add_contact_tag(
        self,
        db: AsyncSession,
        e164: str,
        tag_name: str,
        source: IntelSource,
        user_id: uuid.UUID,
        source_detail: Optional[str] = None,
        recorded_at: Optional[datetime] = None,
    ) -> ContactTag:
        phone = await self._get_or_create_phone(db, e164)
        tag = ContactTag(
            phone_id=phone.id,
            tag_name=tag_name,
            source=source,
            source_detail=source_detail,
            reported_by=str(user_id),
            recorded_at=recorded_at or datetime.now(timezone.utc),
            confidence=1.0,
        )
        db.add(tag)
        await db.flush()
        return tag

    async def add_social_profile(
        self,
        db: AsyncSession,
        e164: str,
        platform: SocialPlatform,
        profile_url: str,
        username: Optional[str] = None,
        display_name: Optional[str] = None,
        source: IntelSource = IntelSource.INVESTIGATOR,
    ) -> SocialProfile:
        phone = await self._get_or_create_phone(db, e164)
        profile = SocialProfile(
            phone_id=phone.id,
            platform=platform,
            username=username,
            display_name=display_name,
            profile_url=profile_url,
            source=source,
            discovered_at=datetime.now(timezone.utc),
            confidence=0.95,
        )
        db.add(profile)
        await db.flush()
        return profile

    async def _get_or_create_phone(self, db: AsyncSession, e164: str) -> PhoneNumber:
        result = await db.execute(select(PhoneNumber).where(PhoneNumber.e164 == e164))
        phone = result.scalar_one_or_none()
        if phone:
            return phone
        phone = PhoneNumber(e164=e164)
        db.add(phone)
        await db.flush()
        return phone

    async def get_lookup_history(self, db: AsyncSession, user_id: uuid.UUID, limit: int = 20) -> list[dict]:
        result = await db.execute(
            select(PhoneLookupLog, PhoneNumber)
            .join(PhoneNumber, PhoneLookupLog.phone_id == PhoneNumber.id)
            .where(PhoneLookupLog.user_id == user_id)
            .order_by(PhoneLookupLog.created_at.desc())
            .limit(limit)
        )
        rows = result.all()
        return [
            {
                "id": str(log.id),
                "e164": phone.e164,
                "query_raw": log.query_raw,
                "tag_count": log.result_summary.get("tag_count", 0),
                "profile_count": log.result_summary.get("profile_count", 0),
                "created_at": log.created_at.isoformat(),
            }
            for log, phone in rows
        ]


async def seed_phone_intel(db: AsyncSession) -> None:
    """Seed demo intelligence data for testing and demos."""
    service = PhoneLookupService()
    demo_numbers = [
        {
            "e164": "+79001234567",
            "carrier": "MTS",
            "line_type": "mobile",
            "region": "Moscow, Russia",
            "country_code": "RU",
            "tags": [
                ("Алексей Иванов", IntelSource.IMPORTED, "contact_import_batch_2024_q3", "2024-08-15T14:22:00Z"),
                ("Лёха Работа", IntelSource.IMPORTED, "contact_import_batch_2024_q3", "2024-08-15T14:22:00Z"),
                ("Alex Ivanov", IntelSource.OSINT_PUBLIC, "public_directory", "2024-06-01T09:00:00Z"),
                ("Алик", IntelSource.IMPORTED, "crowdsourced_intel_feed", "2024-11-20T18:45:00Z"),
                ("Иванов А.А.", IntelSource.INVESTIGATOR, "case_file_2847", "2025-01-10T11:30:00Z"),
                ("Курьер", IntelSource.IMPORTED, "crowdsourced_intel_feed", "2024-12-05T08:15:00Z"),
            ],
            "profiles": [
                (SocialPlatform.TELEGRAM, "alex_ivanov_msk", "Алексей Иванов", "https://t.me/alex_ivanov_msk"),
                (SocialPlatform.INSTAGRAM, "alex.ivanov.official", "Alex Ivanov", "https://instagram.com/alex.ivanov.official"),
                (SocialPlatform.FACEBOOK, "alex.ivanov.92", "Alexey Ivanov", "https://facebook.com/alex.ivanov.92"),
                (SocialPlatform.VIBER, None, "Алексей", "viber://chat?number=79001234567"),
                (SocialPlatform.WHATSAPP, None, "Alex", "https://wa.me/79001234567"),
                (SocialPlatform.VK, "id2847291", "Алексей Иванов", "https://vk.com/id2847291"),
            ],
        },
        {
            "e164": "+14155550100",
            "carrier": "T-Mobile",
            "line_type": "mobile",
            "region": "San Francisco, CA",
            "country_code": "US",
            "tags": [
                ("John Smith CEO", IntelSource.IMPORTED, "business_contacts_feed", "2024-09-12T16:00:00Z"),
                ("Johnny", IntelSource.IMPORTED, "crowdsourced_intel_feed", "2024-10-01T12:00:00Z"),
                ("JS - Vindicta", IntelSource.INVESTIGATOR, "internal_crm", "2025-02-01T10:00:00Z"),
            ],
            "profiles": [
                (SocialPlatform.LINKEDIN, "johnsmith-sf", "John Smith", "https://linkedin.com/in/johnsmith-sf"),
                (SocialPlatform.TWITTER, "johnsmith_sf", "John Smith", "https://twitter.com/johnsmith_sf"),
                (SocialPlatform.TELEGRAM, "johnsmith_sf", "John", "https://t.me/johnsmith_sf"),
            ],
        },
    ]

    for demo in demo_numbers:
        existing = await db.execute(select(PhoneNumber).where(PhoneNumber.e164 == demo["e164"]))
        if existing.scalar_one_or_none():
            continue

        phone = PhoneNumber(
            e164=demo["e164"],
            carrier=demo["carrier"],
            line_type=demo["line_type"],
            region=demo["region"],
            country_code=demo["country_code"],
        )
        db.add(phone)
        await db.flush()

        for tag_name, source, detail, recorded in demo["tags"]:
            db.add(ContactTag(
                phone_id=phone.id,
                tag_name=tag_name,
                source=source,
                source_detail=detail,
                recorded_at=datetime.fromisoformat(recorded.replace("Z", "+00:00")),
                confidence=0.85 if source == IntelSource.IMPORTED else 0.95,
            ))

        for platform, username, display_name, url in demo["profiles"]:
            db.add(SocialProfile(
                phone_id=phone.id,
                platform=platform,
                username=username,
                display_name=display_name,
                profile_url=url,
                source=IntelSource.DEMO,
                discovered_at=datetime.now(timezone.utc),
                confidence=0.9,
            ))

    await db.flush()
