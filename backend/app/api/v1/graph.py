from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Entity, User
from app.neo4j_client import GraphService, get_neo4j_driver
from app.schemas import GraphEdge, GraphNode, GraphResponse

router = APIRouter()


@router.get("/{entity_id}", response_model=GraphResponse)
async def get_entity_graph(
    entity_id: str,
    depth: int = Query(default=2, ge=1, le=4),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    driver = await get_neo4j_driver()
    graph = GraphService(driver)

    try:
        subgraph = await graph.get_subgraph(entity_id, depth=depth)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity graph not found")

    if not subgraph["nodes"]:
        result = await db.execute(select(Entity).where(Entity.neo4j_id == entity_id))
        entity = result.scalar_one_or_none()
        if entity:
            subgraph = {
                "nodes": [{
                    "id": entity.neo4j_id or str(entity.id),
                    "name": entity.name,
                    "type": entity.entity_type.value,
                    "properties": entity.properties,
                }],
                "edges": [],
            }
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")

    return GraphResponse(
        nodes=[GraphNode(**n) for n in subgraph["nodes"]],
        edges=[GraphEdge(**e) for e in subgraph["edges"]],
        center_id=entity_id,
    )


@router.get("", response_model=GraphResponse)
async def get_full_graph(
    current_user: User = Depends(get_current_user),
):
    driver = await get_neo4j_driver()
    graph = GraphService(driver)

    query = """
    MATCH (e:Entity)
    OPTIONAL MATCH (e)-[r:RELATIONSHIP]->(t:Entity)
    RETURN collect(DISTINCT e {.*}) AS nodes,
           collect(DISTINCT {
               source: startNode(r).id,
               target: endNode(r).id,
               type: r.type,
               properties: properties(r)
           }) AS edges
    """
    async with driver.session() as session:
        result = await session.run(query)
        record = await result.single()

    nodes = []
    for node in record["nodes"]:
        if node:
            node_dict = dict(node)
            nodes.append({
                "id": node_dict.get("id", ""),
                "name": node_dict.get("name", ""),
                "type": node_dict.get("type", "unknown"),
                "properties": {k: v for k, v in node_dict.items() if k not in ("id", "name", "type")},
            })

    edges = []
    seen: set[str] = set()
    for edge in record["edges"]:
        if edge and edge.get("source"):
            key = f"{edge['source']}-{edge['target']}-{edge['type']}"
            if key not in seen:
                seen.add(key)
                edges.append({
                    "source": edge["source"],
                    "target": edge["target"],
                    "type": edge.get("type", "related"),
                    "properties": dict(edge.get("properties", {})),
                })

    return GraphResponse(nodes=[GraphNode(**n) for n in nodes], edges=[GraphEdge(**e) for e in edges])
