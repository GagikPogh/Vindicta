from fastapi import APIRouter

from app.api.v1 import auth, dashboard, graph, investigations, phone, reports, search, timeline, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["investigations"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(phone.router, prefix="/phone", tags=["phone"])
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
api_router.include_router(timeline.router, prefix="/timeline", tags=["timeline"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
