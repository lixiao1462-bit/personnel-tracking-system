# 后端 API 文档

## 概述

本后端基于 FastAPI 框架开发，提供人员定位监控系统的所有 API 接口。

## 技术栈

- **框架**: FastAPI 0.109.0
- **数据库**: PostgreSQL + AsyncPG（生产环境）/ SQLite + aiosqlite（开发测试）
- **ORM**: SQLAlchemy 2.0 (异步)
- **认证**: JWT (python-jose)
- **密码**: bcrypt (passlib)

## 快速启动

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 复制配置文件
cp .env.example .env

# 编辑配置文件
vim .env

# 初始化数据库
python scripts/init_db.py

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 默认账户

初始化后会创建以下默认账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 超级管理员 |

**注意**: 请在首次登录后修改默认密码！

## API 端点列表

### 认证模块 `/api/v1/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /login | 用户登录 |
| POST | /token | OAuth2 令牌获取 |
| GET | /me | 获取当前用户信息 |
| POST | /logout | 用户登出 |

### 用户管理 `/api/v1/users`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取用户列表 |
| POST | / | 创建用户 |
| GET | /{user_id} | 获取用户详情 |
| PUT | /{user_id} | 更新用户信息 |
| DELETE | /{user_id} | 删除用户 |
| PUT | /{user_id}/password | 修改密码 |

### 角色管理 `/api/v1/roles`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取角色列表 |
| POST | / | 创建角色 |
| GET | /{role_id} | 获取角色详情 |
| PUT | /{role_id} | 更新角色 |
| DELETE | /{role_id} | 删除角色 |
| GET | /permissions/list | 获取权限列表 |

### 地图管理 `/api/v1/maps`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取地图列表 |
| POST | / | 创建地图配置 |
| GET | /active | 获取当前激活的地图 |
| GET | /{map_id} | 获取地图详情 |
| PUT | /{map_id} | 更新地图配置 |
| DELETE | /{map_id} | 删除地图配置 |
| POST | /{map_id}/calibrate | 比例尺标定 |
| POST | /upload | 上传地图图片 |

### 摄像头管理 `/api/v1/cameras`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取摄像头列表 |
| POST | / | 创建摄像头 |
| GET | /{camera_id} | 获取摄像头详情 |
| PUT | /{camera_id} | 更新摄像头 |
| DELETE | /{camera_id} | 删除摄像头 |
| POST | /{camera_id}/calibrate | 摄像头标定 |
| GET | /{camera_id}/calibrations | 获取标定历史 |
| POST | /transform | 坐标转换 |

### 电子围栏 `/api/v1/zones`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取围栏列表 |
| POST | / | 创建围栏 |
| GET | /all | 获取所有激活围栏 |
| GET | /{zone_id} | 获取围栏详情 |
| PUT | /{zone_id} | 更新围栏 |
| DELETE | /{zone_id} | 删除围栏 |
| POST | /check | 检测点位 |
| GET | /types/list | 获取围栏类型列表 |
| GET | /alarm-types/list | 获取报警类型列表 |

### 报警管理 `/api/v1/alarms`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取报警列表 |
| POST | / | 创建报警事件 |
| GET | /statistics | 获取报警统计 |
| GET | /{alarm_id} | 获取报警详情 |
| PUT | /{alarm_id}/handle | 处理报警 |
| DELETE | /{alarm_id} | 删除报警 |
| GET | /types/list | 获取报警类型列表 |
| GET | /levels/list | 获取报警级别列表 |

### AI模型管理 `/api/v1/models`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取模型列表 |
| POST | /upload | 上传模型 |
| GET | /active | 获取当前激活模型 |
| GET | /{model_id} | 获取模型详情 |
| PUT | /{model_id} | 更新模型信息 |
| DELETE | /{model_id} | 删除模型 |
| POST | /{model_id}/activate | 激活模型 |
| GET | /types/list | 获取模型类型列表 |

### 操作日志 `/api/v1/logs`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取操作日志列表 |
| GET | /operations | 获取操作类型列表 |
| GET | /resources | 获取资源类型列表 |

## 认证方式

API 使用 JWT Bearer Token 认证。登录后获取 token，在请求头中添加：

```
Authorization: Bearer <token>
```

## 权限系统

系统内置以下权限：

| 权限 | 说明 |
|------|------|
| user:read/create/update/delete | 用户管理 |
| role:read/create/update/delete | 角色管理 |
| map:read/update | 地图管理 |
| camera:read/create/update/delete/calibrate | 摄像头管理 |
| zone:read/create/update/delete | 电子围栏管理 |
| alarm:read/handle | 报警管理 |
| model:read/upload/delete/activate | AI模型管理 |
| log:read | 操作日志查看 |
| config:read/update | 系统配置管理 |

## 数据库表结构

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| roles | 角色表 |
| operation_logs | 操作日志表 |
| map_config | 地图配置表 |
| system_config | 系统配置表 |
| cameras | 摄像头表 |
| camera_calibration | 摄像头标定表 |
| safety_zones | 电子围栏表 |
| alarm_events | 报警事件表 |
| ai_models | AI模型表 |

## 坐标转换

### 单应性变换

视频坐标到地图坐标的转换使用单应性矩阵 H：

```
[x', y', w']^T = H * [u, v, 1]^T
P_x = x' / w'
P_y = y' / w'
```

### 比例尺缩放

```
X_real = P_x * Scale_Ratio
Y_real = P_y * Scale_Ratio
```

## 钉钉通知

配置 `.env` 文件中的钉钉机器人参数：

```
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_SECRET=xxx
```

报警事件创建时会自动发送钉钉通知。

## 文件上传

- 地图图片: `/uploads/maps/`
- AI模型: 配置的 `MODEL_DIR` 目录
- 抓拍图片: `/uploads/captures/`

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
