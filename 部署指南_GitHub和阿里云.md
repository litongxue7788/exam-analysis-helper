# 部署指南：GitHub + 阿里云

**日期**: 2026-01-12  
**目标**: 将项目同步到GitHub并部署到阿里云服务器

---

## 📋 部署前检查清单

### 本地检查
- [ ] 所有代码已提交到本地Git
- [ ] 所有测试通过
- [ ] 环境变量已配置
- [ ] 依赖包已安装
- [ ] 构建成功

### 服务器信息
- **服务器IP**: 172.16.0.196
- **操作系统**: Ubuntu 22.04.1 LTS
- **已有项目**: 是（上一个版本）
- **GitHub仓库**: https://github.com/litongxue7788/exam-analysis-helper

---

## 第一步：同步到GitHub

### 1.1 检查Git状态

```bash
# 查看当前状态
git status

# 查看远程仓库
git remote -v
```

### 1.2 添加所有更改

```bash
# 添加所有文件
git add .

# 查看将要提交的文件
git status
```

### 1.3 提交更改

```bash
# 提交更改（包含详细说明）
git commit -m "✨ P2移动端优化完成

主要更新:
- ✅ 修复反馈按钮z-index问题
- ✅ 添加移动端响应式布局
- ✅ 实现相机拍照上传功能
- ✅ 添加图片压缩功能
- ✅ 优化移动端样式
- ✅ 添加PWA支持
- ✅ 添加设备检测工具

技术改进:
- 新增 deviceDetection.ts 设备检测
- 新增 imageCompression.ts 图片压缩
- 新增 CameraCapture 组件
- 新增 mobile.css 移动端样式
- 更新 index.html 添加移动端meta标签
- 添加 manifest.json PWA配置

文档:
- P2_MOBILE_OPTIMIZATION_PLAN.md
- 部署指南_GitHub和阿里云.md
- 问题诊断_进度条和反馈按钮.md
"
```

### 1.4 推送到GitHub

```bash
# 如果是第一次推送到新仓库
git remote add origin https://github.com/litongxue7788/exam-analysis-helper.git

# 推送到main分支
git push -u origin main

# 如果已经有远程仓库，直接推送
git push
```

### 1.5 验证推送成功

访问 https://github.com/litongxue7788/exam-analysis-helper 确认代码已更新

---

## 第二步：连接到阿里云服务器

### 2.1 SSH连接

```bash
# 从本地连接到服务器
ssh root@172.16.0.196

# 或者使用公网IP（如果有）
ssh root@<公网IP>
```

### 2.2 检查服务器环境

```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version

# 检查PM2（进程管理器）
pm2 --version

# 如果没有PM2，安装它
npm install -g pm2
```

---

## 第三步：部署到阿里云

### 3.1 备份旧版本

```bash
# 进入项目目录
cd /path/to/exam-analysis-helper

# 备份旧版本
cd ..
cp -r exam-analysis-helper exam-analysis-helper-backup-$(date +%Y%m%d)

# 或者使用tar压缩
tar -czf exam-analysis-helper-backup-$(date +%Y%m%d).tar.gz exam-analysis-helper
```

### 3.2 拉取最新代码

```bash
# 进入项目目录
cd exam-analysis-helper

# 拉取最新代码
git pull origin main

# 如果是第一次部署，克隆仓库
# cd /path/to/projects
# git clone https://github.com/litongxue7788/exam-analysis-helper.git
# cd exam-analysis-helper
```

### 3.3 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend/web
npm install
```

### 3.4 配置环境变量

```bash
# 复制环境变量模板
cd ../../backend
cp .env.example .env

# 编辑环境变量
nano .env
# 或
vim .env
```

**必需的环境变量**:
```env
# LLM API配置
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_MODEL=ep-20251213192114-5xdhk

ALIYUN_API_KEY=your_aliyun_api_key
ALIYUN_MODEL=qwen-plus

ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_MODEL=glm-4-plus

# 服务器配置
PORT=3002
NODE_ENV=production

# 其他配置
MAX_CONCURRENT_JOBS=2
JOB_TTL_MS=7200000
IMAGE_ANALYZE_CACHE_TTL_MS=604800000
```

### 3.5 构建前端

```bash
# 进入前端目录
cd ../frontend/web

# 构建生产版本
npm run build

# 构建完成后，dist目录包含静态文件
ls -la dist/
```

### 3.6 启动后端服务

```bash
# 进入后端目录
cd ../../backend

# 使用PM2启动（推荐）
pm2 start npm --name "exam-analysis-backend" -- run dev

# 或者使用PM2启动生产模式
pm2 start npm --name "exam-analysis-backend" -- start

# 查看PM2进程
pm2 list

# 查看日志
pm2 logs exam-analysis-backend

# 保存PM2配置（开机自启）
pm2 save
pm2 startup
```

### 3.7 配置Nginx（如果使用）

```bash
# 编辑Nginx配置
sudo nano /etc/nginx/sites-available/exam-analysis

# 添加以下配置
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP

    # 前端静态文件
    location / {
        root /path/to/exam-analysis-helper/frontend/web/dist;
        try_files $uri $uri/ /index.html;
        
        # 移动端优化
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
        gzip_min_length 1000;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # SSE支持
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /path/to/exam-analysis-helper/frontend/web/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/exam-analysis /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

---

## 第四步：验证部署

### 4.1 检查后端服务

```bash
# 检查PM2进程
pm2 list

# 查看日志
pm2 logs exam-analysis-backend --lines 50

# 测试API
curl http://localhost:3002/health
```

### 4.2 检查前端访问

```bash
# 在服务器上测试
curl http://localhost

# 从本地浏览器访问
# http://172.16.0.196
# 或 http://your-domain.com
```

### 4.3 测试移动端

1. 在手机浏览器打开网站
2. 测试拖拽上传
3. 测试拍照上传
4. 测试响应式布局
5. 测试PWA安装

---

## 第五步：监控和维护

### 5.1 设置监控

```bash
# PM2监控
pm2 monit

# 查看资源使用
pm2 status

# 查看详细信息
pm2 show exam-analysis-backend
```

### 5.2 日志管理

```bash
# 查看实时日志
pm2 logs exam-analysis-backend

# 清空日志
pm2 flush

# 日志轮转
pm2 install pm2-logrotate
```

### 5.3 自动重启

```bash
# 监听文件变化自动重启
pm2 start npm --name "exam-analysis-backend" --watch -- run dev

# 内存超限自动重启
pm2 start npm --name "exam-analysis-backend" --max-memory-restart 500M -- run dev
```

---

## 常见问题

### Q1: 推送到GitHub失败

**问题**: `Permission denied (publickey)`

**解决**:
```bash
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到GitHub
cat ~/.ssh/id_ed25519.pub
# 复制输出，添加到 GitHub Settings > SSH Keys
```

### Q2: 服务器连接失败

**问题**: `Connection refused`

**解决**:
1. 检查服务器IP是否正确
2. 检查防火墙设置
3. 检查SSH服务是否运行

### Q3: 端口被占用

**问题**: `Port 3002 is already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3002

# 杀死进程
kill -9 <PID>

# 或者更改端口
# 修改 backend/.env 中的 PORT
```

### Q4: 前端构建失败

**问题**: `Build failed`

**解决**:
```bash
# 清除缓存
rm -rf node_modules package-lock.json
npm install

# 检查Node版本
node --version  # 需要 >= 16

# 更新Node（如果需要）
nvm install 18
nvm use 18
```

### Q5: Nginx配置错误

**问题**: `nginx: configuration file test failed`

**解决**:
```bash
# 检查配置语法
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 快速命令参考

### Git命令
```bash
git status                    # 查看状态
git add .                     # 添加所有文件
git commit -m "message"       # 提交
git push                      # 推送
git pull                      # 拉取
```

### PM2命令
```bash
pm2 list                      # 列出进程
pm2 start <app>               # 启动
pm2 stop <app>                # 停止
pm2 restart <app>             # 重启
pm2 delete <app>              # 删除
pm2 logs <app>                # 查看日志
pm2 monit                     # 监控
```

### Nginx命令
```bash
sudo nginx -t                 # 测试配置
sudo systemctl start nginx    # 启动
sudo systemctl stop nginx     # 停止
sudo systemctl restart nginx  # 重启
sudo systemctl status nginx   # 状态
```

---

## 下一步

部署完成后：
1. ✅ 测试所有功能
2. ✅ 配置HTTPS（使用Let's Encrypt）
3. ✅ 设置备份策略
4. ✅ 配置监控告警
5. ✅ 优化性能（CDN、缓存等）

---

**状态**: 准备就绪  
**预计时间**: 30-60分钟
