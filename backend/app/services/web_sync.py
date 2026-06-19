import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.web import InvestigationWeb, WebEdge, WebEdgeType, WebNode, WebNodeType


NODE_COLORS = {
    WebNodeType.PERSON: "#8b7cf6",
    WebNodeType.FRIEND: "#a78bfa",
    WebNodeType.EVENT: "#f472b6",
    WebNodeType.PHONE: "#34d399",
    WebNodeType.LOCATION: "#38bdf8",
    WebNodeType.ORGANIZATION: "#fbbf24",
    WebNodeType.EVIDENCE: "#fb923c",
    WebNodeType.DOCUMENT: "#94a3b8",
    WebNodeType.SUSPECT: "#ef4444",
    WebNodeType.NOTE: "#c084fc",
}


class WebSyncService:
    @staticmethod
    async def get_or_create_default(db: AsyncSession, user_id: uuid.UUID) -> InvestigationWeb:
        result = await db.execute(
            select(InvestigationWeb).where(
                InvestigationWeb.user_id == user_id,
                InvestigationWeb.is_default == True,
            )
        )
        web = result.scalar_one_or_none()
        if web:
            return web

        web = InvestigationWeb(user_id=user_id, title="My graph", is_default=True)
        db.add(web)
        await db.flush()
        await WebSyncService.seed_demo_web(db, web)
        return web

    @staticmethod
    async def seed_demo_web(db: AsyncSession, web: InvestigationWeb) -> None:
        nodes_data = [
            (WebNodeType.ORGANIZATION, "Acme Corp", "Primary organization", 0, 0, "#fbbf24"),
            (WebNodeType.PERSON, "John Smith", "Key contact", -120, -80, "#8b7cf6"),
            (WebNodeType.PERSON, "Maria K.", "Associate", -200, 40, "#8b7cf6"),
            (WebNodeType.EVENT, "Meeting Mar 15", "Downtown office", 120, -60, "#f472b6"),
            (WebNodeType.PHONE, "+12025550100", "Work number", 180, 60, "#34d399"),
            (WebNodeType.LOCATION, "New York, 5th Ave", "Event location", 60, 120, "#38bdf8"),
            (WebNodeType.EVIDENCE, "CCTV recording", "Camera #4, Mar 15 19:42", -60, 140, "#fb923c"),
            (WebNodeType.NOTE, "Hypothesis", "Connection via mutual contact", 0, -160, "#c084fc"),
        ]

        nodes: list[WebNode] = []
        for ntype, label, desc, x, y, color in nodes_data:
            node = WebNode(
                web_id=web.id,
                node_type=ntype,
                label=label,
                description=desc,
                x=x,
                y=y,
                color=color,
            )
            db.add(node)
            nodes.append(node)

        await db.flush()

        edges_data = [
            (0, 1, "related to", WebEdgeType.RELATED_TO),
            (1, 2, "knows", WebEdgeType.KNOWS),
            (1, 3, "attended", WebEdgeType.ATTENDED),
            (1, 4, "called", WebEdgeType.CALLED),
            (3, 5, "located at", WebEdgeType.LOCATED_AT),
            (3, 6, "recorded", WebEdgeType.WITNESSED),
            (2, 7, "supports", WebEdgeType.RELATED_TO),
            (2, 0, "works at", WebEdgeType.WORKS_AT),
        ]

        for src_idx, tgt_idx, label, etype in edges_data:
            db.add(WebEdge(
                web_id=web.id,
                source_id=nodes[src_idx].id,
                target_id=nodes[tgt_idx].id,
                label=label,
                edge_type=etype,
            ))

        web.revision = 1
        await db.flush()

    @staticmethod
    def web_to_dict(web: InvestigationWeb, nodes: list[WebNode], edges: list[WebEdge]) -> dict[str, Any]:
        return {
            "id": web.id,
            "title": web.title,
            "description": web.description,
            "revision": web.revision,
            "is_default": web.is_default,
            "viewport": web.viewport,
            "theme": web.theme,
            "updated_at": web.updated_at,
            "nodes": [
                {
                    "id": n.id,
                    "node_type": n.node_type.value,
                    "label": n.label,
                    "description": n.description,
                    "x": n.x,
                    "y": n.y,
                    "color": n.color,
                    "icon": n.icon,
                    "properties": n.properties,
                    "is_pinned": n.is_pinned,
                    "created_at": n.created_at,
                    "updated_at": n.updated_at,
                }
                for n in nodes
            ],
            "edges": [
                {
                    "id": e.id,
                    "source_id": e.source_id,
                    "target_id": e.target_id,
                    "label": e.label,
                    "edge_type": e.edge_type.value,
                    "properties": e.properties,
                    "strength": e.strength,
                }
                for e in edges
            ],
        }

    @staticmethod
    async def get_web_full(db: AsyncSession, web_id: uuid.UUID, user_id: uuid.UUID) -> Optional[dict]:
        result = await db.execute(
            select(InvestigationWeb).where(
                InvestigationWeb.id == web_id,
                InvestigationWeb.user_id == user_id,
            )
        )
        web = result.scalar_one_or_none()
        if not web:
            return None

        nodes_result = await db.execute(select(WebNode).where(WebNode.web_id == web_id))
        edges_result = await db.execute(select(WebEdge).where(WebEdge.web_id == web_id))
        return WebSyncService.web_to_dict(web, list(nodes_result.scalars().all()), list(edges_result.scalars().all()))

    @staticmethod
    async def list_webs(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
        result = await db.execute(
            select(InvestigationWeb).where(InvestigationWeb.user_id == user_id).order_by(InvestigationWeb.updated_at.desc())
        )
        webs = result.scalars().all()
        output = []
        for web in webs:
            node_count = await db.scalar(select(func.count()).select_from(WebNode).where(WebNode.web_id == web.id))
            edge_count = await db.scalar(select(func.count()).select_from(WebEdge).where(WebEdge.web_id == web.id))
            output.append({
                "id": web.id,
                "title": web.title,
                "description": web.description,
                "revision": web.revision,
                "is_default": web.is_default,
                "node_count": node_count or 0,
                "edge_count": edge_count or 0,
                "updated_at": web.updated_at,
            })
        return output

    @staticmethod
    async def sync_web(
        db: AsyncSession,
        web_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        result = await db.execute(
            select(InvestigationWeb).where(
                InvestigationWeb.id == web_id,
                InvestigationWeb.user_id == user_id,
            )
        )
        web = result.scalar_one_or_none()
        if not web:
            return {"success": False, "conflict": False, "message": "Web not found", "revision": 0}

        client_revision = payload.get("revision", 0)

        if client_revision < web.revision:
            full = await WebSyncService.get_web_full(db, web_id, user_id)
            return {
                "success": False,
                "conflict": True,
                "revision": web.revision,
                "web": full,
                "message": "Server has newer revision",
            }

        for node_id in payload.get("deleted_node_ids", []):
            node_result = await db.execute(
                select(WebNode).where(WebNode.id == node_id, WebNode.web_id == web_id)
            )
            node = node_result.scalar_one_or_none()
            if node:
                await db.delete(node)

        for edge_id in payload.get("deleted_edge_ids", []):
            edge_result = await db.execute(
                select(WebEdge).where(WebEdge.id == edge_id, WebEdge.web_id == web_id)
            )
            edge = edge_result.scalar_one_or_none()
            if edge:
                await db.delete(edge)

        existing_nodes = {
            n.id: n
            for n in (await db.execute(select(WebNode).where(WebNode.web_id == web_id))).scalars().all()
        }

        for node_data in payload.get("nodes", []):
            node_id = node_data["id"] if isinstance(node_data["id"], uuid.UUID) else uuid.UUID(str(node_data["id"]))
            if node_id in existing_nodes:
                node = existing_nodes[node_id]
                node.label = node_data["label"]
                node.description = node_data.get("description")
                if node_data.get("node_type"):
                    node.node_type = WebNodeType(node_data["node_type"])
                node.x = node_data.get("x", node.x)
                node.y = node_data.get("y", node.y)
                node.color = node_data.get("color", node.color)
                node.properties = node_data.get("properties", node.properties)
                node.is_pinned = node_data.get("is_pinned", node.is_pinned)
                node.updated_at = datetime.now(timezone.utc)
            else:
                db.add(WebNode(
                    id=node_id,
                    web_id=web_id,
                    node_type=WebNodeType(node_data["node_type"]),
                    label=node_data["label"],
                    description=node_data.get("description"),
                    x=node_data.get("x", 0),
                    y=node_data.get("y", 0),
                    color=node_data.get("color") or NODE_COLORS.get(WebNodeType(node_data["node_type"]), "#8b7cf6"),
                    properties=node_data.get("properties", {}),
                    is_pinned=node_data.get("is_pinned", False),
                ))

        existing_edges = {
            e.id: e
            for e in (await db.execute(select(WebEdge).where(WebEdge.web_id == web_id))).scalars().all()
        }

        for edge_data in payload.get("edges", []):
            edge_id = edge_data["id"] if isinstance(edge_data["id"], uuid.UUID) else uuid.UUID(str(edge_data["id"]))
            source_id = edge_data["source_id"] if isinstance(edge_data["source_id"], uuid.UUID) else uuid.UUID(str(edge_data["source_id"]))
            target_id = edge_data["target_id"] if isinstance(edge_data["target_id"], uuid.UUID) else uuid.UUID(str(edge_data["target_id"]))

            if edge_id in existing_edges:
                edge = existing_edges[edge_id]
                edge.label = edge_data.get("label", edge.label)
                edge.edge_type = WebEdgeType(edge_data.get("edge_type", edge.edge_type.value))
                edge.strength = edge_data.get("strength", edge.strength)
                edge.properties = edge_data.get("properties", edge.properties)
            else:
                db.add(WebEdge(
                    id=edge_id,
                    web_id=web_id,
                    source_id=source_id,
                    target_id=target_id,
                    label=edge_data.get("label", "связан с"),
                    edge_type=WebEdgeType(edge_data.get("edge_type", "custom")),
                    strength=edge_data.get("strength", 1.0),
                    properties=edge_data.get("properties", {}),
                ))

        if payload.get("viewport"):
            web.viewport = payload["viewport"]

        web.revision = web.revision + 1
        web.updated_at = datetime.now(timezone.utc)
        await db.flush()

        full = await WebSyncService.get_web_full(db, web_id, user_id)
        return {"success": True, "conflict": False, "revision": web.revision, "web": full}
