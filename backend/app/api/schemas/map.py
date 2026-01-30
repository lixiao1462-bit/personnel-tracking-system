"""
地图相关的Pydantic模式定义
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ==================== MapConfig ====================
class MapConfigBase(BaseModel):
    """地图配置基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="地图名称")
    description: Optional[str] = Field(None, description="地图描述")
    image_url: str = Field(..., description="地图图片URL")
    image_width: int = Field(..., gt=0, description="图片宽度(像素)")
    image_height: int = Field(..., gt=0, description="图片高度(像素)")
    scale_ratio: float = Field(1.0, gt=0, description="比例尺(米/像素)")
    origin_x: float = Field(0.0, description="原点X坐标(像素)")
    origin_y: float = Field(0.0, description="原点Y坐标(像素)")


class MapConfigCreate(MapConfigBase):
    """创建地图配置"""
    calibration_points: Optional[dict] = Field(None, description="标定点数据")


class MapConfigUpdate(BaseModel):
    """更新地图配置"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_width: Optional[int] = Field(None, gt=0)
    image_height: Optional[int] = Field(None, gt=0)
    scale_ratio: Optional[float] = Field(None, gt=0)
    origin_x: Optional[float] = None
    origin_y: Optional[float] = None
    calibration_points: Optional[dict] = None
    is_active: Optional[bool] = None


class MapConfigResponse(MapConfigBase):
    """地图配置响应"""
    id: int
    calibration_points: Optional[dict] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== 比例尺标定 ====================
class CalibrationPoint(BaseModel):
    """标定点"""
    x: float = Field(..., description="X坐标(像素)")
    y: float = Field(..., description="Y坐标(像素)")


class ScaleCalibrationRequest(BaseModel):
    """比例尺标定请求"""
    point1: CalibrationPoint = Field(..., description="第一个标定点")
    point2: CalibrationPoint = Field(..., description="第二个标定点")
    actual_distance: float = Field(..., gt=0, description="实际距离(米)")


class ScaleCalibrationResponse(BaseModel):
    """比例尺标定响应"""
    scale_ratio: float = Field(..., description="计算得到的比例尺(米/像素)")
    pixel_distance: float = Field(..., description="像素距离")
    actual_distance: float = Field(..., description="实际距离(米)")


# ==================== SystemConfig ====================
class SystemConfigBase(BaseModel):
    """系统配置基础模式"""
    key: str = Field(..., min_length=1, max_length=100, description="配置键")
    value: str = Field(..., description="配置值")
    value_type: str = Field("string", description="值类型")
    description: Optional[str] = Field(None, description="配置描述")
    category: str = Field("general", description="配置分类")


class SystemConfigCreate(SystemConfigBase):
    """创建系统配置"""
    pass


class SystemConfigUpdate(BaseModel):
    """更新系统配置"""
    value: Optional[str] = None
    value_type: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class SystemConfigResponse(SystemConfigBase):
    """系统配置响应"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
