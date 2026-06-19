from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.neo4j_client import GraphService, get_neo4j_driver
from app.redis_client import CacheService, get_redis
from app.schemas import SearchRequest, SearchResponse, SearchResult
from app.services import SearchService

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search_entities(
    payload: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()
    cache = CacheService(redis)
    driver = await get_neo4j_driver()
    graph = GraphService(driver)

    result = await SearchService.search(
        db,
        graph,
        cache,
        payload.query,
        payload.entity_types,
        payload.investigation_id,
        payload.limit,
    )
    return SearchResponse(
        query=result["query"],
        total=result["total"],
        results=[SearchResult(**r) for r in result["results"]],
        took_ms=result["took_ms"],
    )


@router.get("", response_model=SearchResponse)
async def search_entities_get(
    q: str,
    entity_types: Optional[str] = None,
    investigation_id: Optional[UUID] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    types_list = entity_types.split(",") if entity_types else None
    payload = SearchRequest(
        query=q,
        entity_types=types_list,
        investigation_id=investigation_id,
        limit=limit,
    )
    return await search_entities(payload, current_user, db)
