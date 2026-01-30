"""
应用配置模块
使用 pydantic-settings 管理环境变量
"""
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用基础配置
    APP_NAME: str = "人员定位监控系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "your-secret-key-change-in-production"
    
    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://kf_user:kf_password@localhost:5432/personnel_tracking"
    
    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT配置
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 钉钉机器人配置
    DINGTALK_WEBHOOK: Optional[str] = None
    DINGTALK_SECRET: Optional[str] = None
    
    # 文件上传配置
    UPLOAD_DIR: str = "/home/ubuntu/kf/data/uploads"
    MAX_UPLOAD_SIZE: int = 104857600  # 100MB
    
    # AI模型配置
    MODEL_DIR: str = "/home/ubuntu/kf/data/models"
    DEFAULT_MODEL: str = "yolov11n.engine"
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "/home/ubuntu/kf/backend/logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
