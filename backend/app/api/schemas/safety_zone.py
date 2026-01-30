"""
电子围栏相关的Pydantic模式定义
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class SafetyZoneBase(BaseModel):
    """电子围栏基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="围栏名称")
    description: Optional[str] = Field(None, description="围栏描述")
    zone_type: str = Field("restricted", description="围栏类型: forbidden/restricted/safe")
    vertices_meters: List[List[float]] = Field(..., min_length=3, description="围栏多边形顶点(米)")
    required_roles: Optional[List[str]] = Field(None, description="允许进入的角色")
    alarm_type: str = Field("intrusion", description="报警类型: intrusion/stay/absence")
    alarm_rules: Optional[dict] = Field(None, description="报警规则配置")
    fill_color: str = Field("#ff0000", description="填充颜色")
    stroke_color: str = Field("#ff0000", description="边框颜色")
    fill_opacity: float = Field(0.3, ge=0, le=1, description="填充透明度")


class SafetyZoneCreate(SafetyZoneBase):
    """创建电子围栏"""
    pass


class SafetyZoneUpdate(BaseModel):
    """更新电子围栏"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    zone_type: Optional[str] = None
    vertices_meters: Optional[List[List[float]]] = None
    required_roles: Optional[List[str]] = None
    alarm_type: Optional[str] = None
    alarm_rules: Optional[dict] = None
    fill_color: Optional[str] = None
    stroke_color: Optional[str] = None
    fill_opacity: Optional[float] = Field(None, ge=0, le=1)
    is_active: Optional[bool] = None


class SafetyZoneResponse(SafetyZoneBase):
    """电子围栏响应"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SafetyZoneListResponse(BaseModel):
    """电子围栏列表响应"""
    total: int
    items: List[SafetyZoneResponse]


# ==================== 点位检测 ====================
class PointInZoneRequest(BaseModel):
    """点位检测请求"""
    x: float = Field(..., description="X坐标(米)")
    y: float = Field(..., description="Y坐标(米)")
    role: Optional[str] = Field(None, description="人员角色")


class PointInZoneResponse(BaseModel):
    """点位检测响应"""
    in_zones: List[int] = Field(default_factory=list, description="所在围栏ID列表")
    violations: List[dict] = Field(default_factory=list, description="违规信息列表")
