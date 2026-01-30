"""数据模型模块"""
from .user import User, Role, OperationLog
from .map import MapConfig, SystemConfig
from .camera import Camera, CameraCalibration
from .safety_zone import SafetyZone
from .alarm import AlarmEvent
from .ai_model import AIModel

__all__ = [
    "User",
    "Role",
    "OperationLog",
    "MapConfig",
    "SystemConfig",
    "Camera",
    "CameraCalibration",
    "SafetyZone",
    "AlarmEvent",
    "AIModel"
]
