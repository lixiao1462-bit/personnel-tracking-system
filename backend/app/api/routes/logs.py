"""
操作日志API路由
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.user import OperationLog, User
from app.api.schemas.user import OperationLogResponse, OperationLogListResponse
from app.api.deps import get_current_active_user, check_permission

router = APIRouter(prefix="/logs", tags=["操作日志"])


@router.get("", response_model=OperationLogListResponse, summary="获取操作日志列表")
async def get_logs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    user_id: Optional[int] = Query(None, description="用户ID"),
    operation: Optional[str] = Query(None, description="操作类型"),
    resource: Optional[str] = Query(None, description="资源类型"),
    status: Optional[str] = Query(None, description="操作状态"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("log:read"))
):
    """
    获取操作日志列表（分页）
    
    - **page**: 页码，从1开始
    - **page_size**: 每页数量
    - **user_id**: 筛选用户
    - **operation**: 筛选操作类型
    - **resource**: 筛选资源类型
    - **status**: 筛选操作状态
    - **start_time**: 开始时间
    - **end_time**: 结束时间
    """
    # 构建查询
    query = select(OperationLog)
    count_query = select(func.count(OperationLog.id))
    
    # 用户筛选
    if user_id is not None:
        query = query.where(OperationLog.user_id == user_id)
        count_query = count_query.where(OperationLog.user_id == user_id)
    
    # 操作类型筛选
    if operation:
        query = query.where(OperationLog.operation == operation)
        count_query = count_query.where(OperationLog.operation == operation)
    
    # 资源类型筛选
    if resource:
        query = query.where(OperationLog.resource == resource)
        count_query = count_query.where(OperationLog.resource == resource)
    
    # 状态筛选
    if status:
        query = query.where(OperationLog.status == status)
        count_query = count_query.where(OperationLog.status == status)
    
    # 时间范围筛选
    if start_time:
        query = query.where(OperationLog.created_at >= start_time)
        count_query = count_query.where(OperationLog.created_at >= start_time)
    
    if end_time:
        query = query.where(OperationLog.created_at <= end_time)
        count_query = count_query.where(OperationLog.created_at <= end_time)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.order_by(OperationLog.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return OperationLogListResponse(
        total=total,
        items=[OperationLogResponse.model_validate(log) for log in logs]
    )


@router.get("/operations", summary="获取操作类型列表")
async def get_operations(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有操作类型"""
    return [
        {"key": "login", "name": "登录"},
        {"key": "logout", "name": "登出"},
        {"key": "create", "name": "创建"},
        {"key": "update", "name": "更新"},
        {"key": "delete", "name": "删除"},
        {"key": "upload", "name": "上传"},
        {"key": "download", "name": "下载"},
        {"key": "calibrate", "name": "标定"},
        {"key": "activate", "name": "激活"},
        {"key": "handle", "name": "处理"}
    ]


@router.get("/resources", summary="获取资源类型列表")
async def get_resources(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有资源类型"""
    return [
        {"key": "user", "name": "用户"},
        {"key": "role", "name": "角色"},
        {"key": "map", "name": "地图"},
        {"key": "camera", "name": "摄像头"},
        {"key": "calibration", "name": "标定"},
        {"key": "zone", "name": "电子围栏"},
        {"key": "alarm", "name": "报警"},
        {"key": "model", "name": "AI模型"},
        {"key": "config", "name": "系统配置"}
    ]
