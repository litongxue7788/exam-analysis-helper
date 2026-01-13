@echo off
REM =================================================================================
REM 安全关闭前后端服务
REM =================================================================================

echo ========================================
echo 正在安全关闭服务...
echo ========================================
echo.

REM 查找并关闭 Node.js 进程
echo [1/3] 查找 Node.js 进程...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe"') do (
    echo 找到进程: %%i
    taskkill /PID %%i /F
)

echo.
echo [2/3] 查找 npm 进程...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "npm"') do (
    echo 找到进程: %%i
    taskkill /PID %%i /F
)

echo.
echo [3/3] 清理完成
echo.

REM 等待进程完全关闭
timeout /t 2 /nobreak >nul

REM 验证是否还有残留进程
echo ========================================
echo 验证进程状态...
echo ========================================
tasklist | findstr /i "node.exe npm"
if %errorlevel% equ 0 (
    echo 警告: 仍有进程在运行
) else (
    echo ✓ 所有服务已安全关闭
)

echo.
echo ========================================
echo 今日工作总结
echo ========================================
echo.
echo ✅ 已完成的工作:
echo    1. 修复了置信度对话框无法关闭的问题
echo    2. 优化了反馈按钮位置（手机端）
echo    3. 创建了手机端缓存问题解决方案文档
echo    4. 添加了用户反馈查看工具
echo    5. 创建了完整的服务器部署指南
echo.
echo 📁 新增文件:
echo    - 查看用户反馈.js
echo    - docs/UX优化说明_2026-01-13.md
echo    - docs/手机端访问口令问题解决方案.md
echo    - 快速部署命令.txt
echo    - 服务器部署UX修复指南.sh
echo    - 部署故障排查指南.md
echo.
echo 🔄 修改文件:
echo    - frontend/web/src/components/LowConfidenceConfirmDialog.tsx
echo    - frontend/web/src/components/LowConfidenceConfirmDialog.css
echo    - frontend/web/src/components/FeedbackButton.css
echo.
echo 📤 Git 状态:
echo    - 所有更改已提交到本地仓库
echo    - 已推送到 GitHub: https://github.com/litongxue7788/exam-analysis-helper
echo.
echo ⏭️  明天的工作:
echo    1. 在阿里云服务器上部署这些更新
echo    2. 测试所有修复的功能
echo    3. 收集用户反馈
echo.
echo ========================================
echo 晚安！明天见 👋
echo ========================================
echo.
pause
