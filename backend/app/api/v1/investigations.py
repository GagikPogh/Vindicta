import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Entity, EntityType, Investigation, InvestigationPriority, InvestigationStatus, User
from app.neo4j_client import GraphService, get_neo4j_driver
from app.schemas import (
    EntityCreate,
    EntityResponse,
    InvestigationCreate,
    InvestigationResponse,
    InvestigationUpdate,
    MessageResponse,
)
from app.services import InvestigationService

router = APIRouter()


def _to_investigation_response(data: dict) -> InvestigationResponse:
    return InvestigationResponse(
        id=data["id"],
        title=data["title"],
        description=data.get("description"),
        status=data["status"].value if hasattr(data["status"], "value") else data["status"],
        priority=data["priority"].value if hasattr(data["priority"], "value") else data["priority"],
        tags=data.get("tags", []),
        metadata=data.get("metadata_", data.get("metadata", {})),
        owner_id=data["owner_id"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
        entity_count=data.get("entity_count", 0),
        event_count=data.get("event_count", 0),
    )


@router.get("", response_model=list[InvestigationResponse])
async def list_investigations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await InvestigationService.list_for_user(db, current_user.id)
    return [_to_investigation_response(item) for item in items]


@router.post("", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
async def create_investigation(
    payload: InvestigationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.create(db, current_user.id, payload.model_dump())
    return _to_investigation_response({
        **{c.name: getattr(investigation, c.name) for c in Investigation.__table__.columns},
        "entity_count": 0,
        "event_count": 0,
    })


@router.get("/{investigation_id}", response_model=InvestigationResponse)
async def get_investigation(
    investigation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await InvestigationService.list_for_user(db, current_user.id)
    for item in items:
        if item["id"] == investigation_id:
            return _to_investigation_response(item)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")


@router.patch("/{investigation_id}", response_model=InvestigationResponse)
async def update_investigation(
    investigation_id: uuid.UUID,
    payload: InvestigationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.get_by_id(db, investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data:
        investigation.status = InvestigationStatus(update_data.pop("status"))
    if "priority" in update_data:
        investigation.priority = InvestigationPriority(update_data.pop("priority"))
    if "metadata" in update_data:
        investigation.metadata_ = update_data.pop("metadata")
    for key, value in update_data.items():
        setattr(investigation, key, value)

    await db.flush()
    items = await InvestigationService.list_for_user(db, current_user.id)
    for item in items:
        if item["id"] == investigation_id:
            return _to_investigation_response(item)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")


@router.delete("/{investigation_id}", response_model=MessageResponse)
async def delete_investigation(
    investigation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.get_by_id(db, investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    await db.delete(investigation)
    return MessageResponse(message="Investigation deleted")


@router.get("/{investigation_id}/entities", response_model=list[EntityResponse])
async def list_entities(
    investigation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.get_by_id(db, investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    result = await db.execute(select(Entity).where(Entity.investigation_id == investigation_id))
    return result.scalars().all()


@router.post("/{investigation_id}/entities", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(
    investigation_id: uuid.UUID,
    payload: EntityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.get_by_id(db, investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    neo4j_id = f"entity-{uuid.uuid4()}"
    entity = Entity(
        name=payload.name,
        entity_type=EntityType(payload.entity_type),
        description=payload.description,
        properties=payload.properties,
        risk_score=payload.risk_score,
        investigation_id=investigation_id,
        neo4j_id=neo4j_id,
    )
    db.add(entity)
    await db.flush()

    try:
        driver = await get_neo4j_driver()
        graph = GraphService(driver)
        await graph.create_entity_node(
            neo4j_id, payload.name, payload.entity_type, payload.properties
        )
    except Exception:
        pass

    return entity
