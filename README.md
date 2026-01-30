# 人员定位监控系统

基于 YOLO + TensorRT + GPU 加速的工厂人员实时定位与安全监控系统。

## 目标

本项目旨在通过 FastAPI 后端和 React 前端，实现对工厂人员的实时追踪、电子围栏监控及报警管理。

## 项目结构

```
kf/
├── frontend/              # React 前端 (Vite + TailwindCSS)
│   ├── client/           # 客户端代码
│   ├── server/           # 前端服务端 (tRPC)
│   └── package.json
├── backend/              # FastAPI 后端
│   ├── app/             # 应用代码
│   ├── scripts/         # 脚本工具
│   ├── requirements.txt # Python 依赖
│   └── logs/            # 日志目录
├── data/                # 数据目录
│   ├── models/          # AI 模型
│   ├── captures/        # 抓拍图片
│   └── uploads/         # 上传文件
├── docs/                # 文档
│   └── BACKEND_API.md   # API 文档
└── README.md            # 项目说明
```

## 快速开始

### 环境要求
- Python 3.11+
- Node.js 18+
- SQLite 3 / PostgreSQL

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/lixiao1462-bit/personnel-tracking-system.git
   cd personnel-tracking-system
   ```

2. **后端配置**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env  # 如果有的话，请根据实际情况配置
   python scripts/init_db.py
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **前端配置**
   ```bash
   cd ../frontend
   pnpm install  # 或 npm install
   pnpm dev      # 或 npm run dev
   ```

### 访问地址
- **前端页面**: [https://frontlocate-9qprzeny.manus.space/](https://frontlocate-9qprzeny.manus.space/) (部署地址)
- **后端 API 文档**:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`

## 默认账户
- **用户名**: admin
- **密码**: admin123
- **⚠️ 生产环境请立即修改默认密码！**

## 技术架构
- **前端**: React, Vite, TailwindCSS, tRPC, Leaflet.js
- **后端**: FastAPI, SQLAlchemy (Async), Pydantic
- **AI 推理**: YOLO, TensorRT, ByteTrack
- **通信**: WebSocket, tRPC

## 贡献与维护
如有问题请提交 Issue 或 Pull Request。
