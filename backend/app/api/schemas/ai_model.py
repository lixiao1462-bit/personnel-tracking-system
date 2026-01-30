"""
AI模型相关的Pydantic模式定义
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AIModelBase(BaseModel):
    """AI模型基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="模型名称")
    version: str = Field(..., min_length=1, max_length=50, description="模型版本")
    description: Optional[str] = Field(None, description="模型描述")
    model_type: str = Field("tensorrt", description="模型类型")
    config: Optional[dict] = Field(None, description="模型配置")
    classes: Optional[List[str]] = Field(None, description="检测类别列表")


class AIModelCreate(AIModelBase):
    """创建AI模型（用于元数据）"""
    pass


class AIModelUpdate(BaseModel):
    """更新AI模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    version: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    config: Optional[dict] = None
    classes: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AIModelResponse(AIModelBase):
    """AI模型响应"""
    id: int
    file_path: str
    file_name: str
    file_size: int
    file_hash: Optional[str] = None
    inference_time: Optional[float] = None
    accuracy: Optional[float] = None
    is_active: bool
    is_valid: bool
    uploaded_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AIModelListResponse(BaseModel):
    """AI模型列表响应"""
    total: int
    items: List[AIModelResponse]


class AIModelUploadResponse(BaseModel):
    """AI模型上传响应"""
    id: int
    name: str
    version: str
    file_name: str
    file_size: int
    file_hash: str
    message: str
