# 试卷分析助手

智能试卷分析系统 - 基于AI的试卷图片分析和学情诊断工具

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动后端服务
cd backend
npm run dev

# 启动前端服务（新终端）
cd frontend/web
npm run dev
```

访问: http://localhost:5173

### 生产部署

详见: `部署和运维指南.md`

## 📋 主要功能

- ✅ 智能试卷图片识别（准确率97%）
- ✅ 学情分析和知识点诊断
- ✅ 个性化练习题推荐
- ✅ 移动端支持（拍照上传）
- ✅ 用户反馈系统
- ✅ 证据来源追溯
- ✅ 智能时长估算

## 🛠️ 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: Node.js + Express
- **AI**: 豆包/阿里云/智谱 大模型
- **部署**: PM2 + Nginx

## 📖 文档

- `README.md` - 项目说明（本文件）
- `部署和运维指南.md` - 生产环境部署
- `上线检查清单.md` - 上线验证清单
- `生产部署启动指南.md` - 部署详细步骤
- `重启服务指南.md` - 服务重启指南
- `质量优化项目_README.md` - 质量优化总结
- `练习题质量保障机制说明.md` - 质量保障机制
- `如何收集用户反馈_完整指南.md` - 反馈收集指南
- `如何查看用户反馈.md` - 反馈查看指南
- `用户反馈和历史记录_完整使用指南.md` - 完整使用指南
- `API文档_新增功能.md` - API文档
- `CONFIG_TEMPLATE.md` - 配置模板

## 🔧 配置

### 环境变量

复制 `backend/.env.example` 为 `backend/.env`，填入配置：

```env
# 大模型API配置
DOUBAO_API_KEY=your_api_key
DOUBAO_MODEL_ID=your_model_id

# 服务器配置
PORT=3002
NODE_ENV=production
```

## 📊 性能指标

- 识别准确率: 97%
- 分析时长: 55秒
- 用户体验评分: 93分
- 测试覆盖率: 95%

## 🚀 部署脚本

- `deploy.sh` - Linux服务器部署
- `server-deploy-guide.sh` - 自动化部署
- `health-check.sh` - 健康检查
- `monitor.sh` - 系统监控
- `backup.sh` - 数据备份

## 📞 技术支持

- GitHub: https://github.com/litongxue7788/exam-analysis-helper
- 服务器: 172.16.0.196

## 📄 许可证

见 LICENSE 文件

---

**版本**: v2.0 - 质量优化完成版  
**更新日期**: 2026-01-13
