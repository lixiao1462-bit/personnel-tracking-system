# 人员定位监控系统 - Windows PowerShell 启动脚本
# 使用方法: 右键点击此文件 -> "使用 PowerShell 运行"
# 或在 PowerShell 中执行: .\start-windows.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "人员定位监控系统 - Windows 启动脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 设置错误处理
$ErrorActionPreference = "Stop"

# 检查 Python 是否安装
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[✓] Python 已安装: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] 未检测到 Python，请先安装 Python 3.11 或更高版本" -ForegroundColor Red
    Write-Host "下载地址: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[✓] Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] 未检测到 Node.js，请先安装 Node.js 18 或更高版本" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

Write-Host ""
Write-Host "[1/5] 检查环境..." -ForegroundColor Yellow

# 检查后端配置文件
if (-not (Test-Path "backend\.env")) {
    Write-Host "[!] 后端配置文件不存在，正在复制示例文件..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[提示] 请编辑 backend\.env 文件配置数据库等信息" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "[2/5] 安装后端依赖..." -ForegroundColor Yellow
Set-Location backend

# 创建虚拟环境
if (-not (Test-Path "venv")) {
    Write-Host "创建 Python 虚拟环境..." -ForegroundColor Cyan
    python -m venv venv
}

# 激活虚拟环境并安装依赖
& "venv\Scripts\Activate.ps1"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] 后端依赖安装失败" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Set-Location ..
Write-Host ""

Write-Host "[3/5] 安装前端依赖..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] 前端依赖安装失败" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Set-Location ..
Write-Host ""

Write-Host "[4/5] 初始化数据库..." -ForegroundColor Yellow
Set-Location backend
& "venv\Scripts\Activate.ps1"
python scripts\init_db.py
Set-Location ..
Write-Host ""

Write-Host "[5/5] 启动服务..." -ForegroundColor Yellow
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "服务启动中，请在新窗口中访问:" -ForegroundColor Cyan
Write-Host "后端 API: http://localhost:8000" -ForegroundColor Green
Write-Host "前端界面: http://localhost:5173" -ForegroundColor Green
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
Write-Host ""

# 启动后端服务（新窗口）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; .\venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

# 等待后端启动
Start-Sleep -Seconds 5

# 启动前端服务（新窗口）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host "服务已在新窗口中启动" -ForegroundColor Green
Write-Host "关闭此窗口不会停止服务，请在对应窗口中按 Ctrl+C 停止" -ForegroundColor Yellow
Read-Host "按回车键退出"
