"""
电子围栏数据模型
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, Text, JSON, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class SafetyZone(Base):
    """电子围栏表"""
    __tablename__ = "safety_zones"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), comment="围栏名称")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="围栏描述")
    
    # 围栏类型: forbidden(禁区), restricted(限制区), safe(安全区)
    zone_type: Mapped[str] = mapped_column(String(20), default="restricted", comment="围栏类型")
    
    # 围栏多边形顶点 (米制坐标)
    # [[x1,y1], [x2,y2], [x3,y3], ...]
    vertices_meters: Mapped[List] = mapped_column(JSON, comment="围栏多边形顶点(米)")
    
    # 允许进入的角色列表
    # ["production", "process", "equipment", "quality"]
    required_roles: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, comment="允许进入的角色")
    
    # 报警类型: intrusion(入侵), stay(滞留), absence(缺勤)
    alarm_type: Mapped[str] = mapped_column(String(20), default="intrusion", comment="报警类型")
    
    # 报警规则配置
    alarm_rules: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="报警规则配置")
    # 例如: {"stay_threshold": 300, "min_people": 1, "max_people": 5}
    
    # 颜色配置 (用于前端显示)
    fill_color: Mapped[str] = mapped_column(String(20), default="#ff0000", comment="填充颜色")
    stroke_color: Mapped[str] = mapped_column(String(20), default="#ff0000", comment="边框颜色")
    fill_opacity: Mapped[float] = mapped_column(default=0.3, comment="填充透明度")
    
    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    
    # 时间字段
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
