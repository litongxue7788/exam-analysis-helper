#!/bin/bash
# 修复后端数据文件缺失问题

echo "=========================================="
echo "修复后端数据文件"
echo "=========================================="

cd /opt/exam-analysis-helper/backend

echo "1. 检查源文件..."
if [ ! -f "data/knowledge-points.json" ]; then
    echo "❌ 错误：源文件 data/knowledge-points.json 不存在"
    exit 1
fi
echo "✅ 源文件存在"

echo ""
echo "2. 创建dist/data目录..."
mkdir -p dist/data
echo "✅ 目录已创建"

echo ""
echo "3. 复制数据文件..."
cp data/knowledge-points.json dist/data/
echo "✅ 文件已复制"

echo ""
echo "4. 验证文件..."
if [ -f "dist/data/knowledge-points.json" ]; then
    FILE_SIZE=$(stat -c%s "dist/data/knowledge-points.json")
    echo "✅ 文件已存在，大小: $FILE_SIZE 字节"
else
    echo "❌ 错误：文件复制失败"
    exit 1
fi

echo ""
echo "5. 重启PM2服务..."
pm2 restart exam-helper-backend

echo ""
echo "6. 等待服务启动..."
sleep 3

echo ""
echo "7. 测试API..."
HEALTH_CHECK=$(curl -s http://localhost:3002/api/health)
if [ -n "$HEALTH_CHECK" ]; then
    echo "✅ API响应正常"
    echo "$HEALTH_CHECK"
else
    echo "⚠️  API无响应，请检查日志"
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "查看日志："
echo "  pm2 logs exam-helper-backend --lines 30"
