"""API模式定义模块"""
from .common import Response, PageResponse, ErrorResponse
from .user import (
    Token,
    TokenPayload,
    RoleBase,
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    UserBase,
    UserCreate,
    UserUpdate,
    UserPasswordUpdate,
    UserResponse,
    UserListResponse,
    LoginRequest,
    LoginResponse,
    OperationLogResponse,
    OperationLogListResponse
)
from .map import (
    MapConfigCreate,
    MapConfigUpdate,
    MapConfigResponse,
    ScaleCalibrationRequest,
    ScaleCalibrationResponse,
    SystemConfigCreate,
    SystemConfigUpdate,
    SystemConfigResponse
)
from .camera import (
    CameraCreate,
    CameraUpdate,
    CameraResponse,
    CameraListResponse,
    CameraCalibrationCreate,
    CameraCalibrationResponse,
    CoordinateTransformRequest,
    CoordinateTransformResponse
)
from .safety_zone import (
    SafetyZoneCreate,
    SafetyZoneUpdate,
    SafetyZoneResponse,
    SafetyZoneListResponse,
    PointInZoneRequest,
    PointInZoneResponse
)
from .alarm import (
    AlarmEventCreate,
    AlarmEventUpdate,
    AlarmEventResponse,
    AlarmEventListResponse,
    AlarmStatistics
)
from .ai_model import (
    AIModelUpdate,
    AIModelResponse,
    AIModelListResponse,
    AIModelUploadResponse
)

__all__ = [
    # Common
    "Response",
    "PageResponse",
    "ErrorResponse",
    # User
    "Token",
    "TokenPayload",
    "RoleBase",
    "RoleCreate",
    "RoleUpdate",
    "RoleResponse",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserPasswordUpdate",
    "UserResponse",
    "UserListResponse",
    "LoginRequest",
    "LoginResponse",
    "OperationLogResponse",
    "OperationLogListResponse",
    # Map
    "MapConfigCreate",
    "MapConfigUpdate",
    "MapConfigResponse",
    "ScaleCalibrationRequest",
    "ScaleCalibrationResponse",
    "SystemConfigCreate",
    "SystemConfigUpdate",
    "SystemConfigResponse",
    # Camera
    "CameraCreate",
    "CameraUpdate",
    "CameraResponse",
    "CameraListResponse",
    "CameraCalibrationCreate",
    "CameraCalibrationResponse",
    "CoordinateTransformRequest",
    "CoordinateTransformResponse",
    # Safety Zone
    "SafetyZoneCreate",
    "SafetyZoneUpdate",
    "SafetyZoneResponse",
    "SafetyZoneListResponse",
    "PointInZoneRequest",
    "PointInZoneResponse",
    # Alarm
    "AlarmEventCreate",
    "AlarmEventUpdate",
    "AlarmEventResponse",
    "AlarmEventListResponse",
    "AlarmStatistics",
    # AI Model
    "AIModelUpdate",
    "AIModelResponse",
    "AIModelListResponse",
    "AIModelUploadResponse"
]
