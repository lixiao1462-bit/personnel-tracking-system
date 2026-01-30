# Windows 11 安装指南

本文档提供在 Windows 11 系统上部署和运行人员定位监控系统的详细指南。

## 系统要求

在开始之前，请确保您的 Windows 11 系统满足以下要求：

**硬件要求**：
- CPU: Intel Core i5 或更高（推荐 i7 及以上）
- 内存: 8GB RAM 或更高（推荐 16GB）
- 存储: 至少 20GB 可用空间
- GPU: NVIDIA GPU（可选，用于 AI 推理加速）

**软件要求**：
- Windows 11 专业版或企业版（家庭版也可运行，但某些功能可能受限）
- 管理员权限（用于安装软件和配置服务）

## 前置软件安装

### 1. 安装 Python 3.11+

访问 [Python 官方网站](https://www.python.org/downloads/) 下载并安装 Python 3.11 或更高版本。

**安装步骤**：
1. 下载 Windows 安装程序（推荐 64-bit）
2. 运行安装程序，**务必勾选** "Add Python to PATH"
3. 选择 "Customize installation"
4. 确保勾选 "pip" 和 "py launcher"
5. 点击 "Install" 完成安装

**验证安装**：
打开命令提示符（CMD）或 PowerShell，执行以下命令验证安装：

```powershell
python --version
pip --version
```

### 2. 安装 Node.js 18+

访问 [Node.js 官方网站](https://nodejs.org/) 下载并安装 Node.js 18 LTS 或更高版本。

**安装步骤**：
1. 下载 Windows 安装程序（推荐 LTS 版本）
2. 运行安装程序，使用默认设置即可
3. 安装过程会自动配置环境变量

**验证安装**：
打开命令提示符（CMD）或 PowerShell，执行以下命令验证安装：

```powershell
node --version
npm --version
```

### 3. 安装 Git（可选但推荐）

访问 [Git 官方网站](https://git-scm.com/download/win) 下载并安装 Git for Windows。

**安装步骤**：
1. 下载 Windows 安装程序
2. 运行安装程序，使用默认设置即可
3. 建议选择 "Git from the command line and also from 3rd-party software"

**验证安装**：
```powershell
git --version
```

### 4. 安装数据库和缓存服务

本系统依赖 PostgreSQL 数据库和 Redis 缓存服务。在 Windows 上有两种推荐的安装方式：

#### 方式一：使用 Docker Desktop（推荐）

Docker Desktop 是在 Windows 上运行 PostgreSQL 和 Redis 的最简单方式，它提供了容器化的环境，易于管理和维护。

**安装步骤**：

1. 访问 [Docker Desktop 官网](https://www.docker.com/products/docker-desktop/) 下载安装程序
2. 运行安装程序并按照提示完成安装
3. 安装完成后启动 Docker Desktop
4. 等待 Docker 引擎启动完成（系统托盘图标变为绿色）

**启动数据库服务**：

在项目根目录创建 `docker-compose.yml` 文件（如果不存在），内容如下：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: personnel_tracking_db
    environment:
      POSTGRES_USER: kf_user
      POSTGRES_PASSWORD: kf_password
      POSTGRES_DB: personnel_tracking
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: personnel_tracking_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

然后在 PowerShell 中执行：

```powershell
docker-compose up -d
```

**验证服务**：
```powershell
docker ps
```

您应该看到两个运行中的容器：`personnel_tracking_db` 和 `personnel_tracking_redis`。

#### 方式二：原生安装

如果您不想使用 Docker，也可以直接在 Windows 上安装 PostgreSQL 和 Redis。

**安装 PostgreSQL**：

1. 访问 [PostgreSQL 官网](https://www.postgresql.org/download/windows/) 下载安装程序
2. 运行安装程序，记住设置的数据库密码
3. 安装完成后，使用 pgAdmin 或命令行创建数据库：

```sql
CREATE USER kf_user WITH PASSWORD 'kf_password';
CREATE DATABASE personnel_tracking OWNER kf_user;
```

**安装 Redis（使用 Memurai）**：

由于 Redis 官方不提供 Windows 版本，推荐使用 Memurai（Redis 的 Windows 兼容版本）：

1. 访问 [Memurai 官网](https://www.memurai.com/) 下载安装程序
2. 运行安装程序，使用默认设置
3. Memurai 会自动作为 Windows 服务运行

## 项目配置

### 1. 克隆或下载项目

如果已安装 Git：
```powershell
git clone https://github.com/lixiao1462-bit/personnel-tracking-system.git
cd personnel-tracking-system
```

或者直接从 GitHub 下载 ZIP 文件并解压。

### 2. 配置后端环境

进入 `backend` 目录，复制环境配置文件：

```powershell
cd backend
copy .env.example .env
```

使用文本编辑器（如 Notepad++ 或 VS Code）编辑 `.env` 文件，根据实际情况修改以下配置：

```env
# 数据库配置（如果使用 Docker，保持默认即可）
DATABASE_URL=postgresql+asyncpg://kf_user:kf_password@localhost:5432/personnel_tracking

# Redis配置（如果使用 Docker，保持默认即可）
REDIS_URL=redis://localhost:6379/0

# 修改密钥（生产环境必须修改）
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-random-jwt-secret-key-here
```

**生成随机密钥**：
在 PowerShell 中执行以下命令生成随机密钥：

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. 配置前端环境

前端配置通常不需要修改，但如果需要自定义后端 API 地址，可以在 `frontend` 目录下创建 `.env.local` 文件。

## 快速启动

本项目提供了两种 Windows 启动脚本，您可以选择其中一种使用。

### 方式一：使用批处理脚本（推荐新手）

双击项目根目录下的 `start-windows.bat` 文件，脚本会自动完成以下操作：

1. 检查 Python 和 Node.js 环境
2. 安装后端依赖（创建虚拟环境）
3. 安装前端依赖
4. 初始化数据库
5. 启动后端和前端服务

### 方式二：使用 PowerShell 脚本

右键点击项目根目录下的 `start-windows.ps1` 文件，选择 "使用 PowerShell 运行"。

**注意**：如果遇到执行策略错误，请以管理员身份运行 PowerShell 并执行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

然后重新运行脚本。

### 方式三：手动启动（适合开发者）

如果您希望更精细地控制启动过程，可以手动执行以下步骤。

**启动后端**：

```powershell
# 进入后端目录
cd backend

# 创建虚拟环境（首次运行）
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 安装依赖（首次运行或依赖更新时）
pip install -r requirements.txt

# 初始化数据库（首次运行）
python scripts\init_db.py

# 启动后端服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**启动前端**（新开一个 PowerShell 窗口）：

```powershell
# 进入前端目录
cd frontend

# 安装依赖（首次运行或依赖更新时）
npm install

# 启动前端服务
npm run dev
```

## 访问系统

服务启动成功后，您可以通过以下地址访问系统：

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **API 文档（ReDoc）**: http://localhost:8000/redoc

**默认管理员账户**：
- 用户名: `admin`
- 密码: `admin123`（首次登录后请立即修改）

## 常见问题

### 问题 1: Python 包安装失败

**症状**：运行 `pip install -r requirements.txt` 时出现编译错误。

**解决方案**：

某些 Python 包（如 `asyncpg`、`bcrypt`）需要 C/C++ 编译器。请安装 Microsoft C++ Build Tools：

1. 访问 [Visual Studio 下载页面](https://visualstudio.microsoft.com/downloads/)
2. 下载 "Build Tools for Visual Studio"
3. 运行安装程序，选择 "C++ build tools" 工作负载
4. 安装完成后重新运行 `pip install`

或者，您可以尝试安装预编译的二进制包：

```powershell
pip install --only-binary :all: asyncpg bcrypt
```

### 问题 2: 数据库连接失败

**症状**：后端启动时提示数据库连接错误。

**解决方案**：

1. 确认 PostgreSQL 服务正在运行：
   - Docker 方式：执行 `docker ps` 检查容器状态
   - 原生安装：打开 "服务" 应用，检查 PostgreSQL 服务状态

2. 检查 `.env` 文件中的数据库连接字符串是否正确

3. 尝试手动连接数据库验证配置：
   ```powershell
   # 使用 psql 命令行工具
   psql -h localhost -U kf_user -d personnel_tracking
   ```

### 问题 3: 端口被占用

**症状**：启动服务时提示端口 8000 或 5173 已被占用。

**解决方案**：

1. 查找占用端口的进程：
   ```powershell
   netstat -ano | findstr :8000
   netstat -ano | findstr :5173
   ```

2. 结束占用端口的进程：
   ```powershell
   taskkill /PID <进程ID> /F
   ```

3. 或者修改配置使用其他端口：
   - 后端：修改启动命令中的 `--port 8000` 参数
   - 前端：在 `frontend/vite.config.ts` 中修改端口配置

### 问题 4: PowerShell 执行策略限制

**症状**：运行 `.ps1` 脚本时提示无法执行。

**解决方案**：

以管理员身份运行 PowerShell，执行以下命令：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题 5: npm 安装速度慢

**症状**：前端依赖安装非常缓慢或超时。

**解决方案**：

配置 npm 使用国内镜像源：

```powershell
npm config set registry https://registry.npmmirror.com
```

或者使用 pnpm（推荐）：

```powershell
npm install -g pnpm
cd frontend
pnpm install
```

## 性能优化建议

在 Windows 11 上运行本系统时，可以考虑以下优化措施以提升性能：

**系统级优化**：

1. 关闭不必要的后台应用和服务
2. 确保系统有足够的可用内存（建议至少保留 4GB）
3. 将项目文件放在 SSD 上而非机械硬盘
4. 如果使用 Docker Desktop，在设置中分配足够的资源（建议 4GB 内存，2 CPU 核心）

**应用级优化**：

1. 在生产环境中，将 `.env` 文件中的 `DEBUG` 设置为 `false`
2. 配置合适的日志级别（生产环境使用 `WARNING` 或 `ERROR`）
3. 如果不需要 AI 功能，可以注释掉相关的依赖和服务

## 开发工具推荐

为了更好地在 Windows 上开发和调试本项目，推荐使用以下工具：

**代码编辑器**：
- [Visual Studio Code](https://code.visualstudio.com/)：轻量级且功能强大，支持 Python 和 TypeScript
- [PyCharm](https://www.jetbrains.com/pycharm/)：专业的 Python IDE

**数据库管理工具**：
- [pgAdmin](https://www.pgadmin.org/)：PostgreSQL 官方管理工具
- [DBeaver](https://dbeaver.io/)：通用数据库管理工具，支持多种数据库

**API 测试工具**：
- [Postman](https://www.postman.com/)：强大的 API 测试和开发工具
- [Insomnia](https://insomnia.rest/)：简洁的 REST API 客户端

**终端工具**：
- [Windows Terminal](https://aka.ms/terminal)：现代化的终端应用，支持多标签页
- [PowerShell 7](https://github.com/PowerShell/PowerShell)：跨平台的 PowerShell 版本

## 生产环境部署

如果您需要在 Windows Server 上部署生产环境，请参考以下额外步骤：

1. 使用 IIS 或 Nginx for Windows 作为反向代理
2. 配置 SSL/TLS 证书实现 HTTPS
3. 将后端服务注册为 Windows 服务（使用 NSSM 或类似工具）
4. 配置防火墙规则限制访问
5. 设置定期数据库备份任务
6. 配置日志轮转和监控

详细的生产环境部署指南超出了本文档的范围，建议咨询专业的系统管理员或 DevOps 工程师。

## 获取帮助

如果您在 Windows 上运行本系统时遇到问题，可以通过以下方式获取帮助：

1. 查看项目的 [GitHub Issues](https://github.com/lixiao1462-bit/personnel-tracking-system/issues)
2. 阅读项目的其他文档（如 `README.md`、`BACKEND_API.md`）
3. 在 GitHub 上提交新的 Issue，详细描述您遇到的问题

提交 Issue 时，请包含以下信息：
- Windows 版本（如 Windows 11 专业版 22H2）
- Python 版本和 Node.js 版本
- 完整的错误信息和堆栈跟踪
- 您已经尝试过的解决方案

## 更新日志

- **2025-01-30**: 初始版本，支持 Windows 11
