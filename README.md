# 人员定位监控系统

基于YOLO + TensorRT + GPU加速的工厂人员实时定位与安全监控系统。

## 平台支持

- ✅ **Linux** (推荐用于生产环境)
- ✅ **Windows 11** (支持开发和测试) - [查看 Windows 安装指南](./WINDOWS_SETUP.md)
- ✅ **macOS** (支持开发和测试)

## 技术架构

### 前端
- **框架**: Vue 3 + Vite
- **状态管理**: Pinia
- **地图引擎**: Leaflet.js (L.CRS.Simple坐标系)
- **实时通信**: WebSocket

### 后端
- **框架**: FastAPI
- **数据库**: PostgreSQL + AsyncPG
- **缓存**: Redis
- **AI推理**: YOLOv11 + TensorRT (FP16)
- **视频处理**: NVIDIA NVDEC (GPU硬解码)
- **追踪算法**: ByteTrack

## 功能特性

### 核心功能
1. **用户权限管理**
   - 登录认证、角色权限
   - 用户管理、角色管理
   - 操作日志审计

2. **2D地图数字化**
   - CAD图纸加载与比例尺标定
   - 米制坐标系统建立
   - 实时测距工具

3. **摄像头管理**
   - 海康平台对接
   - 四点透视标定
   - FOV视野渲染

4. **AI人员检测**
   - 4类工装识别（生产、工艺、设备、质量）
   - GPU加速推理 (TensorRT FP16)
   - 跨帧ID追踪 (ByteTrack)

5. **电子围栏**
   - 可视化绘制
   - 多种规则配置（禁区、限制区、安全区）
   - 实时违规判定

6. **报警系统**
   - 实时报警推送
   - 钉钉机器人通知
   - 报警处理闭环

### Web配置管理
7. **AI模型管理**
   - Web界面上传模型文件
   - 模型版本管理
   - 激活/切换模型

## 项目结构

```
kf/
├── frontend/              # Vue3前端
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── views/       # 页面
│   │   ├── stores/      # Pinia状态
│   │   ├── api/         # API接口
│   │   └── router/      # 路由
│   └── package.json
│
├── backend/              # FastAPI后端
│   ├── app/
│   │   ├── api/         # API路由
│   │   ├── models/      # 数据模型
│   │   ├── services/    # 业务逻辑
│   │   ├── core/        # 核心配置
│   │   └── db/          # 数据库
│   ├── scripts/         # 脚本工具
│   └── requirements.txt
│
├── data/                # 数据目录
│   ├── models/          # AI模型
│   ├── captures/        # 抓拍图片
│   └── uploads/        # 上传文件
│
└── docs/                # 文档
    ├── DATABASE_DEPLOYMENT.md    # 数据库部署指南
    └── DATABASE_QUICKSTART.md  # 快速启动指南
```

## 快速开始

### Windows 用户

如果您使用 Windows 11，请查看 [💻 Windows 安装指南](./WINDOWS_SETUP.md) 获取详细的安装和配置指导。

**快速启动** (双击运行):
- `start-windows.bat` - 批处理脚本（推荐新手）
- `start-windows.ps1` - PowerShell 脚本

---

### Linux/macOS 用户

### 1. 数据库部署（必选）

**方式一：Docker Compose 部署（推荐）**
```bash
# 查看数据库部署指南
cat docs/DATABASE_DEPLOYMENT.md

# 查看快速启动指南
cat docs/DATABASE_QUICKSTART.md
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 复制配置文件
cp .env.example .env

# 编辑配置文件（数据库、Redis等）
vim .env

# 初始化数据库（创建表和默认数据）
python scripts/init_db.py

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 数据库管理

### 快速初始化

```bash
cd backend

# 初始化数据库（创建表、默认角色、管理员账户）
python scripts/init_db.py

# 查看数据库状态
python scripts/init_db.py check

# 备份数据库
python scripts/init_db.py backup
```

### 手动SQL操作

```bash
# 连接数据库
psql -h localhost -U kf_user -d personnel_tracking

# 查看所有表
\dt

# 查看用户列表
SELECT id, username, email, is_superuser FROM users;
```

详细文档请参考：
- [数据库部署指南](./docs/DATABASE_DEPLOYMENT.md)
- [快速启动指南](./docs/DATABASE_QUICKSTART.md)

## API文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 数据库表结构

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| map_config | 地图配置 | image_url, scale_ratio, origin_point |
| cameras | 摄像头 | index_code, rtsp_url, h_matrix, fov_polygon |
| camera_calibration | 标定数据 | video_points, map_points, h_matrix |
| safety_zones | 电子围栏 | vertices_meters, required_roles, alarm_type |
| alarm_events | 报警记录 | type, status, snapshot_url |
| users | 用户表 | username, password_hash, email, is_superuser |
| roles | 角色表 | name, display_name, permissions |
| operation_logs | 操作日志 | operation, resource, status |
| system_config | 系统配置 | key, value, value_type |
| ai_models | AI模型 | name, version, file_path, is_active |

## 坐标转换公式

### 单应性变换
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

## 钉钉机器人配置

1. 在钉钉群中添加"自定义机器人"
2. 获取Webhook URL和Secret
3. 在后端 `.env` 文件中配置：
   ```
   DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
   DINGTALK_SECRET=xxx
   ```

## 性能优化

- **显存管理**: 每路1080P推理需约800MB-1GB显存
- **推理频率**: 建议设置为5-8 FPS
- **追踪优化**: 使用ByteTrack在非推理帧进行位置预测
- **网络优化**: WebSocket心跳间隔30秒，自动重连

## 故障排查

### 常见问题

**问题1: 数据库连接失败**
```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 检查端口监听
sudo netstat -tlnp | grep 5432
```

**问题2: 模型加载失败**
```bash
# 检查TensorRT版本是否匹配CUDA版本
# 确认.engine文件路径正确
```

**问题3: 定位偏移**
- 重新进行比例尺标定（使用2米以上参照物）
- 检查摄像头标定点的准确性

## 开发指南

### 地图标定流程
1. 上传CAD图纸到系统
2. 使用"比例尺标定"工具，在地图上画线并输入实际距离
3. 系统自动计算比例尺

### 摄像头标定流程
1. 进入"标定中心"页面
2. 选择要标定的摄像头
3. 左侧视频画面：点击地面4个特征点
4. 右侧CAD地图：点击对应的4个物理位置点
5. 点击"保存标定"，系统自动计算单应性矩阵

### 训练自定义模型
```bash
cd backend/scripts

# 1. 准备数据集（使用LabelImg标注）
python prepare_dataset.py

# 2. 训练YOLO模型
python train_yolo.py

# 3. 导出为ONNX
python export_onnx.py

# 4. 转换为TensorRT引擎
python export_tensorrt.py
```

或者通过Web界面上传和管理模型：
1. 登录系统
2. 访问"AI模型"页面
3. 点击"上传新模型"
4. 选择模型文件并配置参数
5. 上传后可设为激活状态

## 安全建议

- 修改所有默认密码（管理员、数据库、Redis）
- 生产环境限制数据库访问IP
- 使用HTTPS/WSS加密连接
- 定期备份数据库
- 配置防火墙规则

