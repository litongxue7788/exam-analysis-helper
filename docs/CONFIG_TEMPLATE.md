# 试卷分析助手 - 配置模板与说明

## 📋 配置检查结果

根据自动检查，当前配置状态：

- ✅ 后端依赖已安装
- ✅ 前端依赖已安装
- ❌ **大模型API Key未配置** (必须配置)
- ⚠️ 管理员密码未设置 (可选)
- ⚪ 试点授权码未配置 (可选)

## 🚨 必须配置项

### 大模型API Key配置

**至少选择一个服务商进行配置：**

#### 选项1：豆包 (Doubao) - 推荐
```bash
# 编辑 backend/.env 文件

# 豆包配置
DOUBAO_API_KEY=你的豆包API_KEY
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL_ID=你的模型接入点ID

# 设置为默认服务商
DEFAULT_PROVIDER=doubao
```

**获取方式：**
1. 访问火山引擎控制台：https://console.volcengine.com/ark
2. 创建推理接入点
3. 获取API Key和模型ID

#### 选项2：阿里云通义 (Aliyun)
```bash
# 编辑 backend/.env 文件

# 阿里云配置
ALIYUN_API_KEY=你的阿里云API_KEY
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL_ID=qwen-plus

# 设置为默认服务商
DEFAULT_PROVIDER=aliyun
```

**获取方式：**
1. 访问阿里云DashScope：https://dashscope.aliyun.com/
2. 创建API Key
3. 选择模型（推荐qwen-plus或qwen-max）

#### 选项3：智谱 (Zhipu)
```bash
# 编辑 backend/.env 文件

# 智谱配置
ZHIPU_API_KEY=你的智谱API_KEY
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL_ID=glm-4

# 设置为默认服务商
DEFAULT_PROVIDER=zhipu
```

**获取方式：**
1. 访问智谱AI开放平台：https://open.bigmodel.cn/
2. 创建API Key
3. 选择模型（推荐glm-4）

## ⚙️ 可选配置项

### 管理员密码
用于前端管理员配置界面的身份验证

```bash
# 编辑 backend/.env 文件
ADMIN_PASSWORD=你的管理员密码
```

**建议：**
- 使用强密码（至少8位，包含字母数字）
- 不要使用常见密码
- 定期更换密码

### 试点授权码
用于限制访问和控制使用额度

```bash
# 编辑 backend/.env 文件
TRIAL_ACCESS_CODES=code1,code2,code3
```

**说明：**
- 多个授权码用英文逗号分隔
- 用户需要输入授权码才能使用
- 可以为不同用户分配不同授权码

### 限流配置
控制API调用频率和额度

```bash
# 每分钟请求限制
RATE_LIMIT_PER_MINUTE_PER_CODE=12
RATE_LIMIT_PER_MINUTE_PER_IP=8

# 每日额度限制
DAILY_QUOTA_PER_CODE=300
DAILY_QUOTA_PER_IP=60
```

### 性能配置
优化系统性能和响应速度

```bash
# 服务端口
PORT=3002

# LLM调用超时（毫秒）
LLM_TIMEOUT_MS=60000

# 重试次数
LLM_RETRY_COUNT=1

# 重试延迟（毫秒）
LLM_RETRY_BASE_DELAY_MS=800

# 启用对冲请求（提高成功率）
HEDGE_ENABLED=1

# 对冲延迟（毫秒）
HEDGE_AFTER_MS=3800

# 最大并发作业数
MAX_CONCURRENT_JOBS=2
```

## 📝 完整配置示例

### backend/.env 完整示例

```bash
# ==============================================================================
# 试卷分析助手 - 环境变量配置
# ==============================================================================

# ===== 大模型配置 (至少配置一个) =====

# 1. 豆包 (Doubao) 配置
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL_ID=your_model_id_here

# 2. 阿里云 (Aliyun / DashScope) 配置
ALIYUN_API_KEY=your_aliyun_api_key_here
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL_ID=qwen-plus

# 3. 智谱 (ZhipuAI) 配置
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL_ID=glm-4

# 当前使用的模型提供商 (可选: doubao, aliyun, zhipu)
DEFAULT_PROVIDER=doubao

# ===== 管理员配置 (可选) =====

# 管理员密码（用于前端"管理员配置"功能）
ADMIN_PASSWORD=your_admin_password_here

# ===== 访问控制 (可选) =====

# 试点口令（多个用英文逗号分隔）
TRIAL_ACCESS_CODES=test123,demo456,pilot789

# ===== 限流配置 (可选) =====

# 每分钟请求限制
RATE_LIMIT_PER_MINUTE_PER_CODE=12
RATE_LIMIT_PER_MINUTE_PER_IP=8

# 每日额度限制
DAILY_QUOTA_PER_CODE=300
DAILY_QUOTA_PER_IP=60

# ===== 服务配置 (可选) =====

# 服务端口
PORT=3002

# LLM调用超时（毫秒，0表示不限制）
LLM_TIMEOUT_MS=60000

# 重试配置
LLM_RETRY_COUNT=1
LLM_RETRY_BASE_DELAY_MS=800

# 对冲请求配置（提高成功率）
HEDGE_ENABLED=1
HEDGE_SECONDARY_PROVIDER=
HEDGE_AFTER_MS=3800
HEDGE_AFTER_MS_PER_IMAGE=450

# 作业队列配置
MAX_CONCURRENT_JOBS=2
JOB_TTL_MS=7200000
MAX_JOBS_IN_MEMORY=200
JOB_EVENT_BUFFER_SIZE=40

# 缓存配置
IMAGE_ANALYZE_CACHE_TTL_MS=604800000
```

## 🔍 配置验证

配置完成后，运行以下命令验证：

```bash
node check-config.js
```

**期望输出：**
```
=== 试卷分析助手 - 配置检查 ===

📦 检查后端依赖...
  ✅ 后端依赖已安装

📦 检查前端依赖...
  ✅ 前端依赖已安装

🔧 检查环境配置...
  ✅ .env 文件存在

🤖 检查大模型配置...
  ✅ 豆包 (Doubao): 已配置

🎯 检查默认服务商...
  当前默认: doubao
  ✅ 默认服务商已正确配置

=== 检查结果 ===

✅ 所有配置检查通过！
```

## 🚀 配置后的启动流程

1. **验证配置**
   ```bash
   node check-config.js
   ```

2. **启动后端**
   ```bash
   cd backend
   npm run build
   npm start
   ```

3. **启动前端**（新开终端）
   ```bash
   cd frontend/web
   npm run dev
   ```

4. **访问应用**
   ```
   http://localhost:3000
   ```

## ⚠️ 常见配置错误

### 错误1：API Key格式错误
```
症状：启动后提示"API Key无效"
解决：检查API Key是否完整复制，没有多余空格
```

### 错误2：模型ID错误
```
症状：调用失败，提示"模型不存在"
解决：确认模型ID与服务商控制台一致
```

### 错误3：默认服务商未配置
```
症状：启动失败，提示"未配置默认服务商"
解决：确保DEFAULT_PROVIDER对应的服务商已完整配置
```

### 错误4：端口被占用
```
症状：启动失败，提示"端口已被使用"
解决：修改PORT配置或关闭占用端口的程序
```

## 📞 获取帮助

如果配置过程中遇到问题：

1. 查看 [技术架构文档](./product_docs/02_技术架构与大模型配置.md)
2. 查看 [部署手册](./product_docs/04_本地部署手册_完整版.md)
3. 运行配置检查脚本：`node check-config.js`
4. 查看后端日志排查问题

## 🔐 安全建议

1. **不要提交.env文件到版本控制**
   - .env文件已在.gitignore中
   - 确保不要误提交包含密钥的文件

2. **定期更换API Key**
   - 建议每3-6个月更换一次
   - 发现泄露立即更换

3. **限制访问权限**
   - 生产环境启用授权码
   - 配置合理的限流策略

4. **监控使用情况**
   - 定期检查API调用量
   - 关注异常调用模式

---

**配置完成后，请运行 `node check-config.js` 验证配置！**
