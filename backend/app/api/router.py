"""app/api/router.py — Mount all versioned API routers."""
from fastapi import APIRouter
from app.api.v1 import runs, playground

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(runs.router)
api_router.include_router(playground.router)
