#!/bin/bash
# 服务器诊断脚本 - 在阿里云服务器上运行

echo "=========================================="
echo "1. 检查服务状态"
echo "=========================================="
pm2 status

echo ""
echo "=========================================="
echo "2. 检查后端服务日志"
echo "=========================================="
pm2 logs exam-helper-backend --lines 30 --nostream

echo ""
echo "=========================================="
echo "3. 检查环境变量配置（脱敏）"
echo "=========================================="
cd /opt/exam-analysis-helper/backend
echo "TRIAL_ACCESS_CODES配置状态："
if grep -q "^TRIAL_ACCESS_CODES=.\+" .env; then
    echo "✅ 已配置访问口令"
    # 只显示口令数量，不显示具体内容
    CODE_COUNT=$(grep "^TRIAL_ACCESS_CODES=" .env | cut -d'=' -f2 | tr ',' '\n' | wc -l)
    echo "   口令数量: $CODE_COUNT 个"
else
    echo "❌ 未配置访问口令（或为空）"
fi

echo ""
echo "DEFAULT_PROVIDER配置："
grep "^DEFAULT_PROVIDER=" .env || echo "未配置"

echo ""
echo "=========================================="
echo "4. 检查服务端口"
echo "=========================================="
netstat -tlnp | grep 3002 || echo "端口3002未监听"

echo ""
echo "=========================================="
echo "5. 测试API健康检查"
echo "=========================================="
curl -s http://localhost:3002/api/health | head -20

echo ""
echo "=========================================="
echo "6. 测试API（不带口令）"
echo "=========================================="
echo "预期：应该返回401错误"
curl -s -X POST http://localhost:3002/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"images":[]}' | head -20

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
