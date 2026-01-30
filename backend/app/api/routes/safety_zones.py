"""
电子围栏管理API路由
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.safety_zone import SafetyZone
from app.models.user import User, OperationLog
from app.api.schemas.safety_zone import (
    SafetyZoneCreate,
    SafetyZoneUpdate,
    SafetyZoneResponse,
    SafetyZoneListResponse,
    PointInZoneRequest,
    PointInZoneResponse
)
from app.api.deps import get_current_active_user, check_permission

router = APIRouter(prefix="/zones", tags=["电子围栏"])


def point_in_polygon(x: float, y: float, vertices: List[List[float]]) -> bool:
    """
    判断点是否在多边形内（射线法）
    
    Args:
        x: 点的X坐标
        y: 点的Y坐标
        vertices: 多边形顶点列表 [[x1,y1], [x2,y2], ...]
    
    Returns:
        True if point is inside polygon
    """
    n = len(vertices)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = vertices[i]
        xj, yj = vertices[j]
        
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        
        j = i
    
    return inside


@router.get("", response_model=SafetyZoneListResponse, summary="获取电子围栏列表")
async def get_zones(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    zone_type: Optional[str] = Query(None, description="围栏类型"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取电子围栏列表（分页）
    """
    # 构建查询
    query = select(SafetyZone)
    count_query = select(func.count(SafetyZone.id))
    
    # 类型筛选
    if zone_type:
        query = query.where(SafetyZone.zone_type == zone_type)
        count_query = count_query.where(SafetyZone.zone_type == zone_type)
    
    # 状态筛选
    if is_active is not None:
        query = query.where(SafetyZone.is_active == is_active)
        count_query = count_query.where(SafetyZone.is_active == is_active)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.order_by(SafetyZone.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    zones = result.scalars().all()
    
    return SafetyZoneListResponse(
        total=total,
        items=[SafetyZoneResponse.model_validate(z) for z in zones]
    )


@router.get("/all", response_model=List[SafetyZoneResponse], summary="获取所有激活的电子围栏")
async def get_all_active_zones(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取所有激活的电子围栏（用于地图显示）"""
    result = await db.execute(
        select(SafetyZone).where(SafetyZone.is_active == True)
    )
    zones = result.scalars().all()
    
    return [SafetyZoneResponse.model_validate(z) for z in zones]


@router.post("", response_model=SafetyZoneResponse, summary="创建电子围栏")
async def create_zone(
    request: Request,
    zone_data: SafetyZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("zone:create"))
):
    """创建新的电子围栏"""
    # 验证围栏类型
    valid_types = ["forbidden", "restricted", "safe"]
    if zone_data.zone_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的围栏类型，有效值: {valid_types}"
        )
    
    # 验证报警类型
    valid_alarm_types = ["intrusion", "stay", "absence"]
    if zone_data.alarm_type not in valid_alarm_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的报警类型，有效值: {valid_alarm_types}"
        )
    
    zone = SafetyZone(**zone_data.model_dump())
    db.add(zone)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="create",
        resource="zone",
        detail=f"创建电子围栏: {zone_data.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(zone)
    
    return SafetyZoneResponse.model_validate(zone)


@router.get("/{zone_id}", response_model=SafetyZoneResponse, summary="获取电子围栏详情")
async def get_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定电子围栏的详细信息"""
    result = await db.execute(select(SafetyZone).where(SafetyZone.id == zone_id))
    zone = result.scalar_one_or_none()
    
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="电子围栏不存在"
        )
    
    return SafetyZoneResponse.model_validate(zone)


@router.put("/{zone_id}", response_model=SafetyZoneResponse, summary="更新电子围栏")
async def update_zone(
    zone_id: int,
    request: Request,
    zone_data: SafetyZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("zone:update"))
):
    """更新电子围栏信息"""
    result = await db.execute(select(SafetyZone).where(SafetyZone.id == zone_id))
    zone = result.scalar_one_or_none()
    
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="电子围栏不存在"
        )
    
    # 验证围栏类型
    if zone_data.zone_type:
        valid_types = ["forbidden", "restricted", "safe"]
        if zone_data.zone_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的围栏类型，有效值: {valid_types}"
            )
    
    # 验证报警类型
    if zone_data.alarm_type:
        valid_alarm_types = ["intrusion", "stay", "absence"]
        if zone_data.alarm_type not in valid_alarm_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的报警类型，有效值: {valid_alarm_types}"
            )
    
    # 更新字段
    update_data = zone_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(zone, field, value)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="update",
        resource="zone",
        resource_id=str(zone_id),
        detail=f"更新电子围栏: {zone.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(zone)
    
    return SafetyZoneResponse.model_validate(zone)


@router.delete("/{zone_id}", summary="删除电子围栏")
async def delete_zone(
    zone_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("zone:delete"))
):
    """删除电子围栏"""
    result = await db.execute(select(SafetyZone).where(SafetyZone.id == zone_id))
    zone = result.scalar_one_or_none()
    
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="电子围栏不存在"
        )
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="delete",
        resource="zone",
        resource_id=str(zone_id),
        detail=f"删除电子围栏: {zone.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.delete(zone)
    await db.commit()
    
    return {"message": "电子围栏已删除"}


@router.post("/check", response_model=PointInZoneResponse, summary="检测点位")
async def check_point_in_zones(
    point_data: PointInZoneRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    检测指定点位是否在电子围栏内，并判断是否违规
    
    - **x**: X坐标(米)
    - **y**: Y坐标(米)
    - **role**: 人员角色（可选）
    """
    # 获取所有激活的围栏
    result = await db.execute(
        select(SafetyZone).where(SafetyZone.is_active == True)
    )
    zones = result.scalars().all()
    
    in_zones = []
    violations = []
    
    for zone in zones:
        if point_in_polygon(point_data.x, point_data.y, zone.vertices_meters):
            in_zones.append(zone.id)
            
            # 检查是否违规
            is_violation = False
            violation_reason = ""
            
            if zone.zone_type == "forbidden":
                # 禁区：任何人进入都违规
                is_violation = True
                violation_reason = "进入禁区"
            
            elif zone.zone_type == "restricted":
                # 限制区：检查角色权限
                if zone.required_roles and point_data.role:
                    if point_data.role not in zone.required_roles:
                        is_violation = True
                        violation_reason = f"角色 {point_data.role} 无权进入限制区"
                elif zone.required_roles and not point_data.role:
                    is_violation = True
                    violation_reason = "未识别角色进入限制区"
            
            if is_violation:
                violations.append({
                    "zone_id": zone.id,
                    "zone_name": zone.name,
                    "zone_type": zone.zone_type,
                    "alarm_type": zone.alarm_type,
                    "reason": violation_reason
                })
    
    return PointInZoneResponse(in_zones=in_zones, violations=violations)


@router.get("/types/list", summary="获取围栏类型列表")
async def get_zone_types(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有围栏类型"""
    return [
        {"key": "forbidden", "name": "禁区", "description": "任何人不得进入"},
        {"key": "restricted", "name": "限制区", "description": "仅允许特定角色进入"},
        {"key": "safe", "name": "安全区", "description": "安全工作区域"}
    ]


@router.get("/alarm-types/list", summary="获取报警类型列表")
async def get_alarm_types(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有报警类型"""
    return [
        {"key": "intrusion", "name": "入侵报警", "description": "检测到未授权人员进入"},
        {"key": "stay", "name": "滞留报警", "description": "人员在区域内停留超时"},
        {"key": "absence", "name": "缺勤报警", "description": "区域内人员不足"}
    ]
