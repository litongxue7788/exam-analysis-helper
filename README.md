# 试卷分析助手 (Exam Analysis Helper)

> **"不做拍照搜题工具，做考试复盘与提分闭环的智能指挥舱。"**

![Version](https://img.shields.io/badge/version-1.5.1-blue) ![Status](https://img.shields.io/badge/status-MVP%2B-green)

## 📖 项目简介

试卷分析助手是一款基于大模型（LLM）的智能教育辅助工具，旨在帮助学生和家长从“无效刷题”转向“精准复盘”。它通过深度分析试卷错因，构建“诊断-训练-验收”的完整学习闭环。

**核心理念**：
- **拒绝答案搬运**：不直接提供答案，而是提供解题思路和最小提示链。
- **闭环优先**：发现问题（诊断）必须伴随解决问题（训练）和确认解决（验收）。
- **数据驱动**：通过题号、得分、知识点构建完整的证据链。

## ✨ 核心功能 (V1.5.1)

### 1. 智能试卷诊断 (Diagnosis)
- **多模态分析**：支持上传试卷图片，自动识别题型、得分与错因。
- **证据链可追溯**：每个错因均绑定具体【题号】、【得分/满分】与【原文证据】。
- **四要素分析**：知识点漏洞、错因归类、置信度评级、最短改法。

### 2. 学习闭环系统 (The Loop)
- **一屏三卡**：
  - **复盘卡**：核心错因一目了然。
  - **训练卡**：基于错因自动生成 3 道针对性变式题（AI 生成）。
  - **验收卡**：对训练结果进行小测，判定是否掌握。
- **自动流转**：验收失败自动触发“二次训练”，直到掌握为止。

### 3. 家长驾驶舱 (Parent Dashboard)
- **四维监控**：
  - 📅 **今日任务完成率**
  - ✅ **最近验收通过率**
  - 📉 **高频错因复发趋势**
  - 🚀 **明日核心任务预告**
- **HUD 视觉风格**：采用 Glassmorphism（玻璃拟态）设计，数据可视化呈现。

### 4. 极致交互体验 (UX)
- **悬浮侧边栏**：支持一键展开/收起，可自由切换左右位置，适应不同操作习惯。
- **响应式设计**：完美适配桌面端与移动端，移动端采用 Bottom Sheet 与弹窗交互。

## 🚀 部署与线上环境

本项目已部署至生产环境进行试运行。

- **源码仓库**: [https://github.com/litongxue7788/exam-analysis-helper](https://github.com/litongxue7788/exam-analysis-helper)
- **线上服务器**: 阿里云 ECS (实例 ID: `i-2ze430a8moubrvgp8nns`)
- **线上访问**: http://123.56.45.212/
- **开发代理**: 端口 `56751`

## 🛠 技术栈

- **Frontend**: React 18, Vite, TypeScript, Glassmorphism UI (CSS Modules/Variables)
- **Backend**: Node.js, Express, TypeScript
- **AI Integration**: OpenAI SDK 适配层 (支持豆包/阿里云/智谱等国内模型)
- **Data**: LocalStorage (前端持久化) + JSON (配置存储)

## 🚀 快速开始

### 1. 环境准备
- Node.js >= 18.0
- 有效的大模型 API Key (如豆包、阿里云 Qwen)

### 2. 后端启动
```bash
cd backend
# 1. 安装依赖
npm install
# 2. 配置环境变量 (复制 .env.example 为 .env 并填入 Key)
cp .env.example .env
# 3. 编译并启动 (推荐，更稳定)
npm run build
node dist/server.js

# 或者使用开发模式 (可能存在缓存问题)
# npm run dev
```

### 3. 前端启动
```bash
cd frontend/web
# 1. 安装依赖
npm install
# 2. 启动开发服务器
npm run dev
```

### 4. 访问
打开浏览器访问 `http://localhost:3000` 即可开始使用。

说明：
- 前端开发服务器默认端口为 3000，并将 `/api/*` 代理到 `http://localhost:3002`。
- 线上环境通过 Nginx 托管前端静态文件，并反代 `/api/*` 到后端服务。

## 📅 开发计划 (Roadmap)

- [x] **Phase 1: 单科闭环验证 (MVP+)** - 已完成 (V1.5.1)
- [ ] **Phase 2: 全科覆盖与错题本 2.0 (V2.0)** - 规划中 (待上线测试后启动)
- [ ] **Phase 3: 云端同步与社区 (V3.0)** - 规划中

详见 [ROADMAP.md](./ROADMAP.md)

## 📄 许可证
MIT License
