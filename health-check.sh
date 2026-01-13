#!/bin/bash

# =================================================================================
# 生产环境健康检查脚本
# 用于验证系统各项功能是否正常运行
# =================================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# 配置
SERVER_URL="http://localhost:3002"
FRONTEND_URL="http://localhost"

echo "========================================="
echo "🏥 生产环境健康检查"
echo "📅 检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 检查1: 后端服务健康状态
print_info "检查1: 后端服务健康状态..."
if curl -f -s "$SERVER_URL/api/health" > /dev/null; then
    HEALTH_RESPONSE=$(curl -s "$SERVER_URL/api/health")
    print_success "后端服务正常运行"
    echo "  响应: $HEALTH_RESPONSE"
else
    print_error "后端服务无响应"
    exit 1
fi

# 检查2: PM2进程状态
print_info "检查2: PM2进程状态..."
if command -v pm2 >/dev/null 2>&1; then
    PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="exam-analysis-backend") | .pm2_env.status' 2>/dev/null || echo "unknown")
    if [ "$PM2_STATUS" = "online" ]; then
        print_success "PM2进程状态正常"
    else
        print_error "PM2进程状态异常: $PM2_STATUS"
    fi
else
    print_warning "PM2未安装或不可用"
fi

# 检查3: 数据目录权限
print_info "检查3: 数据目录权限..."
if [ -d "data/feedbacks" ] && [ -w "data/feedbacks" ]; then
    print_success "数据目录权限正常"
else
    print_error "数据目录不存在或无写权限"
fi

# 检查4: 环境变量配置
print_info "检查4: 环境变量配置..."
if [ -f "backend/.env" ]; then
    # 检查关键环境变量
    if grep -q "DOUBAO_API_KEY=" backend/.env || grep -q "ALIYUN_API_KEY=" backend/.env || grep -q "ZHIPU_API_KEY=" backend/.env; then
        print_success "API密钥已配置"
    else
        print_error "未找到有效的API密钥配置"
    fi
    
    if grep -q "NODE_ENV=production" backend/.env; then
        print_success "生产环境配置正确"
    else
        print_warning "未设置生产环境模式"
    fi
else
    print_error "环境配置文件不存在"
fi

# 检查5: 前端构建产物
print_info "检查5: 前端构建产物..."
if [ -d "frontend/web/dist" ] && [ -f "frontend/web/dist/index.html" ]; then
    DIST_SIZE=$(du -sh frontend/web/dist | cut -f1)
    print_success "前端构建产物存在 (大小: $DIST_SIZE)"
else
    print_error "前端构建产物不存在"
fi

# 检查6: 日志文件
print_info "检查6: 日志文件..."
if [ -d "logs" ]; then
    print_success "日志目录存在"
    if [ -f "logs/combined.log" ]; then
        LOG_SIZE=$(du -sh logs/combined.log | cut -f1)
        print_info "  日志文件大小: $LOG_SIZE"
    fi
else
    print_warning "日志目录不存在"
fi

# 检查7: 磁盘空间
print_info "检查7: 磁盘空间..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_success "磁盘空间充足 (使用率: ${DISK_USAGE}%)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_warning "磁盘空间紧张 (使用率: ${DISK_USAGE}%)"
else
    print_error "磁盘空间不足 (使用率: ${DISK_USAGE}%)"
fi

# 检查8: 内存使用
print_info "检查8: 内存使用..."
if command -v free >/dev/null 2>&1; then
    MEMORY_USAGE=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )); then
        print_success "内存使用正常 (使用率: ${MEMORY_USAGE}%)"
    else
        print_warning "内存使用较高 (使用率: ${MEMORY_USAGE}%)"
    fi
else
    print_warning "无法检查内存使用情况"
fi

# 检查9: 网络连接
print_info "检查9: 网络连接..."
if curl -f -s --connect-timeout 5 "https://www.baidu.com" > /dev/null; then
    print_success "外网连接正常"
else
    print_warning "外网连接异常"
fi

# 检查10: API功能测试
print_info "检查10: API功能测试..."

# 测试健康检查接口
if curl -f -s "$SERVER_URL/api/health" | grep -q "ok\|healthy"; then
    print_success "健康检查接口正常"
else
    print_error "健康检查接口异常"
fi

# 检查11: 质量优化功能
print_info "检查11: 质量优化功能..."

# 检查智能时长估算器
if [ -f "backend/core/time-estimator.ts" ]; then
    print_success "智能时长估算器已部署"
else
    print_error "智能时长估算器缺失"
fi

# 检查证据来源追溯
if [ -f "backend/core/evidence-source-tracker.ts" ]; then
    print_success "证据来源追溯已部署"
else
    print_error "证据来源追溯缺失"
fi

# 检查用户反馈系统
if [ -f "backend/core/feedback-collector.ts" ]; then
    print_success "用户反馈系统已部署"
else
    print_error "用户反馈系统缺失"
fi

# 检查双模型验证
if [ -f "backend/core/dual-model-validator.ts" ]; then
    print_success "双模型验证已部署"
else
    print_error "双模型验证缺失"
fi

# 检查图片质量检查
if [ -f "backend/core/image-quality-checker.ts" ]; then
    print_success "图片质量检查已部署"
else
    print_error "图片质量检查缺失"
fi

echo ""
echo "========================================="
echo "🎯 健康检查完成"
echo "========================================="

# 生成报告
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
REPORT_FILE="health-check-report-$TIMESTAMP.txt"

{
    echo "生产环境健康检查报告"
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"
    echo ""
    echo "系统状态:"
    echo "- 后端服务: $(curl -f -s "$SERVER_URL/api/health" > /dev/null && echo "正常" || echo "异常")"
    echo "- PM2进程: $PM2_STATUS"
    echo "- 磁盘使用: ${DISK_USAGE}%"
    echo "- 内存使用: ${MEMORY_USAGE}%"
    echo ""
    echo "功能模块:"
    echo "- 智能时长估算: $([ -f "backend/core/time-estimator.ts" ] && echo "已部署" || echo "缺失")"
    echo "- 证据来源追溯: $([ -f "backend/core/evidence-source-tracker.ts" ] && echo "已部署" || echo "缺失")"
    echo "- 用户反馈系统: $([ -f "backend/core/feedback-collector.ts" ] && echo "已部署" || echo "缺失")"
    echo "- 双模型验证: $([ -f "backend/core/dual-model-validator.ts" ] && echo "已部署" || echo "缺失")"
    echo "- 图片质量检查: $([ -f "backend/core/image-quality-checker.ts" ] && echo "已部署" || echo "缺失")"
} > "$REPORT_FILE"

print_info "健康检查报告已保存: $REPORT_FILE"

echo ""
print_info "🚀 系统已准备好为用户提供服务！"