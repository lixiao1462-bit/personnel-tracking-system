@echo off
chcp 65001 >nul
echo ====================================
echo 人员定位监控系统 - Windows 启动脚本
echo ====================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3.11 或更高版本
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] 检查环境...
echo Python 版本:
python --version
echo Node.js 版本:
node --version
echo.

REM 检查后端配置文件
if not exist "backend\.env" (
    echo [警告] 后端配置文件不存在，正在复制示例文件...
    copy "backend\.env.example" "backend\.env"
    echo [提示] 请编辑 backend\.env 文件配置数据库等信息
    echo.
)

echo [2/5] 安装后端依赖...
cd backend
if not exist "venv" (
    echo 创建 Python 虚拟环境...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)
cd ..
echo.

echo [3/5] 安装前端依赖...
cd frontend
call npm install
if errorlevel 1 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
cd ..
echo.

echo [4/5] 初始化数据库...
cd backend
call venv\Scripts\activate.bat
python scripts\init_db.py
cd ..
echo.

echo [5/5] 启动服务...
echo.
echo ====================================
echo 服务启动中，请在新窗口中访问:
echo 后端 API: http://localhost:8000
echo 前端界面: http://localhost:5173
echo API 文档: http://localhost:8000/docs
echo ====================================
echo.
echo 按 Ctrl+C 停止服务
echo.

REM 启动后端服务（新窗口）
start "后端服务" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM 等待后端启动
timeout /t 5 /nobreak >nul

REM 启动前端服务（新窗口）
start "前端服务" cmd /k "cd frontend && npm run dev"

echo 服务已在新窗口中启动
echo 关闭此窗口不会停止服务，请在对应窗口中按 Ctrl+C 停止
pause
