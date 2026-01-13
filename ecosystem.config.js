// PM2 生产环境配置文件
module.exports = {
  apps: [{
    name: 'exam-analysis-backend',
    script: 'backend/server.js',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 自动重启配置
    min_uptime: '10s',
    max_restarts: 10,
    // 内存监控
    max_memory_restart: '500M',
    // 健康检查
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
};