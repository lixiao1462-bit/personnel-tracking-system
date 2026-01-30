"""
AI模型数据模型
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, JSON, Boolean, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class AIModel(Base):
    """AI模型表"""
    __tablename__ = "ai_models"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), comment="模型名称")
    version: Mapped[str] = mapped_column(String(50), comment="模型版本")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="模型描述")
    
    # 模型文件信息
    file_path: Mapped[str] = mapped_column(String(500), comment="模型文件路径")
    file_name: Mapped[str] = mapped_column(String(200), comment="原始文件名")
    file_size: Mapped[int] = mapped_column(BigInteger, comment="文件大小(字节)")
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="文件MD5哈希")
    
    # 模型类型: yolo, tensorrt, onnx
    model_type: Mapped[str] = mapped_column(String(20), default="tensorrt", comment="模型类型")
    
    # 模型配置
    # 例如: {"input_size": [640, 640], "classes": ["production", "process", "equipment", "quality"]}
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="模型配置")
    
    # 检测类别
    classes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="检测类别列表")
    
    # 性能指标
    inference_time: Mapped[Optional[float]] = mapped_column(nullable=True, comment="推理时间(ms)")
    accuracy: Mapped[Optional[float]] = mapped_column(nullable=True, comment="准确率")
    
    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否为当前激活模型")
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, comment="模型是否有效")
    
    # 上传者
    uploaded_by: Mapped[Optional[int]] = mapped_column(nullable=True, comment="上传者用户ID")
    
    # 时间字段
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
