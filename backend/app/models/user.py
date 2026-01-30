"""
用户和角色数据模型
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Role(Base):
    """角色表"""
    __tablename__ = "roles"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="角色名称")
    display_name: Mapped[str] = mapped_column(String(100), comment="显示名称")
    permissions: Mapped[dict] = mapped_column(JSON, default=dict, comment="权限配置")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="角色描述")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联用户
    users: Mapped[List["User"]] = relationship("User", back_populates="role")


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="用户名")
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, comment="邮箱")
    password_hash: Mapped[str] = mapped_column(String(255), comment="密码哈希")
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="姓名")
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment="手机号")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="头像URL")
    
    # 角色关联
    role_id: Mapped[Optional[int]] = mapped_column(ForeignKey("roles.id"), nullable=True)
    role: Mapped[Optional["Role"]] = relationship("Role", back_populates="users")
    
    # 状态字段
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否超级管理员")
    
    # 时间字段
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="最后登录时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联操作日志
    operation_logs: Mapped[List["OperationLog"]] = relationship("OperationLog", back_populates="user")


class OperationLog(Base):
    """操作日志表"""
    __tablename__ = "operation_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    user: Mapped[Optional["User"]] = relationship("User", back_populates="operation_logs")
    
    operation: Mapped[str] = mapped_column(String(50), comment="操作类型")
    resource: Mapped[str] = mapped_column(String(100), comment="操作资源")
    resource_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="资源ID")
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="操作详情")
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="IP地址")
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="用户代理")
    status: Mapped[str] = mapped_column(String(20), default="success", comment="操作状态")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
