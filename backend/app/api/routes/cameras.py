"""
摄像头管理API路由
"""
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.camera import Camera, CameraCalibration
from app.models.user import User, OperationLog
from app.api.schemas.camera import (
    CameraCreate,
    CameraUpdate,
    CameraResponse,
    CameraListResponse,
    CameraCalibrationCreate,
    CameraCalibrationResponse,
    CoordinateTransformRequest,
    CoordinateTransformResponse
)
from app.api.deps import get_current_active_user, check_permission

router = APIRouter(prefix="/cameras", tags=["摄像头管理"])


def compute_homography(video_points: List[List[float]], map_points: List[List[float]]) -> List[List[float]]:
    """
    计算单应性矩阵
    
    使用DLT (Direct Linear Transform) 算法
    
    Args:
        video_points: 视频画面中的4个点 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        map_points: 地图上对应的4个点 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    
    Returns:
        3x3单应性矩阵
    """
    src = np.array(video_points, dtype=np.float64)
    dst = np.array(map_points, dtype=np.float64)
    
    # 构建A矩阵
    A = []
    for i in range(4):
        x, y = src[i]
        u, v = dst[i]
        A.append([-x, -y, -1, 0, 0, 0, u*x, u*y, u])
        A.append([0, 0, 0, -x, -y, -1, v*x, v*y, v])
    
    A = np.array(A)
    
    # SVD分解
    _, _, Vt = np.linalg.svd(A)
    H = Vt[-1].reshape(3, 3)
    
    # 归一化
    H = H / H[2, 2]
    
    return H.tolist()


def transform_point(h_matrix: List[List[float]], x: float, y: float) -> tuple:
    """
    使用单应性矩阵转换点坐标
    
    Args:
        h_matrix: 3x3单应性矩阵
        x: 视频画面X坐标
        y: 视频画面Y坐标
    
    Returns:
        (map_x, map_y) 地图坐标
    """
    H = np.array(h_matrix)
    point = np.array([x, y, 1])
    result = H @ point
    return (result[0] / result[2], result[1] / result[2])


@router.get("", response_model=CameraListResponse, summary="获取摄像头列表")
async def get_cameras(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    is_online: Optional[bool] = Query(None, description="是否在线"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取摄像头列表（分页）
    """
    # 构建查询
    query = select(Camera)
    count_query = select(func.count(Camera.id))
    
    # 关键词搜索
    if keyword:
        keyword_filter = (
            Camera.name.ilike(f"%{keyword}%") |
            Camera.index_code.ilike(f"%{keyword}%")
        )
        query = query.where(keyword_filter)
        count_query = count_query.where(keyword_filter)
    
    # 状态筛选
    if is_active is not None:
        query = query.where(Camera.is_active == is_active)
        count_query = count_query.where(Camera.is_active == is_active)
    
    if is_online is not None:
        query = query.where(Camera.is_online == is_online)
        count_query = count_query.where(Camera.is_online == is_online)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.order_by(Camera.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    cameras = result.scalars().all()
    
    return CameraListResponse(
        total=total,
        items=[CameraResponse.model_validate(c) for c in cameras]
    )


@router.post("", response_model=CameraResponse, summary="创建摄像头")
async def create_camera(
    request: Request,
    camera_data: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("camera:create"))
):
    """创建新摄像头"""
    # 检查索引码是否已存在
    result = await db.execute(
        select(Camera).where(Camera.index_code == camera_data.index_code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="摄像头索引码已存在"
        )
    
    camera = Camera(**camera_data.model_dump())
    db.add(camera)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="create",
        resource="camera",
        detail=f"创建摄像头: {camera_data.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(camera)
    
    return CameraResponse.model_validate(camera)


@router.get("/{camera_id}", response_model=CameraResponse, summary="获取摄像头详情")
async def get_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定摄像头的详细信息"""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄像头不存在"
        )
    
    return CameraResponse.model_validate(camera)


@router.put("/{camera_id}", response_model=CameraResponse, summary="更新摄像头")
async def update_camera(
    camera_id: int,
    request: Request,
    camera_data: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("camera:update"))
):
    """更新摄像头信息"""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄像头不存在"
        )
    
    # 更新字段
    update_data = camera_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(camera, field, value)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="update",
        resource="camera",
        resource_id=str(camera_id),
        detail=f"更新摄像头: {camera.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(camera)
    
    return CameraResponse.model_validate(camera)


@router.delete("/{camera_id}", summary="删除摄像头")
async def delete_camera(
    camera_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("camera:delete"))
):
    """删除摄像头"""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄像头不存在"
        )
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="delete",
        resource="camera",
        resource_id=str(camera_id),
        detail=f"删除摄像头: {camera.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.delete(camera)
    await db.commit()
    
    return {"message": "摄像头已删除"}


# ==================== 标定相关 ====================
@router.post("/{camera_id}/calibrate", response_model=CameraCalibrationResponse, summary="摄像头标定")
async def calibrate_camera(
    camera_id: int,
    request: Request,
    calibration_data: CameraCalibrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("camera:calibrate"))
):
    """
    摄像头四点透视标定
    
    通过视频画面和地图上各4个对应点计算单应性矩阵
    """
    # 检查摄像头是否存在
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄像头不存在"
        )
    
    # 验证点数
    if len(calibration_data.video_points) != 4 or len(calibration_data.map_points) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="需要4个标定点"
        )
    
    # 计算单应性矩阵
    try:
        h_matrix = compute_homography(
            calibration_data.video_points,
            calibration_data.map_points
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"标定计算失败: {str(e)}"
        )
    
    # 计算重投影误差
    total_error = 0
    for i in range(4):
        vp = calibration_data.video_points[i]
        mp = calibration_data.map_points[i]
        transformed = transform_point(h_matrix, vp[0], vp[1])
        error = np.sqrt((transformed[0] - mp[0])**2 + (transformed[1] - mp[1])**2)
        total_error += error
    reprojection_error = total_error / 4
    
    # 取消之前的激活标定
    result = await db.execute(
        select(CameraCalibration).where(
            CameraCalibration.camera_id == camera_id,
            CameraCalibration.is_active == True
        )
    )
    old_calibrations = result.scalars().all()
    for cal in old_calibrations:
        cal.is_active = False
    
    # 创建新标定记录
    calibration = CameraCalibration(
        camera_id=camera_id,
        video_points=calibration_data.video_points,
        map_points=calibration_data.map_points,
        h_matrix=h_matrix,
        reprojection_error=reprojection_error,
        is_active=True
    )
    db.add(calibration)
    
    # 更新摄像头的单应性矩阵
    camera.h_matrix = h_matrix
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="calibrate",
        resource="camera",
        resource_id=str(camera_id),
        detail=f"摄像头标定: {camera.name}, 重投影误差: {reprojection_error:.4f}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(calibration)
    
    return CameraCalibrationResponse.model_validate(calibration)


@router.get("/{camera_id}/calibrations", response_model=List[CameraCalibrationResponse], summary="获取标定历史")
async def get_calibrations(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取摄像头的标定历史记录"""
    result = await db.execute(
        select(CameraCalibration)
        .where(CameraCalibration.camera_id == camera_id)
        .order_by(CameraCalibration.created_at.desc())
    )
    calibrations = result.scalars().all()
    
    return [CameraCalibrationResponse.model_validate(c) for c in calibrations]


@router.post("/transform", response_model=CoordinateTransformResponse, summary="坐标转换")
async def transform_coordinate(
    transform_data: CoordinateTransformRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    将视频画面坐标转换为地图坐标
    """
    # 获取摄像头
    result = await db.execute(
        select(Camera).where(Camera.id == transform_data.camera_id)
    )
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄像头不存在"
        )
    
    if not camera.h_matrix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="摄像头未标定"
        )
    
    # 坐标转换
    map_x, map_y = transform_point(
        camera.h_matrix,
        transform_data.video_x,
        transform_data.video_y
    )
    
    return CoordinateTransformResponse(map_x=map_x, map_y=map_y)
