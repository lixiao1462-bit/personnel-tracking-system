# Windows 环境检查脚本
# 用于验证系统是否满足运行要求

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "人员定位监控系统 - 环境检查工具" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# 检查 Python
Write-Host "[检查 1/6] Python 环境..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -ge 3 -and $minor -ge 11) {
            Write-Host "  ✓ Python 已安装: $pythonVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Python 版本过低: $pythonVersion (需要 3.11+)" -ForegroundColor Red
            $allPassed = $false
        }
    }
} catch {
    Write-Host "  ✗ Python 未安装" -ForegroundColor Red
    Write-Host "    下载地址: https://www.python.org/downloads/" -ForegroundColor Yellow
    $allPassed = $false
}

# 检查 pip
Write-Host "[检查 2/6] pip 包管理器..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "  ✓ pip 已安装: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ pip 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 检查 Node.js
Write-Host "[检查 3/6] Node.js 环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v(\d+)\.") {
        $major = [int]$Matches[1]
        if ($major -ge 18) {
            Write-Host "  ✓ Node.js 已安装: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Node.js 版本过低: $nodeVersion (需要 18+)" -ForegroundColor Red
            $allPassed = $false
        }
    }
} catch {
    Write-Host "  ✗ Node.js 未安装" -ForegroundColor Red
    Write-Host "    下载地址: https://nodejs.org/" -ForegroundColor Yellow
    $allPassed = $false
}

# 检查 npm
Write-Host "[检查 4/6] npm 包管理器..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    Write-Host "  ✓ npm 已安装: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 检查 PostgreSQL (可选)
Write-Host "[检查 5/6] PostgreSQL 数据库..." -ForegroundColor Yellow
$pgPort = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($pgPort) {
    Write-Host "  ✓ PostgreSQL 服务正在运行 (端口 5432)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ PostgreSQL 服务未运行" -ForegroundColor Yellow
    Write-Host "    建议使用 Docker Desktop 运行 PostgreSQL" -ForegroundColor Cyan
    Write-Host "    或访问: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
}

# 检查 Redis (可选)
Write-Host "[检查 6/6] Redis 缓存服务..." -ForegroundColor Yellow
$redisPort = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($redisPort) {
    Write-Host "  ✓ Redis 服务正在运行 (端口 6379)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Redis 服务未运行" -ForegroundColor Yellow
    Write-Host "    建议使用 Docker Desktop 运行 Redis" -ForegroundColor Cyan
    Write-Host "    或访问: https://www.memurai.com/" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "✓ 所有必需组件已安装，可以开始使用系统" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Cyan
    Write-Host "  1. 确保 PostgreSQL 和 Redis 服务正在运行" -ForegroundColor White
    Write-Host "  2. 运行 start-windows.bat 或 start-windows.ps1 启动系统" -ForegroundColor White
} else {
    Write-Host "✗ 部分必需组件未安装或版本不符合要求" -ForegroundColor Red
    Write-Host "请按照上述提示安装缺失的组件" -ForegroundColor Yellow
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车键退出"
