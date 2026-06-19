from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.database import Base, engine, AsyncSessionLocal
from app.neo4j_client import GraphService, close_neo4j, get_neo4j_driver
from app.redis_client import close_redis
from app.services.phone_lookup import seed_phone_intel

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        driver = await get_neo4j_driver()
        graph = GraphService(driver)
        await graph.seed_demo_data()
    except Exception:
        pass

    try:
        async with AsyncSessionLocal() as session:
            await seed_phone_intel(session)
            await session.commit()
    except Exception:
        pass

    yield

    await close_redis()
    await close_neo4j()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
