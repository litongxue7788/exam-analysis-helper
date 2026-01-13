#!/bin/bash

# =================================================================================
# 生产环境监控脚本
# 实时监控系统状态和性能指标
# =================================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
SERVER_URL="http://localhost:3002"
REFRESH_INTERVAL=5  # 刷新间隔（秒）

# 清屏函数
clear_screen() {
    clear
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}🖥️  试卷分析系统 - 生产环境监控${NC}"
    echo -e "${CYAN}📅 $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}🔄 自动刷新间隔: ${REFRESH_INTERVAL}秒${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
}

# 获取系统信息
get_system_info() {
    echo -e "${BLUE}📊 系统信息${NC}"
    echo "----------------------------------------"
    
    # CPU使用率
    if command -v top >/dev/null 2>&1; then
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
        echo -e "🔥 CPU使用率: ${CPU_USAGE}%"
    fi
    
    # 内存使用
    if command -v free >/dev/null 2>&1; then
        MEMORY_INFO=$(free -h | awk 'NR==2{printf "使用: %s/%s (%.1f%%)", $3,$2,$3*100/$2}')
        echo -e "💾 内存: $MEMORY_INFO"
    fi
    
    # 磁盘使用
    DISK_INFO=$(df -h . | awk 'NR==2{printf "使用: %s/%s (%s)", $3,$2,$5}')
    echo -e "💿 磁盘: $DISK_INFO"
    
    # 系统负载
    if [ -f /proc/loadavg ]; then
        LOAD_AVG=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
        echo -e "⚖️  系统负载: $LOAD_AVG"
    fi
    
    echo ""
}

# 获取服务状态
get_service_status() {
    echo -e "${BLUE}🚀 服务状态${NC}"
    echo "----------------------------------------"
    
    # 后端服务健康检查
    if curl -f -s --connect-timeout 3 "$SERVER_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✅ 后端服务: 正常运行${NC}"
        
        # 获取详细健康信息
        HEALTH_INFO=$(curl -s "$SERVER_URL/api/health" 2>/dev/null)
        if [ ! -z "$HEALTH_INFO" ]; then
            echo "   响应: $HEALTH_INFO"
        fi
    else
        echo -e "${RED}❌ 后端服务: 无响应${NC}"
    fi
    
    # PM2进程状态
    if command -v pm2 >/dev/null 2>&1; then
        echo -e "🔧 PM2进程状态:"
        pm2 list | grep -E "(exam-analysis|online|stopped|errored)" | while read line; do
            if echo "$line" | grep -q "online"; then
                echo -e "   ${GREEN}$line${NC}"
            elif echo "$line" | grep -q "stopped\|errored"; then
                echo -e "   ${RED}$line${NC}"
            else
                echo "   $line"
            fi
        done
    fi
    
    echo ""
}

# 获取性能指标
get_performance_metrics() {
    echo -e "${BLUE}📈 性能指标${NC}"
    echo "----------------------------------------"
    
    # 网络连接数
    if command -v netstat >/dev/null 2>&1; then
        CONNECTIONS=$(netstat -an | grep :3002 | grep ESTABLISHED | wc -l)
        echo -e "🌐 活跃连接数: $CONNECTIONS"
    fi
    
    # 进程内存使用
    if command -v ps >/dev/null 2>&1; then
        NODE_MEMORY=$(ps aux | grep "node.*server" | grep -v grep | awk '{sum+=$6} END {printf "%.1f MB", sum/1024}')
        if [ ! -z "$NODE_MEMORY" ]; then
            echo -e "🧠 Node.js内存: $NODE_MEMORY"
        fi
    fi
    
    # 文件描述符使用
    if [ -f /proc/sys/fs/file-nr ]; then
        FD_INFO=$(cat /proc/sys/fs/file-nr | awk '{printf "使用: %d/%d", $1,$3}')
        echo -e "📁 文件描述符: $FD_INFO"
    fi
    
    echo ""
}

# 获取日志信息
get_log_info() {
    echo -e "${BLUE}📋 最新日志${NC}"
    echo "----------------------------------------"
    
    # PM2日志
    if command -v pm2 >/dev/null 2>&1; then
        echo -e "${YELLOW}🔍 最近5条日志:${NC}"
        pm2 logs exam-analysis-backend --lines 5 --nostream 2>/dev/null | tail -n 5 | while read line; do
            if echo "$line" | grep -q "ERROR\|error\|Error"; then
                echo -e "${RED}$line${NC}"
            elif echo "$line" | grep -q "WARN\|warn\|Warn"; then
                echo -e "${YELLOW}$line${NC}"
            else
                echo "$line"
            fi
        done
    fi
    
    # 错误日志统计
    if [ -f "logs/err.log" ]; then
        ERROR_COUNT=$(tail -n 100 logs/err.log 2>/dev/null | wc -l)
        if [ "$ERROR_COUNT" -gt 0 ]; then
            echo -e "${RED}⚠️  最近100行中有 $ERROR_COUNT 条错误日志${NC}"
        fi
    fi
    
    echo ""
}

# 获取业务指标
get_business_metrics() {
    echo -e "${BLUE}📊 业务指标${NC}"
    echo "----------------------------------------"
    
    # 反馈文件统计
    if [ -f "data/feedbacks/user-feedbacks.jsonl" ]; then
        FEEDBACK_COUNT=$(wc -l < data/feedbacks/user-feedbacks.jsonl 2>/dev/null || echo "0")
        echo -e "💬 用户反馈总数: $FEEDBACK_COUNT"
        
        # 今日反馈数
        TODAY=$(date '+%Y-%m-%d')
        TODAY_FEEDBACK=$(grep "$TODAY" data/feedbacks/user-feedbacks.jsonl 2>/dev/null | wc -l || echo "0")
        echo -e "📅 今日反馈数: $TODAY_FEEDBACK"
    fi
    
    # 缓存目录大小
    if [ -d "data/cache" ]; then
        CACHE_SIZE=$(du -sh data/cache 2>/dev/null | cut -f1 || echo "0")
        echo -e "🗄️  缓存大小: $CACHE_SIZE"
    fi
    
    # 日志文件大小
    if [ -d "logs" ]; then
        LOG_SIZE=$(du -sh logs 2>/dev/null | cut -f1 || echo "0")
        echo -e "📝 日志大小: $LOG_SIZE"
    fi
    
    echo ""
}

# 获取质量优化功能状态
get_quality_features() {
    echo -e "${BLUE}🎯 质量优化功能${NC}"
    echo "----------------------------------------"
    
    # 检查核心功能文件
    features=(
        "backend/core/time-estimator.ts:智能时长估算"
        "backend/core/evidence-source-tracker.ts:证据来源追溯"
        "backend/core/feedback-collector.ts:用户反馈系统"
        "backend/core/dual-model-validator.ts:双模型验证"
        "backend/core/image-quality-checker.ts:图片质量检查"
        "backend/core/progressive-delivery.ts:渐进式加载"
        "backend/core/content-sanitizer.ts:内容清洗"
        "backend/core/relevance-validator.ts:相关性验证"
    )
    
    for feature in "${features[@]}"; do
        IFS=':' read -r file desc <<< "$feature"
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $desc${NC}"
        else
            echo -e "${RED}❌ $desc${NC}"
        fi
    done
    
    echo ""
}

# 主监控循环
main_monitor() {
    while true; do
        clear_screen
        get_system_info
        get_service_status
        get_performance_metrics
        get_log_info
        get_business_metrics
        get_quality_features
        
        echo -e "${CYAN}=========================================${NC}"
        echo -e "${CYAN}按 Ctrl+C 退出监控${NC}"
        echo -e "${CYAN}=========================================${NC}"
        
        sleep $REFRESH_INTERVAL
    done
}

# 单次检查模式
single_check() {
    clear_screen
    get_system_info
    get_service_status
    get_performance_metrics
    get_log_info
    get_business_metrics
    get_quality_features
    
    echo -e "${GREEN}✅ 单次检查完成${NC}"
}

# 帮助信息
show_help() {
    echo "生产环境监控脚本"
    echo ""
    echo "用法:"
    echo "  $0                 # 启动实时监控"
    echo "  $0 --once         # 执行单次检查"
    echo "  $0 --interval N   # 设置刷新间隔（秒）"
    echo "  $0 --help         # 显示帮助信息"
    echo ""
    echo "功能:"
    echo "  - 实时监控系统资源使用情况"
    echo "  - 检查服务运行状态"
    echo "  - 显示性能指标"
    echo "  - 监控日志输出"
    echo "  - 统计业务指标"
    echo "  - 验证质量优化功能"
}

# 参数处理
case "$1" in
    --once)
        single_check
        ;;
    --interval)
        if [ -n "$2" ] && [ "$2" -gt 0 ] 2>/dev/null; then
            REFRESH_INTERVAL=$2
            main_monitor
        else
            echo "错误: 请提供有效的刷新间隔（秒）"
            exit 1
        fi
        ;;
    --help)
        show_help
        ;;
    "")
        main_monitor
        ;;
    *)
        echo "错误: 未知参数 '$1'"
        echo "使用 '$0 --help' 查看帮助信息"
        exit 1
        ;;
esac