"""
摄像头相关的Pydantic模式定义
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ==================== Camera ====================
class CameraBase(BaseModel):
    """摄像头基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="摄像头名称")
    index_code: str = Field(..., min_length=1, max_length=100, description="海康平台索引码")
    rtsp_url: Optional[str] = Field(None, max_length=500, description="RTSP流地址")
    location_x: Optional[float] = Field(None, description="在地图上的X坐标(米)")
    location_y: Optional[float] = Field(None, description="在地图上的Y坐标(米)")
    rotation: float = Field(0.0, description="摄像头朝向角度")


class CameraCreate(CameraBase):
    """创建摄像头"""
    pass


class CameraUpdate(BaseModel):
    """更新摄像头"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    rtsp_url: Optional[str] = Field(None, max_length=500)
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    rotation: Optional[float] = None
    h_matrix: Optional[List[List[float]]] = None
    fov_polygon: Optional[List[List[float]]] = None
    is_active: Optional[bool] = None


class CameraResponse(CameraBase):
    """摄像头响应"""
    id: int
    h_matrix: Optional[List[List[float]]] = None
    fov_polygon: Optional[List[List[float]]] = None
    is_active: bool
    is_online: bool
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CameraListResponse(BaseModel):
    """摄像头列表响应"""
    total: int
    items: List[CameraResponse]


# ==================== CameraCalibration ====================
class CalibrationPointPair(BaseModel):
    """标定点对"""
    video_point: List[float] = Field(..., min_length=2, max_length=2, description="视频画面点[x, y]")
    map_point: List[float] = Field(..., min_length=2, max_length=2, description="地图点[x, y]")


class CameraCalibrationCreate(BaseModel):
    """创建摄像头标定"""
    camera_id: int = Field(..., description="摄像头ID")
    video_points: List[List[float]] = Field(..., min_length=4, max_length=4, description="视频画面4个标定点")
    map_points: List[List[float]] = Field(..., min_length=4, max_length=4, description="地图4个标定点")


class CameraCalibrationResponse(BaseModel):
    """摄像头标定响应"""
    id: int
    camera_id: int
    video_points: List[List[float]]
    map_points: List[List[float]]
    h_matrix: List[List[float]]
    reprojection_error: Optional[float] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== 坐标转换 ====================
class CoordinateTransformRequest(BaseModel):
    """坐标转换请求"""
    camera_id: int = Field(..., description="摄像头ID")
    video_x: float = Field(..., description="视频画面X坐标")
    video_y: float = Field(..., description="视频画面Y坐标")


class CoordinateTransformResponse(BaseModel):
    """坐标转换响应"""
    map_x: float = Field(..., description="地图X坐标(米)")
    map_y: float = Field(..., description="地图Y坐标(米)")
