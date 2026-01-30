"""
地图管理API路由
"""
import os
import math
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.map import MapConfig, SystemConfig
from app.models.user import User, OperationLog
from app.api.schemas.map import (
    MapConfigCreate,
    MapConfigUpdate,
    MapConfigResponse,
    ScaleCalibrationRequest,
    ScaleCalibrationResponse,
    SystemConfigCreate,
    SystemConfigUpdate,
    SystemConfigResponse
)
from app.api.deps import get_current_active_user, check_permission
from app.core.config import settings

router = APIRouter(prefix="/maps", tags=["地图管理"])


@router.get("", response_model=List[MapConfigResponse], summary="获取地图列表")
async def get_maps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取所有地图配置列表"""
    result = await db.execute(select(MapConfig).order_by(MapConfig.created_at.desc()))
    maps = result.scalars().all()
    return [MapConfigResponse.model_validate(m) for m in maps]


@router.get("/active", response_model=MapConfigResponse, summary="获取当前激活的地图")
async def get_active_map(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取当前激活使用的地图配置"""
    result = await db.execute(
        select(MapConfig).where(MapConfig.is_active == True)
    )
    map_config = result.scalar_one_or_none()
    
    if not map_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="没有激活的地图配置"
        )
    
    return MapConfigResponse.model_validate(map_config)


@router.post("", response_model=MapConfigResponse, summary="创建地图配置")
async def create_map(
    request: Request,
    map_data: MapConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("map:update"))
):
    """创建新的地图配置"""
    map_config = MapConfig(**map_data.model_dump())
    db.add(map_config)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="create",
        resource="map",
        detail=f"创建地图配置: {map_data.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(map_config)
    
    return MapConfigResponse.model_validate(map_config)


@router.get("/{map_id}", response_model=MapConfigResponse, summary="获取地图详情")
async def get_map(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定地图的详细信息"""
    result = await db.execute(select(MapConfig).where(MapConfig.id == map_id))
    map_config = result.scalar_one_or_none()
    
    if not map_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="地图配置不存在"
        )
    
    return MapConfigResponse.model_validate(map_config)


@router.put("/{map_id}", response_model=MapConfigResponse, summary="更新地图配置")
async def update_map(
    map_id: int,
    request: Request,
    map_data: MapConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("map:update"))
):
    """更新地图配置"""
    result = await db.execute(select(MapConfig).where(MapConfig.id == map_id))
    map_config = result.scalar_one_or_none()
    
    if not map_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="地图配置不存在"
        )
    
    # 如果设置为激活，先取消其他地图的激活状态
    if map_data.is_active:
        await db.execute(
            select(MapConfig).where(MapConfig.id != map_id)
        )
        result = await db.execute(select(MapConfig).where(MapConfig.id != map_id))
        other_maps = result.scalars().all()
        for m in other_maps:
            m.is_active = False
    
    # 更新字段
    update_data = map_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(map_config, field, value)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="update",
        resource="map",
        resource_id=str(map_id),
        detail=f"更新地图配置: {map_config.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(map_config)
    
    return MapConfigResponse.model_validate(map_config)


@router.delete("/{map_id}", summary="删除地图配置")
async def delete_map(
    map_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("map:update"))
):
    """删除地图配置"""
    result = await db.execute(select(MapConfig).where(MapConfig.id == map_id))
    map_config = result.scalar_one_or_none()
    
    if not map_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="地图配置不存在"
        )
    
    if map_config.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除当前激活的地图"
        )
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="delete",
        resource="map",
        resource_id=str(map_id),
        detail=f"删除地图配置: {map_config.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.delete(map_config)
    await db.commit()
    
    return {"message": "地图配置已删除"}


@router.post("/{map_id}/calibrate", response_model=ScaleCalibrationResponse, summary="比例尺标定")
async def calibrate_scale(
    map_id: int,
    request: Request,
    calibration_data: ScaleCalibrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("map:update"))
):
    """
    比例尺标定
    
    通过在地图上选择两个点并输入实际距离来计算比例尺
    """
    result = await db.execute(select(MapConfig).where(MapConfig.id == map_id))
    map_config = result.scalar_one_or_none()
    
    if not map_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="地图配置不存在"
        )
    
    # 计算像素距离
    dx = calibration_data.point2.x - calibration_data.point1.x
    dy = calibration_data.point2.y - calibration_data.point1.y
    pixel_distance = math.sqrt(dx * dx + dy * dy)
    
    if pixel_distance < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="两个标定点距离太近"
        )
    
    # 计算比例尺 (米/像素)
    scale_ratio = calibration_data.actual_distance / pixel_distance
    
    # 更新地图配置
    map_config.scale_ratio = scale_ratio
    map_config.calibration_points = {
        "point1": {"x": calibration_data.point1.x, "y": calibration_data.point1.y},
        "point2": {"x": calibration_data.point2.x, "y": calibration_data.point2.y},
        "actual_distance": calibration_data.actual_distance
    }
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="calibrate",
        resource="map",
        resource_id=str(map_id),
        detail=f"比例尺标定: {scale_ratio:.6f} 米/像素",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    
    return ScaleCalibrationResponse(
        scale_ratio=scale_ratio,
        pixel_distance=pixel_distance,
        actual_distance=calibration_data.actual_distance
    )


@router.post("/upload", summary="上传地图图片")
async def upload_map_image(
    file: UploadFile = File(...),
    current_user: User = Depends(check_permission("map:update"))
):
    """
    上传地图图片
    
    支持格式: PNG, JPG, JPEG
    """
    # 检查文件类型
    allowed_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件格式，请上传PNG或JPG图片"
        )
    
    # 生成文件名
    ext = file.filename.split(".")[-1] if file.filename else "png"
    filename = f"map_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, "maps", filename)
    
    # 确保目录存在
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # 保存文件
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 返回文件URL（相对路径）
    return {
        "filename": filename,
        "url": f"/uploads/maps/{filename}",
        "size": len(content)
    }


# ==================== 系统配置 ====================
@router.get("/config/list", response_model=List[SystemConfigResponse], summary="获取系统配置列表")
async def get_system_configs(
    category: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("config:read"))
):
    """获取系统配置列表"""
    query = select(SystemConfig)
    if category:
        query = query.where(SystemConfig.category == category)
    
    result = await db.execute(query.order_by(SystemConfig.category, SystemConfig.key))
    configs = result.scalars().all()
    
    return [SystemConfigResponse.model_validate(c) for c in configs]


@router.get("/config/{key}", response_model=SystemConfigResponse, summary="获取系统配置")
async def get_system_config(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("config:read"))
):
    """获取指定的系统配置"""
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在"
        )
    
    return SystemConfigResponse.model_validate(config)


@router.put("/config/{key}", response_model=SystemConfigResponse, summary="更新系统配置")
async def update_system_config(
    key: str,
    config_data: SystemConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("config:update"))
):
    """更新系统配置"""
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    
    if not config:
        # 如果不存在则创建
        config = SystemConfig(key=key, value="", value_type="string")
        db.add(config)
    
    # 更新字段
    update_data = config_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    await db.commit()
    await db.refresh(config)
    
    return SystemConfigResponse.model_validate(config)
