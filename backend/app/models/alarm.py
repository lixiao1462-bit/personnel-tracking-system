"""
报警事件数据模型
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, JSON, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class AlarmEvent(Base):
    """报警事件表"""
    __tablename__ = "alarm_events"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # 报警类型: intrusion(入侵), stay(滞留), absence(缺勤), unauthorized(未授权)
    type: Mapped[str] = mapped_column(String(50), index=True, comment="报警类型")
    
    # 报警级别: low(低), medium(中), high(高), critical(紧急)
    level: Mapped[str] = mapped_column(String(20), default="medium", comment="报警级别")
    
    # 报警状态: pending(待处理), processing(处理中), resolved(已解决), ignored(已忽略)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True, comment="报警状态")
    
    # 关联的电子围栏
    zone_id: Mapped[Optional[int]] = mapped_column(ForeignKey("safety_zones.id"), nullable=True)
    zone_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="围栏名称")
    
    # 关联的摄像头
    camera_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    camera_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="摄像头名称")
    
    # 检测到的人员信息
    person_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="人员追踪ID")
    person_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="人员工装类型")
    
    # 位置信息
    location_x: Mapped[Optional[float]] = mapped_column(nullable=True, comment="X坐标(米)")
    location_y: Mapped[Optional[float]] = mapped_column(nullable=True, comment="Y坐标(米)")
    
    # 抓拍图片
    snapshot_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="抓拍图片URL")
    
    # 报警描述
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="报警描述")
    
    # 处理信息
    handler_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    handle_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="处理备注")
    handled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="处理时间")
    
    # 通知状态
    dingtalk_notified: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否已发送钉钉通知")
    
    # 时间字段
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
