import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.models import (
    Entity,
    EntityType,
    Investigation,
    InvestigationPriority,
    InvestigationStatus,
    OAuthProvider,
    Report,
    ReportStatus,
    TimelineEvent,
    User,
)
from app.neo4j_client import GraphService
from app.redis_client import CacheService

settings = get_settings()


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, email: str, password: str, full_name: str) -> User:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            oauth_provider=OAuthProvider.LOCAL,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_tokens(user: User) -> dict[str, str]:
        subject = str(user.id)
        return {
            "access_token": create_access_token(subject, {"email": user.email}),
            "refresh_token": create_refresh_token(subject),
            "token_type": "bearer",
        }

    @staticmethod
    def get_google_auth_url(redirect_uri: str) -> str:
        if not settings.GOOGLE_CLIENT_ID:
            raise ValueError("Google OAuth is not configured")
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    @staticmethod
    async def handle_google_callback(db: AsyncSession, code: str, redirect_uri: str) -> User:
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Google OAuth is not configured")

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            user_resp.raise_for_status()
            google_user = user_resp.json()

        return await AuthService._get_or_create_oauth_user(
            db,
            email=google_user["email"],
            full_name=google_user.get("name", google_user["email"]),
            avatar_url=google_user.get("picture"),
            provider=OAuthProvider.GOOGLE,
            oauth_id=google_user["id"],
        )

    @staticmethod
    def get_apple_auth_url(redirect_uri: str) -> str:
        if not settings.APPLE_CLIENT_ID:
            raise ValueError("Apple OAuth is not configured")
        params = {
            "client_id": settings.APPLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "name email",
            "response_mode": "form_post",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"https://appleid.apple.com/auth/authorize?{query}"

    @staticmethod
    async def handle_apple_callback(db: AsyncSession, code: str, redirect_uri: str) -> User:
        if not all([settings.APPLE_CLIENT_ID, settings.APPLE_TEAM_ID, settings.APPLE_KEY_ID, settings.APPLE_PRIVATE_KEY]):
            raise ValueError("Apple OAuth is not configured")

        from jose import jwt as jose_jwt

        now = datetime.now(timezone.utc)
        client_secret = jose_jwt.encode(
            {
                "iss": settings.APPLE_TEAM_ID,
                "iat": int(now.timestamp()),
                "exp": int((now.timestamp()) + 3600),
                "aud": "https://appleid.apple.com",
                "sub": settings.APPLE_CLIENT_ID,
            },
            settings.APPLE_PRIVATE_KEY,
            algorithm="ES256",
            headers={"kid": settings.APPLE_KEY_ID},
        )

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://appleid.apple.com/auth/token",
                data={
                    "client_id": settings.APPLE_CLIENT_ID,
                    "client_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            id_token = tokens.get("id_token", "")
            claims = jose_jwt.get_unverified_claims(id_token)

        email = claims.get("email", f"apple_{claims.get('sub', 'user')}@privaterelay.appleid.com")
        return await AuthService._get_or_create_oauth_user(
            db,
            email=email,
            full_name=email.split("@")[0].replace(".", " ").title(),
            avatar_url=None,
            provider=OAuthProvider.APPLE,
            oauth_id=claims.get("sub", ""),
        )

    @staticmethod
    async def _get_or_create_oauth_user(
        db: AsyncSession,
        email: str,
        full_name: str,
        avatar_url: Optional[str],
        provider: OAuthProvider,
        oauth_id: str,
    ) -> User:
        result = await db.execute(
            select(User).where(
                (User.email == email) | ((User.oauth_provider == provider) & (User.oauth_id == oauth_id))
            )
        )
        user = result.scalar_one_or_none()
        if user:
            user.full_name = full_name
            if avatar_url:
                user.avatar_url = avatar_url
            user.is_verified = True
            await db.flush()
            return user

        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            oauth_provider=provider,
            oauth_id=oauth_id,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        return user


class InvestigationService:
    @staticmethod
    async def list_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[dict[str, Any]]:
        result = await db.execute(
            select(Investigation).where(Investigation.owner_id == user_id).order_by(Investigation.updated_at.desc())
        )
        investigations = result.scalars().all()
        output = []
        for inv in investigations:
            entity_count = await db.scalar(
                select(func.count()).select_from(Entity).where(Entity.investigation_id == inv.id)
            )
            event_count = await db.scalar(
                select(func.count()).select_from(TimelineEvent).where(TimelineEvent.investigation_id == inv.id)
            )
            output.append({
                **{c.name: getattr(inv, c.name) for c in Investigation.__table__.columns},
                "entity_count": entity_count or 0,
                "event_count": event_count or 0,
            })
        return output

    @staticmethod
    async def get_by_id(db: AsyncSession, investigation_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Investigation]:
        result = await db.execute(
            select(Investigation).where(
                Investigation.id == investigation_id,
                Investigation.owner_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, user_id: uuid.UUID, data: dict[str, Any]) -> Investigation:
        investigation = Investigation(
            title=data["title"],
            description=data.get("description"),
            priority=InvestigationPriority(data.get("priority", "medium")),
            tags=data.get("tags", []),
            owner_id=user_id,
            status=InvestigationStatus.ACTIVE,
        )
        db.add(investigation)
        await db.flush()
        return investigation


class SearchService:
    @staticmethod
    async def search(
        db: AsyncSession,
        graph: GraphService,
        cache: CacheService,
        query: str,
        entity_types: Optional[list[str]] = None,
        investigation_id: Optional[uuid.UUID] = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        import time

        start = time.perf_counter()
        cache_key = f"search:{query}:{entity_types}:{investigation_id}:{limit}"
        cached = await cache.get(cache_key)
        if cached:
            cached["took_ms"] = round((time.perf_counter() - start) * 1000, 2)
            cached["cached"] = True
            return cached

        results: list[dict[str, Any]] = []

        pg_query = select(Entity).where(
            or_(
                Entity.name.ilike(f"%{query}%"),
                Entity.description.ilike(f"%{query}%"),
            )
        )
        if entity_types:
            pg_query = pg_query.where(Entity.entity_type.in_([EntityType(t) for t in entity_types]))
        if investigation_id:
            pg_query = pg_query.where(Entity.investigation_id == investigation_id)
        pg_query = pg_query.limit(limit)

        pg_result = await db.execute(pg_query)
        for entity in pg_result.scalars().all():
            results.append({
                "id": str(entity.id),
                "name": entity.name,
                "entity_type": entity.entity_type.value,
                "description": entity.description,
                "risk_score": entity.risk_score,
                "source": "database",
                "properties": entity.properties,
            })

        try:
            neo_results = await graph.search_entities(query, limit=limit)
            for node in neo_results:
                node_id = node.get("id", "")
                if not any(r["id"] == node_id for r in results):
                    results.append({
                        "id": node_id,
                        "name": node.get("name", ""),
                        "entity_type": node.get("type", "other"),
                        "description": None,
                        "risk_score": 0.0,
                        "source": "graph",
                        "properties": {k: v for k, v in node.items() if k not in ("id", "name", "type")},
                    })
        except Exception:
            pass

        results = results[:limit]
        response = {
            "query": query,
            "total": len(results),
            "results": results,
            "took_ms": round((time.perf_counter() - start) * 1000, 2),
        }
        await cache.set(cache_key, response, ttl=120)
        return response


class DashboardService:
    @staticmethod
    async def get_stats(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
        inv_result = await db.execute(select(Investigation).where(Investigation.owner_id == user_id))
        investigations = inv_result.scalars().all()
        inv_ids = [i.id for i in investigations]

        entity_count = 0
        event_count = 0
        high_risk = 0
        if inv_ids:
            entity_count = await db.scalar(
                select(func.count()).select_from(Entity).where(Entity.investigation_id.in_(inv_ids))
            ) or 0
            event_count = await db.scalar(
                select(func.count()).select_from(TimelineEvent).where(TimelineEvent.investigation_id.in_(inv_ids))
            ) or 0
            high_risk = await db.scalar(
                select(func.count()).select_from(Entity).where(
                    Entity.investigation_id.in_(inv_ids), Entity.risk_score >= 70
                )
            ) or 0

        report_count = await db.scalar(
            select(func.count()).select_from(Report).where(Report.owner_id == user_id)
        ) or 0

        active = sum(1 for i in investigations if i.status == InvestigationStatus.ACTIVE)

        recent: list[dict[str, Any]] = []
        for inv in sorted(investigations, key=lambda x: x.updated_at, reverse=True)[:5]:
            recent.append({
                "type": "investigation",
                "id": str(inv.id),
                "title": inv.title,
                "status": inv.status.value,
                "timestamp": inv.updated_at.isoformat(),
            })

        return {
            "total_investigations": len(investigations),
            "active_investigations": active,
            "total_entities": entity_count,
            "total_events": event_count,
            "total_reports": report_count,
            "high_risk_entities": high_risk,
            "recent_activity": recent,
        }


class ReportService:
    @staticmethod
    async def generate_content(db: AsyncSession, investigation_id: uuid.UUID) -> dict[str, Any]:
        inv_result = await db.execute(select(Investigation).where(Investigation.id == investigation_id))
        investigation = inv_result.scalar_one_or_none()
        if not investigation:
            return {}

        entities_result = await db.execute(
            select(Entity).where(Entity.investigation_id == investigation_id)
        )
        entities = entities_result.scalars().all()

        events_result = await db.execute(
            select(TimelineEvent)
            .where(TimelineEvent.investigation_id == investigation_id)
            .order_by(TimelineEvent.occurred_at.desc())
        )
        events = events_result.scalars().all()

        return {
            "summary": f"Investigation report for '{investigation.title}'",
            "investigation": {
                "id": str(investigation.id),
                "title": investigation.title,
                "status": investigation.status.value,
                "priority": investigation.priority.value,
            },
            "entities": [
                {
                    "id": str(e.id),
                    "name": e.name,
                    "type": e.entity_type.value,
                    "risk_score": e.risk_score,
                }
                for e in entities
            ],
            "timeline": [
                {
                    "id": str(ev.id),
                    "title": ev.title,
                    "type": ev.event_type.value,
                    "occurred_at": ev.occurred_at.isoformat(),
                }
                for ev in events
            ],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
