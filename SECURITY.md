# 安全指南

## ⚠️ 重要提醒

本项目包含敏感配置信息，请务必遵守以下安全规范。

## 敏感文件清单

以下文件包含敏感信息，**绝对不能**提交到Git仓库：

### 1. 环境变量文件
- `backend/.env` - 包含API密钥、访问口令、管理员密码
- `config/llm.json` - 大模型配置（如果使用）

### 2. 数据文件
- `data/` - 运行时数据
- `logs/` - 日志文件
- `backend/data/` - 后端数据

### 3. 其他敏感文件
- 任何包含真实API密钥的文件
- 任何包含真实访问口令的文件
- 任何包含用户数据的文件

## .gitignore 配置

项目已配置 `.gitignore` 来保护敏感文件：

```gitignore
# Environment variables (敏感信息)
.env
**/.env
**/.env.*
!**/.env.example

# Data directories (运行时数据)
data/
**/data/
logs/
**/logs/

# Local config (敏感信息)
config/llm.json
```

## 安全检查清单

### 提交代码前

- [ ] 检查是否包含真实API密钥
- [ ] 检查是否包含真实访问口令
- [ ] 检查是否包含管理员密码
- [ ] 检查是否包含用户数据
- [ ] 确认 `.env` 文件未被添加
- [ ] 确认文档中使用示例值而非真实值

### 部署到服务器前

- [ ] 服务器 `.env` 文件权限设置为 `600`
- [ ] 使用强密码
- [ ] 定期更换API密钥
- [ ] 定期更换访问口令
- [ ] 启用防火墙
- [ ] 配置HTTPS

### 文档编写规范

- [ ] 使用占位符代替真实值
  - ✅ `DOUBAO_API_KEY=your_api_key_here`
  - ❌ `DOUBAO_API_KEY=fbfcd4c1-5a80-4107-917f-6b0cebb68bbe`
  
- [ ] 使用示例格式而非真实数据
  - ✅ `TRIAL_ACCESS_CODES=PREFIX-T01-XXXXXX,PREFIX-T02-YYYYYY`
  - ❌ `TRIAL_ACCESS_CODES=SX-T01-739184,SX-T02-582961`

- [ ] 添加安全警告
  - ✅ `⚠️ 重要：不要在文档中暴露真实口令！`

## 如果不小心泄露了敏感信息

### 立即行动

1. **撤销提交**
```bash
# 撤销最后一次提交
git reset --hard HEAD~1

# 强制推送（覆盖远程仓库）
git push origin main --force
```

2. **更换所有泄露的凭证**
- 立即更换API密钥
- 立即更换访问口令
- 立即更换管理员密码

3. **通知相关人员**
- 通知团队成员
- 通知使用该服务的用户
- 记录安全事件

### 清理Git历史

如果敏感信息已经在多个提交中：

```bash
# 使用 git filter-branch 清理历史
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送
git push origin --force --all
```

⚠️ **注意**：这会重写Git历史，影响所有协作者。

## API密钥管理

### 豆包 (Doubao)
- 在火山引擎控制台生成
- 定期轮换（建议每3个月）
- 限制IP访问（如果支持）

### 阿里云 (Aliyun)
- 在阿里云控制台生成
- 使用RAM子账号（最小权限原则）
- 启用访问控制

### 智谱 (ZhipuAI)
- 在智谱AI控制台生成
- 监控使用量
- 设置配额限制

## 访问口令管理

### 生成安全口令

```bash
# 使用随机字符串生成器
openssl rand -base64 12

# 或使用自定义格式
echo "PREFIX-T$(date +%m)-$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]')"
```

### 口令分配策略

- 为不同用户/组织分配不同口令
- 记录口令分配情况（在安全的地方）
- 定期审计口令使用情况
- 及时禁用不再使用的口令

### 口令存储

- 不要在代码中硬编码
- 不要在文档中明文记录
- 使用密码管理器（如1Password、LastPass）
- 服务器上使用环境变量

## 服务器安全

### 文件权限

```bash
# .env文件权限
chmod 600 backend/.env

# 数据目录权限
chmod 700 data/

# 日志目录权限
chmod 700 logs/
```

### 防火墙配置

```bash
# 只允许必要的端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### SSH安全

```bash
# 禁用密码登录，只使用密钥
# 编辑 /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes

# 重启SSH服务
systemctl restart sshd
```

## 监控和审计

### 日志监控

- 定期检查访问日志
- 监控异常请求
- 设置告警规则

### 配额监控

- 监控API使用量
- 监控口令使用情况
- 设置配额告警

## 应急响应

### 发现安全问题

1. 立即评估影响范围
2. 采取紧急措施（更换凭证、禁用访问）
3. 通知相关人员
4. 记录事件详情
5. 制定预防措施

### 联系方式

- GitHub Issues: https://github.com/litongxue7788/exam-analysis-helper/issues
- 安全问题请使用私密方式报告

## 合规要求

### 数据保护

- 遵守GDPR/个人信息保护法
- 不收集不必要的用户数据
- 定期清理过期数据
- 提供数据导出/删除功能

### 访问控制

- 实施最小权限原则
- 定期审查访问权限
- 记录敏感操作日志

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**最后更新**: 2026-01-13  
**维护者**: 安全团队
