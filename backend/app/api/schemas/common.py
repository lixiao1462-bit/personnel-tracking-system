"""
通用响应模式定义
"""
from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")


class ResponseBase(BaseModel):
    """基础响应模式"""
    code: int = 0
    message: str = "success"


class Response(ResponseBase, Generic[T]):
    """通用响应模式"""
    data: Optional[T] = None


class PageResponse(ResponseBase, Generic[T]):
    """分页响应模式"""
    data: Optional[T] = None
    total: int = 0
    page: int = 1
    page_size: int = 20


class ErrorResponse(BaseModel):
    """错误响应模式"""
    code: int
    message: str
    detail: Optional[Any] = None
