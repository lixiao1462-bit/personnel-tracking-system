"""
角色管理API路由
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import Role, User
from app.api.schemas.user import (
    RoleCreate,
    RoleUpdate,
    RoleResponse
)
from app.api.deps import get_current_active_user, get_current_superuser

router = APIRouter(prefix="/roles", tags=["角色管理"])


@router.get("", response_model=List[RoleResponse], summary="获取角色列表")
async def get_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取所有角色列表"""
    result = await db.execute(select(Role).order_by(Role.id))
    roles = result.scalars().all()
    return [RoleResponse.model_validate(r) for r in roles]


@router.post("", response_model=RoleResponse, summary="创建角色")
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    创建新角色（需要超级管理员权限）
    """
    # 检查角色名是否已存在
    result = await db.execute(
        select(Role).where(Role.name == role_data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="角色名已存在"
        )
    
    role = Role(**role_data.model_dump())
    db.add(role)
    await db.commit()
    await db.refresh(role)
    
    return RoleResponse.model_validate(role)


@router.get("/{role_id}", response_model=RoleResponse, summary="获取角色详情")
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定角色的详细信息"""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    
    return RoleResponse.model_validate(role)


@router.put("/{role_id}", response_model=RoleResponse, summary="更新角色")
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    更新角色信息（需要超级管理员权限）
    """
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    
    # 检查角色名是否已被其他角色使用
    if role_data.name and role_data.name != role.name:
        result = await db.execute(
            select(Role).where(Role.name == role_data.name, Role.id != role_id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="角色名已存在"
            )
    
    # 更新字段
    update_data = role_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    await db.commit()
    await db.refresh(role)
    
    return RoleResponse.model_validate(role)


@router.delete("/{role_id}", summary="删除角色")
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    删除角色（需要超级管理员权限）
    如果有用户使用该角色，则不能删除
    """
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    
    # 检查是否有用户使用该角色
    result = await db.execute(
        select(User).where(User.role_id == role_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该角色下还有用户，无法删除"
        )
    
    await db.delete(role)
    await db.commit()
    
    return {"message": "角色已删除"}


# 预定义权限列表
PERMISSIONS = {
    "user:read": "查看用户",
    "user:create": "创建用户",
    "user:update": "更新用户",
    "user:delete": "删除用户",
    "role:read": "查看角色",
    "role:create": "创建角色",
    "role:update": "更新角色",
    "role:delete": "删除角色",
    "map:read": "查看地图",
    "map:update": "更新地图",
    "camera:read": "查看摄像头",
    "camera:create": "创建摄像头",
    "camera:update": "更新摄像头",
    "camera:delete": "删除摄像头",
    "camera:calibrate": "标定摄像头",
    "zone:read": "查看电子围栏",
    "zone:create": "创建电子围栏",
    "zone:update": "更新电子围栏",
    "zone:delete": "删除电子围栏",
    "alarm:read": "查看报警",
    "alarm:handle": "处理报警",
    "model:read": "查看AI模型",
    "model:upload": "上传AI模型",
    "model:delete": "删除AI模型",
    "model:activate": "激活AI模型",
    "log:read": "查看操作日志",
    "config:read": "查看系统配置",
    "config:update": "更新系统配置"
}


@router.get("/permissions/list", summary="获取权限列表")
async def get_permissions(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有可用权限列表"""
    return [
        {"key": key, "name": name}
        for key, name in PERMISSIONS.items()
    ]
