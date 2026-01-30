@echo off
chcp 65001 >nul
echo ====================================
echo 人员定位监控系统 - 快速启动
echo ====================================
echo.
echo 注意: 此脚本假设您已经完成了初始安装
echo 如果是首次运行，请使用 start-windows.bat
echo.

REM 检查虚拟环境是否存在
if not exist "backend\venv" (
    echo [错误] 未找到 Python 虚拟环境
    echo 请先运行 start-windows.bat 完成初始化
    pause
    exit /b 1
)

REM 检查前端依赖是否已安装
if not exist "frontend\node_modules" (
    echo [错误] 未找到前端依赖
    echo 请先运行 start-windows.bat 完成初始化
    pause
    exit /b 1
)

echo 启动服务中...
echo.

REM 启动后端服务（新窗口）
start "后端服务 - 人员定位监控系统" cmd /k "cd /d %~dp0backend && venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM 等待后端启动
timeout /t 5 /nobreak >nul

REM 启动前端服务（新窗口）
start "前端服务 - 人员定位监控系统" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ====================================
echo 服务已启动，请访问:
echo 前端界面: http://localhost:5173
echo 后端 API: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo ====================================
echo.
echo 服务已在新窗口中运行
echo 关闭此窗口不会停止服务
echo 如需停止服务，请在对应窗口中按 Ctrl+C
echo.
pause
