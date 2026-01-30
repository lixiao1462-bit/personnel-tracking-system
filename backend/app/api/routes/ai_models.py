"""
AI模型管理API路由
"""
import os
import uuid
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.ai_model import AIModel
from app.models.user import User, OperationLog
from app.api.schemas.ai_model import (
    AIModelUpdate,
    AIModelResponse,
    AIModelListResponse,
    AIModelUploadResponse
)
from app.api.deps import get_current_active_user, check_permission
from app.core.config import settings

router = APIRouter(prefix="/models", tags=["AI模型管理"])


def calculate_file_hash(file_path: str) -> str:
    """计算文件MD5哈希"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


@router.get("", response_model=AIModelListResponse, summary="获取AI模型列表")
async def get_models(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    model_type: Optional[str] = Query(None, description="模型类型"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取AI模型列表（分页）
    """
    # 构建查询
    query = select(AIModel)
    count_query = select(func.count(AIModel.id))
    
    # 类型筛选
    if model_type:
        query = query.where(AIModel.model_type == model_type)
        count_query = count_query.where(AIModel.model_type == model_type)
    
    # 激活状态筛选
    if is_active is not None:
        query = query.where(AIModel.is_active == is_active)
        count_query = count_query.where(AIModel.is_active == is_active)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.order_by(AIModel.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    models = result.scalars().all()
    
    return AIModelListResponse(
        total=total,
        items=[AIModelResponse.model_validate(m) for m in models]
    )


@router.get("/active", response_model=AIModelResponse, summary="获取当前激活的模型")
async def get_active_model(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取当前激活使用的AI模型"""
    result = await db.execute(
        select(AIModel).where(AIModel.is_active == True)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="没有激活的AI模型"
        )
    
    return AIModelResponse.model_validate(model)


@router.post("/upload", response_model=AIModelUploadResponse, summary="上传AI模型")
async def upload_model(
    request: Request,
    file: UploadFile = File(..., description="模型文件"),
    name: str = Form(..., description="模型名称"),
    version: str = Form(..., description="模型版本"),
    description: Optional[str] = Form(None, description="模型描述"),
    model_type: str = Form("tensorrt", description="模型类型"),
    classes: Optional[str] = Form(None, description="检测类别，逗号分隔"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("model:upload"))
):
    """
    上传AI模型文件
    
    支持格式: .engine (TensorRT), .onnx, .pt (PyTorch)
    """
    # 检查文件类型
    allowed_extensions = [".engine", ".onnx", ".pt", ".pth"]
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式，允许的格式: {allowed_extensions}"
        )
    
    # 检查文件大小
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件大小超过限制 ({settings.MAX_UPLOAD_SIZE / 1024 / 1024:.0f}MB)"
        )
    
    # 生成文件名和路径
    file_uuid = uuid.uuid4().hex
    filename = f"{name}_{version}_{file_uuid}{file_ext}"
    file_path = os.path.join(settings.MODEL_DIR, filename)
    
    # 确保目录存在
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 计算文件哈希
    file_hash = calculate_file_hash(file_path)
    
    # 解析检测类别
    classes_list = None
    if classes:
        classes_list = [c.strip() for c in classes.split(",") if c.strip()]
    
    # 创建模型记录
    model = AIModel(
        name=name,
        version=version,
        description=description,
        file_path=file_path,
        file_name=file.filename or filename,
        file_size=len(content),
        file_hash=file_hash,
        model_type=model_type,
        classes=classes_list,
        uploaded_by=current_user.id,
        is_active=False,
        is_valid=True
    )
    db.add(model)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="upload",
        resource="model",
        detail=f"上传AI模型: {name} v{version}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(model)
    
    return AIModelUploadResponse(
        id=model.id,
        name=model.name,
        version=model.version,
        file_name=model.file_name,
        file_size=model.file_size,
        file_hash=model.file_hash,
        message="模型上传成功"
    )


@router.get("/{model_id}", response_model=AIModelResponse, summary="获取模型详情")
async def get_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定AI模型的详细信息"""
    result = await db.execute(select(AIModel).where(AIModel.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI模型不存在"
        )
    
    return AIModelResponse.model_validate(model)


@router.put("/{model_id}", response_model=AIModelResponse, summary="更新模型信息")
async def update_model(
    model_id: int,
    request: Request,
    model_data: AIModelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("model:upload"))
):
    """更新AI模型信息"""
    result = await db.execute(select(AIModel).where(AIModel.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI模型不存在"
        )
    
    # 更新字段
    update_data = model_data.model_dump(exclude_unset=True)
    
    # 如果要激活此模型，先取消其他模型的激活状态
    if update_data.get("is_active"):
        result = await db.execute(
            select(AIModel).where(AIModel.id != model_id, AIModel.is_active == True)
        )
        other_models = result.scalars().all()
        for m in other_models:
            m.is_active = False
    
    for field, value in update_data.items():
        setattr(model, field, value)
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="update",
        resource="model",
        resource_id=str(model_id),
        detail=f"更新AI模型: {model.name}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(model)
    
    return AIModelResponse.model_validate(model)


@router.post("/{model_id}/activate", response_model=AIModelResponse, summary="激活模型")
async def activate_model(
    model_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("model:activate"))
):
    """
    激活指定的AI模型
    同时会取消其他模型的激活状态
    """
    result = await db.execute(select(AIModel).where(AIModel.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI模型不存在"
        )
    
    if not model.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="模型无效，无法激活"
        )
    
    # 取消其他模型的激活状态
    result = await db.execute(
        select(AIModel).where(AIModel.id != model_id, AIModel.is_active == True)
    )
    other_models = result.scalars().all()
    for m in other_models:
        m.is_active = False
    
    # 激活当前模型
    model.is_active = True
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="activate",
        resource="model",
        resource_id=str(model_id),
        detail=f"激活AI模型: {model.name} v{model.version}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(model)
    
    return AIModelResponse.model_validate(model)


@router.delete("/{model_id}", summary="删除AI模型")
async def delete_model(
    model_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("model:delete"))
):
    """删除AI模型"""
    result = await db.execute(select(AIModel).where(AIModel.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI模型不存在"
        )
    
    if model.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除当前激活的模型"
        )
    
    # 删除文件
    if os.path.exists(model.file_path):
        try:
            os.remove(model.file_path)
        except Exception:
            pass  # 文件删除失败不影响数据库记录删除
    
    # 记录操作日志
    log = OperationLog(
        user_id=current_user.id,
        operation="delete",
        resource="model",
        resource_id=str(model_id),
        detail=f"删除AI模型: {model.name} v{model.version}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    db.add(log)
    
    await db.delete(model)
    await db.commit()
    
    return {"message": "AI模型已删除"}


@router.get("/types/list", summary="获取模型类型列表")
async def get_model_types(
    current_user: User = Depends(get_current_active_user)
):
    """获取所有模型类型"""
    return [
        {"key": "tensorrt", "name": "TensorRT", "extension": ".engine", "description": "NVIDIA TensorRT优化模型"},
        {"key": "onnx", "name": "ONNX", "extension": ".onnx", "description": "开放神经网络交换格式"},
        {"key": "pytorch", "name": "PyTorch", "extension": ".pt", "description": "PyTorch模型文件"}
    ]
