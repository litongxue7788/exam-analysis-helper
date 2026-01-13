#!/bin/bash
# 查看配置的访问口令

echo "=========================================="
echo "访问口令查看工具"
echo "=========================================="
echo ""

cd /opt/exam-analysis-helper/backend

if [ ! -f .env ]; then
    echo "❌ 错误：.env 文件不存在"
    exit 1
fi

echo "当前配置的访问口令："
echo ""

# 读取并显示口令
CODES=$(grep "^TRIAL_ACCESS_CODES=" .env | cut -d'=' -f2)

if [ -z "$CODES" ]; then
    echo "❌ 未配置访问口令（TRIAL_ACCESS_CODES为空）"
    echo ""
    echo "建议："
    echo "1. 编辑 .env 文件"
    echo "2. 设置 TRIAL_ACCESS_CODES=your_code_here"
    echo "3. 重启服务: pm2 restart exam-helper-backend"
else
    echo "✅ 已配置访问口令"
    echo ""
    echo "口令列表："
    echo "$CODES" | tr ',' '\n' | nl
    echo ""
    echo "⚠️  请妥善保管这些口令，不要在公开渠道分享"
fi

echo ""
echo "=========================================="
