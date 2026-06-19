from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.models.phone import IntelSource, SocialPlatform
from app.redis_client import CacheService, get_redis
from app.schemas import (
    AddContactTagRequest,
    AddSocialProfileRequest,
    ContactTagResponse,
    MessageResponse,
    PhoneLookupHistoryItem,
    PhoneLookupRequest,
    PhoneLookupResponse,
    SearchLinkResponse,
    SocialProfileResponse,
)
from app.services.phone_lookup import PhoneLookupService, normalize_phone

router = APIRouter()
service = PhoneLookupService()


def _to_response(data: dict) -> PhoneLookupResponse:
    return PhoneLookupResponse(
        e164=data["e164"],
        query_raw=data["query_raw"],
        national=data.get("national"),
        is_valid=data.get("is_valid", True),
        carrier=data.get("carrier"),
        contact_tags=[ContactTagResponse(**t) for t in data.get("contact_tags", [])],
        social_profiles=[SocialProfileResponse(**p) for p in data.get("social_profiles", [])],
        search_links=[SearchLinkResponse(**l) for l in data.get("search_links", [])],
        risk_indicators=data.get("risk_indicators", []),
        tag_count=data.get("tag_count", 0),
        profile_count=data.get("profile_count", 0),
        providers_used=data.get("providers_used", []),
        took_ms=data.get("took_ms", 0),
        cached=data.get("cached", False),
    )


@router.post("/lookup", response_model=PhoneLookupResponse)
async def lookup_phone(
    payload: PhoneLookupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        redis = await get_redis()
        cache = CacheService(redis)
        result = await service.lookup(db, cache, payload.phone, current_user.id)
        return _to_response(result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/lookup", response_model=PhoneLookupResponse)
async def lookup_phone_get(
    phone: str = Query(..., min_length=5, max_length=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        redis = await get_redis()
        cache = CacheService(redis)
        result = await service.lookup(db, cache, phone, current_user.id)
        return _to_response(result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/history", response_model=list[PhoneLookupHistoryItem])
async def lookup_history(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    history = await service.get_lookup_history(db, current_user.id, limit)
    return [PhoneLookupHistoryItem(**h) for h in history]


@router.post("/tags", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_contact_tag(
    payload: AddContactTagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        e164, _ = normalize_phone(payload.phone)
        await service.add_contact_tag(
            db, e164, payload.tag_name, IntelSource.INVESTIGATOR, current_user.id, payload.source_detail
        )
        redis = await get_redis()
        await CacheService(redis).delete(f"phone_lookup:{e164}")
        return MessageResponse(message="Contact tag added")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/profiles", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_social_profile(
    payload: AddSocialProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        e164, _ = normalize_phone(payload.phone)
        await service.add_social_profile(
            db,
            e164,
            SocialPlatform(payload.platform),
            payload.profile_url,
            payload.username,
            payload.display_name,
            IntelSource.INVESTIGATOR,
        )
        redis = await get_redis()
        await CacheService(redis).delete(f"phone_lookup:{e164}")
        return MessageResponse(message="Social profile added")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
