import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.models.web import InvestigationWeb, WebEdge, WebNode, WebNodeType
from app.schemas import (
    CreateWebEdgeRequest,
    CreateWebNodeRequest,
    CreateWebRequest,
    InvestigationWebResponse,
    InvestigationWebSummary,
    MessageResponse,
    WebSyncRequest,
    WebSyncResponse,
)
from app.services.web_sync import NODE_COLORS, WebSyncService

router = APIRouter()


@router.get("", response_model=list[InvestigationWebSummary])
async def list_webs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    webs = await WebSyncService.list_webs(db, current_user.id)
    return [InvestigationWebSummary(**w) for w in webs]


@router.get("/default", response_model=InvestigationWebResponse)
async def get_default_web(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    web = await WebSyncService.get_or_create_default(db, current_user.id)
    data = await WebSyncService.get_web_full(db, web.id, current_user.id)
    return InvestigationWebResponse(**data)


@router.get("/{web_id}", response_model=InvestigationWebResponse)
async def get_web(
    web_id: uuid.UUID,
    since_revision: int = Query(default=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await WebSyncService.get_web_full(db, web_id, current_user.id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Web not found")
    if since_revision > 0 and data["revision"] <= since_revision:
        raise HTTPException(status_code=status.HTTP_304_NOT_MODIFIED, detail="Not modified")
    return InvestigationWebResponse(**data)


@router.post("", response_model=InvestigationWebResponse, status_code=status.HTTP_201_CREATED)
async def create_web(
    payload: CreateWebRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    web = InvestigationWeb(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        is_default=False,
    )
    db.add(web)
    await db.flush()
    data = await WebSyncService.get_web_full(db, web.id, current_user.id)
    return InvestigationWebResponse(**data)


@router.post("/{web_id}/sync", response_model=WebSyncResponse)
async def sync_web(
    web_id: uuid.UUID,
    payload: WebSyncRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await WebSyncService.sync_web(db, web_id, current_user.id, payload.model_dump())
    web_data = InvestigationWebResponse(**result["web"]) if result.get("web") else None
    return WebSyncResponse(
        success=result["success"],
        revision=result["revision"],
        conflict=result.get("conflict", False),
        web=web_data,
        message=result.get("message"),
    )


@router.post("/{web_id}/nodes", status_code=status.HTTP_201_CREATED)
async def add_node(
    web_id: uuid.UUID,
    payload: CreateWebNodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    result = await db.execute(
        select(InvestigationWeb).where(InvestigationWeb.id == web_id, InvestigationWeb.user_id == current_user.id)
    )
    web = result.scalar_one_or_none()
    if not web:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Web not found")

    ntype = WebNodeType(payload.node_type)
    node = WebNode(
        web_id=web_id,
        node_type=ntype,
        label=payload.label,
        description=payload.description,
        x=payload.x,
        y=payload.y,
        color=payload.color or NODE_COLORS.get(ntype, "#8b7cf6"),
        properties=payload.properties,
    )
    db.add(node)
    web.revision += 1
    await db.flush()
    return {"id": str(node.id), "label": node.label}


@router.post("/{web_id}/edges", status_code=status.HTTP_201_CREATED)
async def add_edge(
    web_id: uuid.UUID,
    payload: CreateWebEdgeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.web import WebEdge, WebEdgeType

    result = await db.execute(
        select(InvestigationWeb).where(InvestigationWeb.id == web_id, InvestigationWeb.user_id == current_user.id)
    )
    web = result.scalar_one_or_none()
    if not web:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Web not found")

    edge = WebEdge(
        web_id=web_id,
        source_id=payload.source_id,
        target_id=payload.target_id,
        label=payload.label,
        edge_type=WebEdgeType(payload.edge_type),
    )
    db.add(edge)
    web.revision += 1
    await db.flush()
    return {"id": str(edge.id), "label": edge.label}


@router.delete("/{web_id}", response_model=MessageResponse)
async def delete_web(
    web_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    result = await db.execute(
        select(InvestigationWeb).where(InvestigationWeb.id == web_id, InvestigationWeb.user_id == current_user.id)
    )
    web = result.scalar_one_or_none()
    if not web:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Web not found")
    if web.is_default:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete default web")
    await db.delete(web)
    return MessageResponse(message="Web deleted")
