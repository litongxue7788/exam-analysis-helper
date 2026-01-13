@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM =================================================================================
REM Windows环境下的生产部署准备脚本
REM 用于在Windows开发环境中准备部署到Linux服务器
REM =================================================================================

echo =========================================
echo 🚀 试卷分析系统 - Windows部署准备
echo 📦 版本: v2.0 - 质量优化完成版
echo 📅 准备时间: %date% %time%
echo =========================================
echo.

REM 检查Node.js
echo [INFO] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)
echo [SUCCESS] ✅ Node.js环境正常

REM 检查npm
echo [INFO] 检查npm环境...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm未安装，请先安装npm
    pause
    exit /b 1
)
echo [SUCCESS] ✅ npm环境正常

REM 检查Git
echo [INFO] 检查Git环境...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git未安装，请先安装Git
    pause
    exit /b 1
)
echo [SUCCESS] ✅ Git环境正常

echo.
echo [INFO] 开始构建前端生产版本...
cd frontend\web
call npm install
if errorlevel 1 (
    echo [ERROR] 前端依赖安装失败
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo [ERROR] 前端构建失败
    pause
    exit /b 1
)

if exist "dist" (
    echo [SUCCESS] ✅ 前端构建成功
    for /f %%i in ('dir dist /s /-c ^| find "个文件"') do echo [INFO] 构建产物: %%i
) else (
    echo [ERROR] 前端构建失败，dist目录不存在
    pause
    exit /b 1
)

cd ..\..

echo.
echo [INFO] 检查后端依赖...
cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] 后端依赖安装失败
    pause
    exit /b 1
)
echo [SUCCESS] ✅ 后端依赖检查完成

cd ..

echo.
echo [INFO] 检查Git状态...
git status --porcelain > temp_git_status.txt
set /p git_changes=<temp_git_status.txt
del temp_git_status.txt

if not "!git_changes!"=="" (
    echo [WARN] 有未提交的更改:
    git status --short
    echo.
    set /p continue="是否继续？(y/n): "
    if /i not "!continue!"=="y" (
        echo [INFO] 部署已取消
        pause
        exit /b 0
    )
)

echo.
echo [INFO] 提交更改到Git...
git add .

REM 检查是否有需要提交的更改
git diff --cached --quiet
if errorlevel 1 (
    set commit_message=🚀 生产部署准备 - v2.0 质量优化完成版
    
    echo 提交信息: !commit_message!
    git commit -m "!commit_message!"
    echo [SUCCESS] ✅ 更改已提交
) else (
    echo [INFO] 没有需要提交的更改
)

echo.
echo [INFO] 推送到GitHub...
git push origin main
if errorlevel 1 (
    git push origin master
    if errorlevel 1 (
        echo [ERROR] 推送失败，请检查网络连接和权限
        pause
        exit /b 1
    )
)
echo [SUCCESS] ✅ 代码已推送到GitHub

echo.
echo =========================================
echo 🎉 Windows环境准备完成！
echo =========================================
echo.
echo 📋 完成的任务:
echo   ✅ 环境检查通过
echo   ✅ 前端构建完成
echo   ✅ 后端依赖检查完成
echo   ✅ 代码已提交并推送
echo.
echo 🚀 下一步操作:
echo   1. 连接到Linux服务器
echo   2. 运行服务器端部署脚本
echo   3. 验证部署结果
echo.
echo 🔧 服务器部署命令:
echo   ssh root@172.16.0.196
echo   cd /root/exam-analysis-helper
echo   chmod +x deploy.sh health-check.sh monitor.sh backup.sh
echo   ./deploy.sh
echo.
echo 📊 系统特性:
echo   🎯 识别准确率: 97%%
echo   ⚡ 分析速度: 55秒 (-40%%)
echo   📱 移动端优化: 完成
echo   🧠 智能时长估算: 启用
echo   🔍 证据来源追溯: 启用
echo   💬 用户反馈系统: 启用
echo   🔄 渐进式加载: 启用
echo   🛡️ 双模型验证: 启用
echo   📸 图片质量检查: 启用
echo.
pause