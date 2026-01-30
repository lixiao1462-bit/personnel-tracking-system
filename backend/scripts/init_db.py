#!/usr/bin/env python3
"""
数据库初始化脚本
创建表、默认角色和管理员账户
"""
import sys
import asyncio
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from app.db.database import engine, AsyncSessionLocal, Base
from app.models.user import User, Role
from app.models.map import MapConfig, SystemConfig
from app.models.camera import Camera, CameraCalibration
from app.models.safety_zone import SafetyZone
from app.models.alarm import AlarmEvent
from app.models.ai_model import AIModel
from app.core.security import get_password_hash


async def create_tables():
    """创建所有数据库表"""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")


async def create_default_roles():
    """创建默认角色"""
    print("Creating default roles...")
    
    default_roles = [
        {
            "name": "admin",
            "display_name": "管理员",
            "description": "系统管理员，拥有所有权限",
            "permissions": {
                "user:read": True, "user:create": True, "user:update": True, "user:delete": True,
                "role:read": True, "role:create": True, "role:update": True, "role:delete": True,
                "map:read": True, "map:update": True,
                "camera:read": True, "camera:create": True, "camera:update": True, "camera:delete": True, "camera:calibrate": True,
                "zone:read": True, "zone:create": True, "zone:update": True, "zone:delete": True,
                "alarm:read": True, "alarm:handle": True,
                "model:read": True, "model:upload": True, "model:delete": True, "model:activate": True,
                "log:read": True,
                "config:read": True, "config:update": True
            }
        },
        {
            "name": "operator",
            "display_name": "操作员",
            "description": "系统操作员，可以查看和处理报警",
            "permissions": {
                "user:read": True,
                "role:read": True,
                "map:read": True,
                "camera:read": True,
                "zone:read": True,
                "alarm:read": True, "alarm:handle": True,
                "model:read": True,
                "log:read": True,
                "config:read": True
            }
        },
        {
            "name": "viewer",
            "display_name": "观察员",
            "description": "只读用户，只能查看信息",
            "permissions": {
                "user:read": True,
                "role:read": True,
                "map:read": True,
                "camera:read": True,
                "zone:read": True,
                "alarm:read": True,
                "model:read": True,
                "config:read": True
            }
        }
    ]
    
    async with AsyncSessionLocal() as session:
        for role_data in default_roles:
            # 检查角色是否已存在
            result = await session.execute(
                select(Role).where(Role.name == role_data["name"])
            )
            existing_role = result.scalar_one_or_none()
            
            if not existing_role:
                role = Role(**role_data)
                session.add(role)
                print(f"  Created role: {role_data['display_name']}")
            else:
                print(f"  Role already exists: {role_data['display_name']}")
        
        await session.commit()
    
    print("Default roles created!")


async def create_admin_user():
    """创建管理员账户"""
    print("Creating admin user...")
    
    async with AsyncSessionLocal() as session:
        # 检查管理员是否已存在
        result = await session.execute(
            select(User).where(User.username == "admin")
        )
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print("  Admin user already exists!")
            return
        
        # 获取管理员角色
        result = await session.execute(
            select(Role).where(Role.name == "admin")
        )
        admin_role = result.scalar_one_or_none()
        
        # 创建管理员账户
        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=get_password_hash("admin123"),
            full_name="系统管理员",
            role_id=admin_role.id if admin_role else None,
            is_superuser=True,
            is_active=True
        )
        session.add(admin)
        await session.commit()
        
        print("  Admin user created!")
        print("  Username: admin")
        print("  Password: admin123")
        print("  ⚠️  Please change the default password after first login!")


async def create_default_config():
    """创建默认系统配置"""
    print("Creating default system config...")
    
    default_configs = [
        {"key": "inference_fps", "value": "5", "value_type": "int", "category": "ai", "description": "AI推理帧率"},
        {"key": "track_max_age", "value": "30", "value_type": "int", "category": "ai", "description": "追踪最大丢失帧数"},
        {"key": "confidence_threshold", "value": "0.5", "value_type": "float", "category": "ai", "description": "检测置信度阈值"},
        {"key": "websocket_heartbeat", "value": "30", "value_type": "int", "category": "system", "description": "WebSocket心跳间隔(秒)"},
        {"key": "alarm_cooldown", "value": "60", "value_type": "int", "category": "alarm", "description": "报警冷却时间(秒)"},
        {"key": "dingtalk_enabled", "value": "false", "value_type": "bool", "category": "notification", "description": "是否启用钉钉通知"},
    ]
    
    async with AsyncSessionLocal() as session:
        for config_data in default_configs:
            result = await session.execute(
                select(SystemConfig).where(SystemConfig.key == config_data["key"])
            )
            existing_config = result.scalar_one_or_none()
            
            if not existing_config:
                config = SystemConfig(**config_data)
                session.add(config)
                print(f"  Created config: {config_data['key']}")
        
        await session.commit()
    
    print("Default config created!")


async def check_database():
    """检查数据库状态"""
    print("\n=== Database Status ===")
    
    async with AsyncSessionLocal() as session:
        # 检查表
        tables = [
            ("users", User),
            ("roles", Role),
            ("map_config", MapConfig),
            ("cameras", Camera),
            ("camera_calibration", CameraCalibration),
            ("safety_zones", SafetyZone),
            ("alarm_events", AlarmEvent),
            ("ai_models", AIModel),
            ("system_config", SystemConfig)
        ]
        
        for table_name, model in tables:
            try:
                result = await session.execute(select(model))
                count = len(result.scalars().all())
                print(f"  {table_name}: {count} records")
            except Exception as e:
                print(f"  {table_name}: Error - {e}")


async def main():
    """主函数"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "check":
            await check_database()
            return
        elif command == "backup":
            print("Backup functionality not implemented yet")
            return
    
    print("=" * 50)
    print("Database Initialization")
    print("=" * 50)
    
    await create_tables()
    await create_default_roles()
    await create_admin_user()
    await create_default_config()
    
    print("\n" + "=" * 50)
    print("Initialization completed!")
    print("=" * 50)
    
    await check_database()


if __name__ == "__main__":
    asyncio.run(main())
