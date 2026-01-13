# 试卷分析助手

智能试卷分析系统 - 基于AI的试卷图片分析和学情诊断工具

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm >= 8

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/litongxue7788/exam-analysis-helper.git
cd exam-analysis-helper

# 2. 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env 文件，填入你的API密钥

# 3. 安装依赖
npm install
cd ../frontend/web
npm install

# 4. 启动服务
# 终端1 - 启动后端
cd backend
npm run dev

# 终端2 - 启动前端
cd frontend/web
npm run dev
```

访问: http://localhost:5173

### 生产部署

详见: `docs/部署和运维指南.md`

## 📋 主要功能

- ✅ 智能试卷图片识别（准确率97%）
- ✅ 学情分析和知识点诊断
- ✅ 个性化练习题推荐
- ✅ 移动端支持（拍照上传）
- ✅ 用户反馈系统

## 🛠️ 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: Node.js + Express
- **AI**: 豆包/阿里云/智谱 大模型

## 📖 文档

### 部署文档
- `docs/部署和运维指南.md` - 生产环境部署
- `docs/上线检查清单.md` - 上线验证清单
- `docs/生产部署启动指南.md` - 部署详细步骤
- `docs/重启服务指南.md` - 服务重启指南

### 用户文档
- `docs/练习题质量保障机制说明.md` - 质量保障机制
- `docs/如何收集用户反馈_完整指南.md` - 反馈收集指南
- `docs/如何查看用户反馈.md` - 反馈查看指南
- `docs/用户反馈和历史记录_完整使用指南.md` - 完整使用指南

### 技术文档
- `docs/API文档_新增功能.md` - API文档
- `docs/CONFIG_TEMPLATE.md` - 配置模板

## 🔧 配置

### 环境变量

复制 `backend/.env.example` 为 `backend/.env`：

```env
# 大模型API配置（至少配置一个）
DOUBAO_API_KEY=your_api_key
DOUBAO_MODEL_ID=your_model_id

# 服务器配置
PORT=3002
NODE_ENV=production
```

详见: `docs/CONFIG_TEMPLATE.md`

## 📊 性能指标

- 识别准确率: 97%
- 分析时长: 55秒
- 用户体验评分: 93分

## 🚀 部署脚本

- `deploy.sh` - Linux服务器部署
- `server-deploy-guide.sh` - 自动化部署
- `health-check.sh` - 健康检查
- `monitor.sh` - 系统监控
- `backup.sh` - 数据备份

## 📄 许可证

MIT License - 见 LICENSE 文件

## 📞 技术支持

- GitHub: https://github.com/litongxue7788/exam-analysis-helper
- Issues: https://github.com/litongxue7788/exam-analysis-helper/issues

---

**版本**: v2.0  
**更新日期**: 2026-01-13
