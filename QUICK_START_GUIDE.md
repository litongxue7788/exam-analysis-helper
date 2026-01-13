# 试卷分析助手 - 快速启动指南

## 🚀 5分钟快速启动

### 第一步：配置大模型API Key

编辑 `backend/.env` 文件，至少配置一个大模型服务商：

```bash
# 选择一个服务商配置 (推荐豆包)

# 方案1：豆包 (Doubao)
DOUBAO_API_KEY=你的API_KEY
DOUBAO_MODEL_ID=你的模型ID
DEFAULT_PROVIDER=doubao

# 方案2：阿里云通义 (Aliyun)
ALIYUN_API_KEY=你的API_KEY
ALIYUN_MODEL_ID=qwen-plus
DEFAULT_PROVIDER=aliyun

# 方案3：智谱 (Zhipu)
ZHIPU_API_KEY=你的API_KEY
ZHIPU_MODEL_ID=glm-4
DEFAULT_PROVIDER=zhipu
```

### 第二步：启动后端服务

```bash
# 进入后端目录
cd backend

# 编译TypeScript
npm run build

# 启动服务
npm start
```

看到以下输出表示启动成功：
```
✅ 后端服务已启动
🌐 监听端口: 3002
📡 API 地址: http://localhost:3002
```

### 第三步：启动前端服务

**新开一个终端窗口**，执行：

```bash
# 进入前端目录
cd frontend/web

# 启动开发服务器
npm run dev
```

看到以下输出表示启动成功：
```
  VITE v5.1.0  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 第四步：访问应用

打开浏览器访问：**http://localhost:3000**

## 📱 功能测试流程

### 1. 上传试卷
- 点击"拍照上传"或"从相册选择"
- 选择试卷图片（支持多张）
- 可以拖拽调整页面顺序
- 点击"开始分析"

### 2. 查看分析报告
- 等待分析完成（约20-60秒）
- 查看错因诊断
- 查看知识点分析
- 查看得分情况

### 3. 使用训练卡
- 点击"开始训练"
- 完成系统生成的练习题
- 提交答案

### 4. 验收测试
- 完成训练后进入验收环节
- 完成验收题目
- 查看是否通过

### 5. 家长驾驶舱
- 点击"家长驾驶舱"
- 查看学习进度
- 查看错因趋势
- 查看验收通过率

## 🔧 常见问题

### Q1: 后端启动失败，提示"未配置API Key"
**A**: 检查 `backend/.env` 文件，确保至少配置了一个服务商的API Key

### Q2: 前端无法连接后端
**A**: 
1. 确认后端服务已启动（端口3002）
2. 检查防火墙设置
3. 查看浏览器控制台错误信息

### Q3: 分析超时或失败
**A**:
1. 检查网络连接
2. 确认API Key有效且有额度
3. 尝试减少图片数量
4. 查看后端日志

### Q4: 图片上传失败
**A**:
1. 确认图片格式（支持jpg, png）
2. 检查图片大小（建议<5MB/张）
3. 尝试重新拍照或选择更清晰的图片

## 🎯 开发模式 vs 生产模式

### 开发模式（当前）
```bash
# 后端
cd backend
npm run dev  # 使用ts-node，支持热重载

# 前端
cd frontend/web
npm run dev  # Vite开发服务器，支持HMR
```

### 生产模式
```bash
# 后端
cd backend
npm run build  # 编译TypeScript
npm start      # 运行编译后的代码

# 前端
cd frontend/web
npm run build  # 构建生产版本
npm run preview  # 预览生产版本
```

## 📊 性能优化建议

### 图片上传优化
- 单张图片建议<2MB
- 总图片数建议<10张
- 使用清晰的照片（避免模糊）

### 分析速度优化
- 配置 `HEDGE_ENABLED=1` 启用对冲请求
- 调整 `MAX_CONCURRENT_JOBS` 控制并发数
- 使用缓存避免重复分析

### 前端性能
- 使用生产构建版本
- 启用浏览器缓存
- 压缩图片后再上传

## 🔐 安全配置

### 管理员密码
```bash
# 在 backend/.env 中设置
ADMIN_PASSWORD=your_secure_password
```

### 试点授权码
```bash
# 在 backend/.env 中设置
TRIAL_ACCESS_CODES=code1,code2,code3
```

### 限流配置
```bash
# 每分钟请求限制
RATE_LIMIT_PER_MINUTE_PER_CODE=12
RATE_LIMIT_PER_MINUTE_PER_IP=8

# 每日额度限制
DAILY_QUOTA_PER_CODE=300
DAILY_QUOTA_PER_IP=60
```

## 📚 更多文档

- [完整README](./README.md)
- [产品白皮书](./product_docs/01_产品白皮书_战略规划.md)
- [技术架构](./product_docs/02_技术架构与大模型配置.md)
- [部署手册](./product_docs/04_本地部署手册_完整版.md)
- [用户指南](./product_docs/07_用户操作指南.md)

## 💡 提示

- 首次使用建议先用测试图片验证功能
- 建议配置管理员密码后再对外开放
- 生产环境建议使用编译后的代码运行
- 定期查看后端日志排查问题

---

**祝你使用愉快！** 🎉

如有问题，请查看项目文档或联系技术支持。
