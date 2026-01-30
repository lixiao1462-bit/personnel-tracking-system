"""
摄像头数据模型
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Float, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Camera(Base):
    """摄像头表"""
    __tablename__ = "cameras"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), comment="摄像头名称")
    index_code: Mapped[str] = mapped_column(String(100), unique=True, index=True, comment="海康平台索引码")
    
    # RTSP流配置
    rtsp_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="RTSP流地址")
    
    # 位置信息
    location_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="在地图上的X坐标(米)")
    location_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="在地图上的Y坐标(米)")
    rotation: Mapped[float] = mapped_column(Float, default=0.0, comment="摄像头朝向角度")
    
    # 单应性矩阵 (3x3矩阵，用于视频坐标到地图坐标的转换)
    h_matrix: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, comment="单应性变换矩阵")
    
    # FOV视野多边形 (地图坐标系下的多边形顶点)
    fov_polygon: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, comment="FOV视野多边形顶点")
    
    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否在线")
    
    # 时间字段
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="最后心跳时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联标定数据
    calibrations: Mapped[List["CameraCalibration"]] = relationship("CameraCalibration", back_populates="camera")


class CameraCalibration(Base):
    """摄像头标定数据表"""
    __tablename__ = "camera_calibration"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id"), index=True)
    camera: Mapped["Camera"] = relationship("Camera", back_populates="calibrations")
    
    # 标定点数据
    # video_points: 视频画面中的4个点 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    video_points: Mapped[List] = mapped_column(JSON, comment="视频画面标定点")
    # map_points: 地图上对应的4个点 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    map_points: Mapped[List] = mapped_column(JSON, comment="地图标定点")
    
    # 计算得到的单应性矩阵
    h_matrix: Mapped[List] = mapped_column(JSON, comment="单应性变换矩阵")
    
    # 标定质量评估
    reprojection_error: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="重投影误差")
    
    # 是否为当前使用的标定
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否为当前使用的标定")
    
    # 时间字段
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
