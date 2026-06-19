import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import TimelineEvent, TimelineEventType, User
from app.schemas import TimelineEventCreate, TimelineEventResponse
from app.services import InvestigationService

router = APIRouter()


@router.get("/investigation/{investigation_id}", response_model=list[TimelineEventResponse])
async def list_timeline_events(
    investigation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.get_by_id(db, investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.investigation_id == investigation_id)
        .order_by(TimelineEvent.occurred_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=TimelineEventResponse, status_code=status.HTTP_201_CREATED)
async def create_timeline_event(
    payload: TimelineEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    investigation = await InvestigationService.get_by_id(db, payload.investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    event = TimelineEvent(
        title=payload.title,
        description=payload.description,
        event_type=TimelineEventType(payload.event_type),
        occurred_at=payload.occurred_at,
        properties=payload.properties,
        entity_ids=payload.entity_ids,
        investigation_id=payload.investigation_id,
    )
    db.add(event)
    await db.flush()
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_timeline_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TimelineEvent).where(TimelineEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    investigation = await InvestigationService.get_by_id(db, event.investigation_id, current_user.id)
    if not investigation:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(event)
