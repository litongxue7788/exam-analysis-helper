#!/bin/bash
# 临时禁用访问口令验证 - 仅用于测试！

echo "⚠️  警告：此操作将禁用访问口令验证"
echo "⚠️  任何人都可以访问你的服务"
echo "⚠️  仅在测试环境使用！"
echo ""
read -p "确认继续？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "1. 备份当前配置..."
cd /opt/exam-analysis-helper/backend
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

echo "2. 禁用访问口令..."
sed -i 's/^TRIAL_ACCESS_CODES=.*/TRIAL_ACCESS_CODES=/' .env

echo "3. 重启服务..."
pm2 restart exam-helper-backend

echo ""
echo "✅ 完成！访问口令已禁用"
echo ""
echo "恢复方法："
echo "1. 编辑 /opt/exam-analysis-helper/backend/.env"
echo "2. 恢复 TRIAL_ACCESS_CODES 配置"
echo "3. 运行: pm2 restart exam-helper-backend"
