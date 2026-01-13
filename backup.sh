#!/bin/bash

# =================================================================================
# 生产环境备份脚本
# 自动备份重要数据和配置文件
# =================================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="exam-analysis-backup-$DATE"
RETENTION_DAYS=30  # 保留30天的备份

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建备份目录
create_backup_dir() {
    print_info "创建备份目录..."
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    print_success "备份目录已创建: $BACKUP_DIR/$BACKUP_NAME"
}

# 备份配置文件
backup_configs() {
    print_info "备份配置文件..."
    
    # 备份环境变量文件
    if [ -f "backend/.env" ]; then
        cp "backend/.env" "$BACKUP_DIR/$BACKUP_NAME/env"
        print_success "✅ 环境变量文件已备份"
    else
        print_warning "⚠️ 环境变量文件不存在"
    fi
    
    # 备份LLM配置
    if [ -f "config/llm.json" ]; then
        cp "config/llm.json" "$BACKUP_DIR/$BACKUP_NAME/llm.json"
        print_success "✅ LLM配置文件已备份"
    fi
    
    # 备份PM2配置
    if [ -f "ecosystem.config.js" ]; then
        cp "ecosystem.config.js" "$BACKUP_DIR/$BACKUP_NAME/ecosystem.config.js"
        print_success "✅ PM2配置文件已备份"
    fi
    
    # 备份Nginx配置
    if [ -f "nginx.conf" ]; then
        cp "nginx.conf" "$BACKUP_DIR/$BACKUP_NAME/nginx.conf"
        print_success "✅ Nginx配置文件已备份"
    fi
    
    # 备份package.json文件
    if [ -f "backend/package.json" ]; then
        cp "backend/package.json" "$BACKUP_DIR/$BACKUP_NAME/backend-package.json"
        print_success "✅ 后端package.json已备份"
    fi
    
    if [ -f "frontend/web/package.json" ]; then
        cp "frontend/web/package.json" "$BACKUP_DIR/$BACKUP_NAME/frontend-package.json"
        print_success "✅ 前端package.json已备份"
    fi
}

# 备份用户数据
backup_user_data() {
    print_info "备份用户数据..."
    
    # 备份用户反馈数据
    if [ -f "data/feedbacks/user-feedbacks.jsonl" ]; then
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME/data/feedbacks"
        cp "data/feedbacks/user-feedbacks.jsonl" "$BACKUP_DIR/$BACKUP_NAME/data/feedbacks/"
        
        # 统计反馈数量
        FEEDBACK_COUNT=$(wc -l < "data/feedbacks/user-feedbacks.jsonl")
        print_success "✅ 用户反馈数据已备份 ($FEEDBACK_COUNT 条记录)"
    else
        print_warning "⚠️ 用户反馈数据文件不存在"
    fi
    
    # 备份其他数据文件
    if [ -d "data" ]; then
        # 备份除了缓存之外的所有数据
        rsync -av --exclude='cache' data/ "$BACKUP_DIR/$BACKUP_NAME/data/" 2>/dev/null || {
            cp -r data "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || print_warning "⚠️ 部分数据文件备份失败"
        }
        print_success "✅ 数据目录已备份"
    fi
}

# 备份日志文件
backup_logs() {
    print_info "备份日志文件..."
    
    if [ -d "logs" ]; then
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME/logs"
        
        # 只备份最近7天的日志
        find logs -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/$BACKUP_NAME/logs/" \; 2>/dev/null || {
            cp -r logs "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || print_warning "⚠️ 日志文件备份失败"
        }
        
        print_success "✅ 日志文件已备份（最近7天）"
    else
        print_warning "⚠️ 日志目录不存在"
    fi
    
    # 备份PM2日志
    if command -v pm2 >/dev/null 2>&1; then
        PM2_LOG_DIR="$HOME/.pm2/logs"
        if [ -d "$PM2_LOG_DIR" ]; then
            mkdir -p "$BACKUP_DIR/$BACKUP_NAME/pm2-logs"
            find "$PM2_LOG_DIR" -name "*exam-analysis*" -mtime -7 -exec cp {} "$BACKUP_DIR/$BACKUP_NAME/pm2-logs/" \; 2>/dev/null || true
            print_success "✅ PM2日志已备份"
        fi
    fi
}

# 备份数据库（如果有）
backup_database() {
    print_info "检查数据库备份..."
    
    # 这里可以添加数据库备份逻辑
    # 例如：mysqldump, pg_dump 等
    
    print_info "ℹ️ 当前系统未使用数据库，跳过数据库备份"
}

# 创建系统信息快照
create_system_snapshot() {
    print_info "创建系统信息快照..."
    
    SNAPSHOT_FILE="$BACKUP_DIR/$BACKUP_NAME/system-snapshot.txt"
    
    {
        echo "系统信息快照"
        echo "备份时间: $(date)"
        echo "========================================"
        echo ""
        
        echo "系统信息:"
        uname -a 2>/dev/null || echo "无法获取系统信息"
        echo ""
        
        echo "磁盘使用:"
        df -h 2>/dev/null || echo "无法获取磁盘信息"
        echo ""
        
        echo "内存使用:"
        free -h 2>/dev/null || echo "无法获取内存信息"
        echo ""
        
        echo "Node.js版本:"
        node --version 2>/dev/null || echo "Node.js未安装"
        echo ""
        
        echo "npm版本:"
        npm --version 2>/dev/null || echo "npm未安装"
        echo ""
        
        echo "PM2进程:"
        pm2 list 2>/dev/null || echo "PM2未安装或无进程"
        echo ""
        
        echo "网络端口:"
        netstat -tlnp 2>/dev/null | grep :3002 || echo "端口3002未监听"
        echo ""
        
        echo "环境变量（敏感信息已隐藏）:"
        env | grep -E "(NODE_ENV|PORT|DEFAULT_PROVIDER)" | sed 's/=.*/=***/' 2>/dev/null || echo "无相关环境变量"
        
    } > "$SNAPSHOT_FILE"
    
    print_success "✅ 系统信息快照已创建"
}

# 压缩备份
compress_backup() {
    print_info "压缩备份文件..."
    
    cd "$BACKUP_DIR"
    tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        # 删除未压缩的目录
        rm -rf "$BACKUP_NAME"
        
        # 获取压缩文件大小
        BACKUP_SIZE=$(du -sh "$BACKUP_NAME.tar.gz" | cut -f1)
        print_success "✅ 备份已压缩: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)"
    else
        print_error "❌ 备份压缩失败"
        exit 1
    fi
    
    cd - > /dev/null
}

# 清理旧备份
cleanup_old_backups() {
    print_info "清理旧备份文件..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # 删除超过保留期的备份文件
        find "$BACKUP_DIR" -name "exam-analysis-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
        
        # 统计剩余备份数量
        BACKUP_COUNT=$(find "$BACKUP_DIR" -name "exam-analysis-backup-*.tar.gz" | wc -l)
        print_success "✅ 旧备份已清理，当前保留 $BACKUP_COUNT 个备份文件"
    fi
}

# 验证备份
verify_backup() {
    print_info "验证备份文件..."
    
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    if [ -f "$BACKUP_FILE" ]; then
        # 测试压缩文件完整性
        if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
            print_success "✅ 备份文件完整性验证通过"
        else
            print_error "❌ 备份文件损坏"
            exit 1
        fi
        
        # 显示备份内容
        print_info "备份内容:"
        tar -tzf "$BACKUP_FILE" | head -20
        if [ $(tar -tzf "$BACKUP_FILE" | wc -l) -gt 20 ]; then
            echo "... 还有更多文件"
        fi
    else
        print_error "❌ 备份文件不存在"
        exit 1
    fi
}

# 发送备份通知（可选）
send_notification() {
    print_info "发送备份通知..."
    
    # 这里可以添加通知逻辑
    # 例如：发送邮件、Slack通知、微信通知等
    
    print_info "ℹ️ 通知功能未配置，跳过通知发送"
}

# 主函数
main() {
    echo "========================================="
    echo "🗄️  试卷分析系统 - 生产环境备份"
    echo "📅 备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================="
    
    create_backup_dir
    backup_configs
    backup_user_data
    backup_logs
    backup_database
    create_system_snapshot
    compress_backup
    cleanup_old_backups
    verify_backup
    send_notification
    
    echo ""
    echo "========================================="
    echo "🎉 备份完成！"
    echo "📁 备份文件: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    echo "📊 备份大小: $(du -sh "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)"
    echo "🗓️  保留期限: $RETENTION_DAYS 天"
    echo "========================================="
}

# 帮助信息
show_help() {
    echo "生产环境备份脚本"
    echo ""
    echo "用法:"
    echo "  $0                    # 执行完整备份"
    echo "  $0 --config-only     # 仅备份配置文件"
    echo "  $0 --data-only       # 仅备份用户数据"
    echo "  $0 --help            # 显示帮助信息"
    echo ""
    echo "备份内容:"
    echo "  - 配置文件 (.env, ecosystem.config.js, nginx.conf 等)"
    echo "  - 用户数据 (反馈数据、上传文件等)"
    echo "  - 日志文件 (最近7天)"
    echo "  - 系统信息快照"
    echo ""
    echo "备份位置: $BACKUP_DIR/"
    echo "保留期限: $RETENTION_DAYS 天"
}

# 参数处理
case "$1" in
    --config-only)
        echo "执行配置文件备份..."
        create_backup_dir
        backup_configs
        create_system_snapshot
        compress_backup
        verify_backup
        print_success "✅ 配置文件备份完成"
        ;;
    --data-only)
        echo "执行用户数据备份..."
        create_backup_dir
        backup_user_data
        backup_logs
        compress_backup
        verify_backup
        print_success "✅ 用户数据备份完成"
        ;;
    --help)
        show_help
        ;;
    "")
        main
        ;;
    *)
        echo "错误: 未知参数 '$1'"
        echo "使用 '$0 --help' 查看帮助信息"
        exit 1
        ;;
esac