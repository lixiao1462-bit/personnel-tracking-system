"""API路由模块"""
from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .roles import router as roles_router
from .logs import router as logs_router
from .maps import router as maps_router
from .cameras import router as cameras_router
from .safety_zones import router as zones_router
from .alarms import router as alarms_router
from .ai_models import router as models_router

# 创建主路由
api_router = APIRouter()

# 注册所有子路由
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(roles_router)
api_router.include_router(logs_router)
api_router.include_router(maps_router)
api_router.include_router(cameras_router)
api_router.include_router(zones_router)
api_router.include_router(alarms_router)
api_router.include_router(models_router)

__all__ = ["api_router"]
