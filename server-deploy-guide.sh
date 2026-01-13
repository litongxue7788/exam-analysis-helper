#!/bin/bash

# ========================================
# 阿里云服务器部署脚本
# ========================================
# 服务器: 172.16.0.196
# 系统: Ubuntu 22.04.1 LTS
# 项目: /root/exam-analysis-helper
# ========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_step() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# ========================================
# 第一步：环境检查
# ========================================
print_step "第一步：环境检查"
echo "========================================"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    print_error "错误: 请在项目根目录运行此脚本"
    exit 1
fi

print_success "当前目录正确"

# 检查Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装"
    exit 1
fi
print_success "Node.js 版本: $(node --version)"

# 检查npm
if ! command -v npm &> /dev/null; then
    print_error "npm 未安装"
    exit 1
fi
print_success "npm 版本: $(npm --version)"

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 未安装，正在安装..."
    npm install -g pm2
    print_success "PM2 已安装"
else
    print_success "PM2 版本: $(pm2 --version)"
fi

echo ""

# ========================================
# 第二步：备份旧版本
# ========================================
print_step "第二步：备份旧版本"
echo "========================================"

BACKUP_NAME="exam-analysis-helper-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
cd ..
tar -czf "$BACKUP_NAME" exam-analysis-helper 2>/dev/null || true
cd exam-analysis-helper

if [ -f "../$BACKUP_NAME" ]; then
    print_success "备份已创建: $BACKUP_NAME"
    print_success "备份大小: $(du -h ../$BACKUP_NAME | cut -f1)"
else
    print_warning "备份创建失败（可能是首次部署）"
fi

echo ""

# ========================================
# 第三步：停止当前服务
# ========================================
print_step "第三步：停止当前服务"
echo "========================================"

if pm2 list | grep -q "exam-analysis-backend"; then
    pm2 stop exam-analysis-backend
    print_success "服务已停止"
else
    print_warning "没有运行中的服务"
fi

echo ""

# ========================================
# 第四步：拉取最新代码
# ========================================
print_step "第四步：拉取最新代码"
echo "========================================"

# 保存本地更改（如果有）
git stash save "Auto-stash before deployment $(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# 拉取最新代码
git pull origin main

print_success "代码已更新"
print_success "最新提交: $(git log --oneline -1)"

echo ""

# ========================================
# 第五步：安装依赖
# ========================================
print_step "第五步：安装依赖"
echo "========================================"

# 后端依赖
print_step "安装后端依赖..."
cd backend
npm install --production
print_success "后端依赖已安装"

# 前端依赖
print_step "安装前端依赖..."
cd ../frontend/web
npm install --production
print_success "前端依赖已安装"

cd ../..

echo ""

# ========================================
# 第六步：检查环境变量
# ========================================
print_step "第六步：检查环境变量"
echo "========================================"

if [ ! -f "backend/.env" ]; then
    print_warning ".env 文件不存在"
    
    if [ -f "backend/.env.example" ]; then
        print_step "从模板创建 .env 文件..."
        cp backend/.env.example backend/.env
        print_warning "请编辑 backend/.env 文件，填入真实的API密钥"
        print_warning "运行: nano backend/.env"
        echo ""
        read -p "按Enter键继续（确保已配置.env文件）..."
    else
        print_error ".env.example 模板文件不存在"
        exit 1
    fi
else
    print_success ".env 文件已存在"
    
    # 检查关键配置
    if grep -q "your_.*_api_key" backend/.env; then
        print_warning "警告: .env 文件中包含示例值，请确保已填入真实的API密钥"
        echo ""
        read -p "按Enter键继续（确保已配置正确的API密钥）..."
    else
        print_success "环境变量配置正常"
    fi
fi

echo ""

# ========================================
# 第七步：构建前端
# ========================================
print_step "第七步：构建前端"
echo "========================================"

cd frontend/web

# 清理旧的构建
if [ -d "dist" ]; then
    rm -rf dist
    print_success "旧构建已清理"
fi

# 构建
print_step "正在构建前端（这可能需要几分钟）..."
npm run build

if [ -d "dist" ]; then
    print_success "前端构建成功"
    print_success "构建大小: $(du -sh dist | cut -f1)"
else
    print_error "前端构建失败"
    exit 1
fi

cd ../..

echo ""

# ========================================
# 第八步：设置脚本权限
# ========================================
print_step "第八步：设置脚本权限"
echo "========================================"

chmod +x deploy.sh 2>/dev/null || true
chmod +x health-check.sh 2>/dev/null || true
chmod +x monitor.sh 2>/dev/null || true
chmod +x backup.sh 2>/dev/null || true

print_success "脚本权限已设置"

echo ""

# ========================================
# 第九步：启动服务
# ========================================
print_step "第九步：启动服务"
echo "========================================"

# 检查是否有ecosystem.config.js
if [ -f "ecosystem.config.js" ]; then
    print_step "使用 PM2 ecosystem 配置启动..."
    pm2 start ecosystem.config.js --env production
else
    print_step "使用默认配置启动..."
    cd backend
    pm2 start npm --name "exam-analysis-backend" -- start
    cd ..
fi

print_success "服务已启动"

# 等待服务启动
sleep 3

echo ""

# ========================================
# 第十步：验证部署
# ========================================
print_step "第十步：验证部署"
echo "========================================"

# 检查PM2状态
print_step "检查PM2进程..."
pm2 list

# 检查后端健康
print_step "检查后端健康..."
sleep 2
if curl -s http://localhost:3002/api/health > /dev/null; then
    print_success "后端服务正常"
else
    print_warning "后端服务可能未完全启动，请稍后检查"
fi

# 检查前端文件
if [ -d "frontend/web/dist" ]; then
    print_success "前端文件存在"
else
    print_warning "前端文件不存在"
fi

echo ""

# ========================================
# 部署完成
# ========================================
echo "========================================"
print_success "🎉 部署完成！"
echo "========================================"
echo ""

echo "下一步操作:"
echo ""
echo "1. 运行健康检查:"
echo "   ./health-check.sh"
echo ""
echo "2. 查看服务日志:"
echo "   pm2 logs exam-analysis-backend"
echo ""
echo "3. 实时监控:"
echo "   ./monitor.sh"
echo "   或"
echo "   pm2 monit"
echo ""
echo "4. 访问服务:"
echo "   http://172.16.0.196"
echo ""
echo "5. 保存PM2配置（开机自启）:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""

# 显示PM2状态
echo "当前PM2进程状态:"
pm2 list

echo ""
echo "========================================"
print_success "部署成功！系统已准备就绪 🚀"
echo "========================================"
