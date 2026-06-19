from typing import Any, Optional

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.core.config import get_settings

settings = get_settings()

_driver: Optional[AsyncDriver] = None


async def get_neo4j_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
    return _driver


async def close_neo4j() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


class GraphService:
    def __init__(self, driver: AsyncDriver):
        self.driver = driver

    async def create_entity_node(
        self,
        entity_id: str,
        name: str,
        entity_type: str,
        properties: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        props = properties or {}
        query = """
        MERGE (e:Entity {id: $entity_id})
        SET e.name = $name,
            e.type = $entity_type,
            e += $props,
            e.updated_at = datetime()
        RETURN e {.*, labels: labels(e)} AS node
        """
        async with self.driver.session() as session:
            result = await session.run(
                query,
                entity_id=entity_id,
                name=name,
                entity_type=entity_type,
                props=props,
            )
            record = await result.single()
            return dict(record["node"]) if record else {}

    async def create_relationship(
        self,
        source_id: str,
        target_id: str,
        relationship_type: str,
        properties: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        props = properties or {}
        query = """
        MATCH (a:Entity {id: $source_id})
        MATCH (b:Entity {id: $target_id})
        MERGE (a)-[r:RELATIONSHIP {type: $relationship_type}]->(b)
        SET r += $props,
            r.updated_at = datetime()
        RETURN type(r) AS rel_type, properties(r) AS props
        """
        async with self.driver.session() as session:
            result = await session.run(
                query,
                source_id=source_id,
                target_id=target_id,
                relationship_type=relationship_type,
                props={"type": relationship_type, **props},
            )
            record = await result.single()
            if record:
                return {"type": record["rel_type"], "properties": dict(record["props"])}
            return {}

    async def get_subgraph(self, entity_id: str, depth: int = 2) -> dict[str, Any]:
        query = """
        MATCH path = (center:Entity {id: $entity_id})-[*1..$depth]-(connected:Entity)
        WITH center, collect(DISTINCT connected) AS connected_nodes,
             [r IN relationships(path) | r] AS rels
        WITH center, connected_nodes,
             reduce(acc = [], r IN rels | acc + r) AS all_rels
        UNWIND all_rels AS rel
        WITH center, connected_nodes, collect(DISTINCT rel) AS relationships
        RETURN center {.*} AS center,
               [n IN connected_nodes | n {.*}] AS nodes,
               [r IN relationships | {
                   source: startNode(r).id,
                   target: endNode(r).id,
                   type: r.type,
                   properties: properties(r)
               }] AS edges
        """
        async with self.driver.session() as session:
            result = await session.run(query, entity_id=entity_id, depth=depth)
            record = await result.single()
            if not record:
                return {"nodes": [], "edges": []}

            nodes_map: dict[str, dict] = {}
            center = dict(record["center"])
            nodes_map[center["id"]] = {
                "id": center["id"],
                "name": center.get("name", ""),
                "type": center.get("type", "unknown"),
                "properties": {k: v for k, v in center.items() if k not in ("id", "name", "type")},
            }

            for node in record["nodes"]:
                node_dict = dict(node)
                nodes_map[node_dict["id"]] = {
                    "id": node_dict["id"],
                    "name": node_dict.get("name", ""),
                    "type": node_dict.get("type", "unknown"),
                    "properties": {k: v for k, v in node_dict.items() if k not in ("id", "name", "type")},
                }

            edges = []
            seen_edges: set[str] = set()
            for edge in record["edges"]:
                edge_dict = dict(edge)
                edge_key = f"{edge_dict['source']}-{edge_dict['target']}-{edge_dict['type']}"
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append({
                        "source": edge_dict["source"],
                        "target": edge_dict["target"],
                        "type": edge_dict["type"],
                        "properties": dict(edge_dict.get("properties", {})),
                    })

            return {"nodes": list(nodes_map.values()), "edges": edges}

    async def search_entities(self, query_text: str, limit: int = 20) -> list[dict[str, Any]]:
        query = """
        MATCH (e:Entity)
        WHERE toLower(e.name) CONTAINS toLower($query)
           OR toLower(e.type) CONTAINS toLower($query)
        RETURN e {.*} AS entity
        LIMIT $limit
        """
        async with self.driver.session() as session:
            result = await session.run(query, query=query_text, limit=limit)
            records = await result.data()
            return [dict(r["entity"]) for r in records]

    async def seed_demo_data(self) -> None:
        query = """
        MERGE (org:Entity {id: 'org-vindicta'})
        SET org.name = 'Vindicta Corp', org.type = 'organization'
        MERGE (person1:Entity {id: 'person-john-doe'})
        SET person1.name = 'John Doe', person1.type = 'person'
        MERGE (person2:Entity {id: 'person-jane-smith'})
        SET person2.name = 'Jane Smith', person2.type = 'person'
        MERGE (account:Entity {id: 'account-offshore-001'})
        SET account.name = 'Offshore Account #001', account.type = 'financial'
        MERGE (device:Entity {id: 'device-iphone-12'})
        SET device.name = 'iPhone 12 Pro', device.type = 'device'
        MERGE (location:Entity {id: 'loc-nyc'})
        SET location.name = 'New York City', location.type = 'location'
        MERGE (person1)-[:RELATIONSHIP {type: 'employed_by'}]->(org)
        MERGE (person2)-[:RELATIONSHIP {type: 'employed_by'}]->(org)
        MERGE (person1)-[:RELATIONSHIP {type: 'associated_with'}]->(person2)
        MERGE (person1)-[:RELATIONSHIP {type: 'owns'}]->(account)
        MERGE (person1)-[:RELATIONSHIP {type: 'uses'}]->(device)
        MERGE (device)-[:RELATIONSHIP {type: 'located_at'}]->(location)
        MERGE (person2)-[:RELATIONSHIP {type: 'visited'}]->(location)
        """
        async with self.driver.session() as session:
            await session.run(query)
