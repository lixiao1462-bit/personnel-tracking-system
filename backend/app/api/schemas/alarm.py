"""
报警相关的Pydantic模式定义
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AlarmEventBase(BaseModel):
    """报警事件基础模式"""
    type: str = Field(..., description="报警类型")
    level: str = Field("medium", description="报警级别")
    zone_id: Optional[int] = Field(None, description="关联围栏ID")
    zone_name: Optional[str] = Field(None, description="围栏名称")
    camera_id: Optional[int] = Field(None, description="关联摄像头ID")
    camera_name: Optional[str] = Field(None, description="摄像头名称")
    person_id: Optional[str] = Field(None, description="人员追踪ID")
    person_role: Optional[str] = Field(None, description="人员工装类型")
    location_x: Optional[float] = Field(None, description="X坐标(米)")
    location_y: Optional[float] = Field(None, description="Y坐标(米)")
    snapshot_url: Optional[str] = Field(None, description="抓拍图片URL")
    description: Optional[str] = Field(None, description="报警描述")


class AlarmEventCreate(AlarmEventBase):
    """创建报警事件"""
    pass


class AlarmEventUpdate(BaseModel):
    """更新报警事件"""
    status: Optional[str] = Field(None, description="报警状态")
    handle_note: Optional[str] = Field(None, description="处理备注")


class AlarmEventResponse(AlarmEventBase):
    """报警事件响应"""
    id: int
    status: str
    handler_id: Optional[int] = None
    handle_note: Optional[str] = None
    handled_at: Optional[datetime] = None
    dingtalk_notified: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AlarmEventListResponse(BaseModel):
    """报警事件列表响应"""
    total: int
    items: List[AlarmEventResponse]


class AlarmStatistics(BaseModel):
    """报警统计"""
    total: int = Field(..., description="总报警数")
    pending: int = Field(..., description="待处理数")
    processing: int = Field(..., description="处理中数")
    resolved: int = Field(..., description="已解决数")
    ignored: int = Field(..., description="已忽略数")
    by_type: dict = Field(default_factory=dict, description="按类型统计")
    by_level: dict = Field(default_factory=dict, description="按级别统计")
