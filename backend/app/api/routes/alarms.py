"""
报警管理API路由
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.alarm import AlarmEvent
from app.models.user import User, OperationLog
from app.api.schemas.alarm import (
    AlarmEventCreate,
    AlarmEventUpdate,
    AlarmEventResponse,
    AlarmEventListResponse,
    AlarmStatistics
)
from app.api.deps import get_current_active_user, check_permission
from app.services.dingtalk import send_dingtalk_alarm

router = APIRouter(prefix="/alarms", tags=["报警管理"])


@router.get("", response_model=AlarmEventListResponse, summary="获取报警列表")
async def get_alarms(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    type: Optional[str] = Query(None, description="报警类型"),
    level: Optional[str] = Query(None, description="报警级别"),
    status: Optional[str] = Query(None, description="报警状态"),
    zone_id: Optional[int] = Query(None, description="围栏ID"),
    camera_id: Optional[int] = Query(None, description="摄像头ID"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取报警事件列表（分页）
    """
    # 构建查询
    query = select(AlarmEvent)
    count_query = select(func.count(AlarmEvent.id))
    
    # 类型筛选
    if type:
        query = query.where(AlarmEvent.type == type)
        count_query = count_query.where(AlarmEvent.type == type)
    
    # 级别筛选
    if level:
        query = query.where(AlarmEvent.level == level)
        count_query = count_query.where(AlarmEvent.level == level)
    
    # 状态筛选
    if status:
        query = query.where(AlarmEvent.status == status)
        count_query = count_query.where(AlarmEvent.status == status)
    
    # 围栏筛选
    if zone_id:
        query = query.where(AlarmEvent.zone_id == zone_id)
        count_query = count_query.where(AlarmEvent.zone_id == zone_id)
    
    # 摄像头筛选
    if camera_id:
        query = query.where(AlarmEvent.camera_id == camera_id)
        count_query = count_query.where(AlarmEvent.camera_id == camera_id)
    
    # 时间范围筛选
    if start_time:
        query = query.where(AlarmEvent.created_at >= start_time)
        count_query = count_query.where(AlarmEvent.created_at >= start_time)
    
    if end_time:
        query = query.where(AlarmEvent.created_at <= end_time)
        count_query = count_query.where(AlarmEvent.created_at <= end_time)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.order_by(AlarmEvent.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    alarms = result.scalars().all()
    
    return AlarmEventListResponse(
        total=total,
        items=[AlarmEventResponse.model_validate(a) for a in alarms]
    )


@router.post("", response_model=AlarmEventResponse, summary="创建报警事件")
async def create_alarm(
    alarm_data: AlarmEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    创建新的报警事件
    通常由AI检测服务自动调用
    """
    alarm = AlarmEvent(**alarm_data.model_dump())
    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)
    
    # 尝试发送钉钉通知
    try:
        success = await send_dingtalk_alarm(alarm)
        if success:
            alarm.dingtalk_notified = True
            await db.commit()
    except Exception:
        pass  # 钉钉通知失败不影响主流程
    
    return AlarmEventResponse.model_validate(alarm)


@router.get("/statistics", response_model=AlarmStatistics, summary="获取报警统计")
async def get_alarm_statistics(
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取报警统计数据
    """
    # 基础查询条件
    base_filter = []
    if start_time:
        base_filter.append(AlarmEvent.created_at >= start_time)
    if end_time:
        base_filter.append(AlarmEvent.created_at <= end_time)
    
    # 总数
    total_query = select(func.count(AlarmEvent.id))
    if base_filter:
        total_query = total_query.where(*base_filter)
    total_result = await db.execute(total_query)
    total = total_result.scalar()
    
    # 按状态统计
    status_counts = {}
    for s in ["pending", "processing", "resolved", "ignored"]:
        query = select(func.count(AlarmEvent.id)).where(AlarmEvent.status == s)
        if base_filter:
            query = query.where(*base_filter)
        result = await db.execute(query)
        status_counts[s] = result.scalar()
    
    # 按类型统计
    type_query = select(AlarmEvent.type, func.count(AlarmEvent.id)).group_by(AlarmEvent.type)
    if base_filter:
        type_query = type_query.where(*base_filter)
    type_result = await db.execute(type_query)
    by_type = {row[0]: row[1] for row in type_result.all()}
    
    # 按级别统计
    level_query = select(AlarmEvent.level, func.count(AlarmEvent.id)).group_by(AlarmEvent.level)
    if base_filter:
        level_query = level_query.where(*base_filter)
    level_result = await db.execute(level_query)
    by_level = {row[0]: row[1] for row in level_result.all()}
    
    return AlarmStatistics(
        total=total,
        pending=status_counts.get("pending", 0),
        processing=status_counts.get("processing", 0),
        resolved=status_counts.get("resolved", 0),
        ignored=status_counts.get("ignored", 0),
        by_type=by_type,
        by_level=by_level
    )


@router.get("/{alarm_id}", response_model=AlarmEventResponse, summary="获取报警详情")
async def get_alarm(
    alarm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定报警事件的详细信息"""
    result = await db.execute(select(AlarmEvent).where(AlarmEvent.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报警事件不存在"
        )
    
    return AlarmEventResponse.model_validate(alarm)


@router.put("/{alarm_id}/handle", response_model=AlarmEventResponse, summary="处理报警")
async def handle_alarm(
    alarm_id: int,
    request: Request,
    alarm_data: AlarmEventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("alarm:handle"))
):
    """
    处理报警事件
    
    - **status**: 更新状态 (processing/resolved/ignored)
    - **handle_note**: 处理备注
    """
    result = await db.execute(select(AlarmEvent).where(AlarmEvent.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报警事件不存在"
        )
    
    # 验证状态
    if alarm_data.status:
        valid_statuses = ["pending", "processing", "resolved", "ignored"]
        if alarm_data.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的状态，有效值: {valid_statuses}"
            )
    
    # 更新字段
    if alarm_data.status:
        alarm.status = alarm_data.status
        if alarm_data.status in ["resolved", "ignored"]:
            alarm.handled_at = datetime.utcnow()
    
    if alarm_data.handle_note:
        alarm.handle_note = alarm_data.handle_note
    
    alarm.handler_id = current_user.id
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="handle",
        resource="alarm",
        resource_id=str(alarm_id),
        detail=f"处理报警: {alarm.type}, 状态: {alarm.status}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(alarm)
    
    return AlarmEventResponse.model_validate(alarm)


@router.delete("/{alarm_id}", summary="删除报警事件")
async def delete_alarm(
    alarm_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("alarm:handle"))
):
    """删除报警事件"""
    result = await db.execute(select(AlarmEvent).where(AlarmEvent.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报警事件不存在"
        )
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="delete",
        resource="alarm",
        resource_id=str(alarm_id),
        detail=f"删除报警: {alarm.type}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.delete(alarm)
    await db.commit()
    
    return {"message": "报警事件已删除"}


@router.get("/types/list", summary="获取报警类型列表")
async def get_alarm_types(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有报警类型"""
    return [
        {"key": "intrusion", "name": "入侵报警", "description": "未授权人员进入禁区/限制区"},
        {"key": "stay", "name": "滞留报警", "description": "人员在区域内停留超时"},
        {"key": "absence", "name": "缺勤报警", "description": "区域内人员不足"},
        {"key": "unauthorized", "name": "未授权报警", "description": "未识别人员进入"}
    ]


@router.get("/levels/list", summary="获取报警级别列表")
async def get_alarm_levels(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有报警级别"""
    return [
        {"key": "low", "name": "低", "color": "#52c41a"},
        {"key": "medium", "name": "中", "color": "#faad14"},
        {"key": "high", "name": "高", "color": "#ff7a45"},
        {"key": "critical", "name": "紧急", "color": "#f5222d"}
    ]
