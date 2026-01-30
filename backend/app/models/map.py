"""
地图配置数据模型
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Float, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class MapConfig(Base):
    """地图配置表"""
    __tablename__ = "map_config"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), comment="地图名称")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="地图描述")
    
    # 图片配置
    image_url: Mapped[str] = mapped_column(String(500), comment="地图图片URL")
    image_width: Mapped[int] = mapped_column(comment="图片宽度(像素)")
    image_height: Mapped[int] = mapped_column(comment="图片高度(像素)")
    
    # 比例尺配置
    scale_ratio: Mapped[float] = mapped_column(Float, default=1.0, comment="比例尺(米/像素)")
    
    # 原点配置 (地图坐标系原点在图片中的位置)
    origin_x: Mapped[float] = mapped_column(Float, default=0.0, comment="原点X坐标(像素)")
    origin_y: Mapped[float] = mapped_column(Float, default=0.0, comment="原点Y坐标(像素)")
    
    # 标定点数据 (用于计算比例尺的两个点)
    calibration_points: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="标定点数据")
    
    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否为当前使用的地图")
    
    # 时间字段
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_config"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, comment="配置键")
    value: Mapped[str] = mapped_column(Text, comment="配置值")
    value_type: Mapped[str] = mapped_column(String(20), default="string", comment="值类型(string/int/float/bool/json)")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="配置描述")
    category: Mapped[str] = mapped_column(String(50), default="general", comment="配置分类")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
