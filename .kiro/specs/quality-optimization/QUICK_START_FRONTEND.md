# 前端集成快速启动指南 🚀

## 📋 准备工作

### 1. 确认后端 API 可用
```bash
# 测试后端服务
curl http://localhost:3002/api/health

# 测试 SSE 事件
curl http://localhost:3002/api/analyze-images/jobs/{jobId}/events
```

### 2. 检查前端环境
```bash
cd frontend/web
npm install
npm run dev
```

### 3. 查看现有组件
- `src/pages/Home.tsx` - 上传页面
- `src/pages/Report.tsx` - 报告页面
- `src/components/` - 组件库
- `src/utils/` - 工具函数

---

## 🎯 第1天: 渐进式加载动画

### 步骤 1: 创建进度条组件

创建文件: `frontend/web/src/components/ProgressiveLoadingBar.tsx`

```tsx
import React from 'react';
import './ProgressiveLoadingBar.css';

interface Stage {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProgressiveLoadingBarProps {
  currentStage: string;
  progress: number;
  estimatedTime: number;
}

export const ProgressiveLoadingBar: React.FC<ProgressiveLoadingBarProps> = ({
  currentStage,
  progress,
  estimatedTime
}) => {
  const stages: Stage[] = [
    { id: 'extracting', label: '识别中', icon: '🔍', status: 'pending' },
    { id: 'diagnosing', label: '分析中', icon: '🧠', status: 'pending' },
    { id: 'practicing', label: '生成练习', icon: '📝', status: 'pending' },
    { id: 'completed', label: '完成', icon: '✅', status: 'pending' }
  ];

  // 更新阶段状态
  const updatedStages = stages.map(stage => {
    const stageIndex = stages.findIndex(s => s.id === stage.id);
    const currentIndex = stages.findIndex(s => s.id === currentStage);
    
    if (stageIndex < currentIndex) {
      return { ...stage, status: 'completed' as const };
    } else if (stageIndex === currentIndex) {
      return { ...stage, status: 'active' as const };
    }
    return stage;
  });

  const getStageText = (stage: string) => {
    const texts: Record<string, string> = {
      extracting: '正在识别试卷内容...',
      diagnosing: '正在分析错因和知识点...',
      practicing: '正在生成练习题...',
      completed: '分析完成！'
    };
    return texts[stage] || '正在处理...';
  };

  return (
    <div className="progressive-loading">
      {/* 顶部状态栏 */}
      <div className="loading-header">
        <div className="loading-icon pulse">
          {updatedStages.find(s => s.id === currentStage)?.icon || '⚙️'}
        </div>
        <div className="loading-text">{getStageText(currentStage)}</div>
        <div className="loading-time">
          预计剩余 <span className="time-number">{estimatedTime}</span> 秒
        </div>
      </div>

      {/* 进度条 */}
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        >
          <div className="progress-shimmer" />
        </div>
      </div>

      {/* 阶段指示器 */}
      <div className="stage-indicators">
        {updatedStages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div className={`stage-dot ${stage.status}`}>
              <span className="stage-icon">{stage.icon}</span>
              <span className="stage-label">{stage.label}</span>
            </div>
            {index < updatedStages.length - 1 && (
              <div className={`stage-line ${stage.status === 'completed' ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
```

### 步骤 2: 创建样式文件

创建文件: `frontend/web/src/components/ProgressiveLoadingBar.css`

```css
.progressive-loading {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin: 20px;
}

.loading-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.loading-icon {
  font-size: 24px;
}

.loading-icon.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.loading-text {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.loading-time {
  font-size: 13px;
  color: #64748b;
}

.time-number {
  font-weight: 700;
  color: #2563eb;
}

/* 进度条 */
.progress-track {
  height: 8px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 20px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  border-radius: 999px;
  position: relative;
  transition: width 0.3s ease;
}

.progress-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 阶段指示器 */
.stage-indicators {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stage-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stage-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stage-dot.active .stage-icon {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  border-color: #2563eb;
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.stage-dot.completed .stage-icon {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.stage-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.stage-dot.active .stage-label {
  color: #2563eb;
}

.stage-dot.completed .stage-label {
  color: #10b981;
}

.stage-line {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 8px;
  transition: background 0.3s ease;
}

.stage-line.completed {
  background: #10b981;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .progressive-loading {
    padding: 16px;
    margin: 16px;
  }

  .loading-header {
    flex-wrap: wrap;
  }

  .loading-time {
    width: 100%;
    text-align: center;
    margin-top: 8px;
  }

  .stage-label {
    font-size: 10px;
  }

  .stage-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
```

### 步骤 3: 集成到 Report 页面

在 `frontend/web/src/pages/Report.tsx` 中添加：

```tsx
import { ProgressiveLoadingBar } from '../components/ProgressiveLoadingBar';

// 在组件中添加状态
const [loadingStage, setLoadingStage] = useState('extracting');
const [loadingProgress, setLoadingProgress] = useState(0);
const [estimatedTime, setEstimatedTime] = useState(60);

// 在 SSE 事件处理中更新状态
es.onmessage = (evt) => {
  const payload = JSON.parse(evt.data);
  
  if (payload.type === 'progress') {
    setLoadingStage(payload.stage);
    setLoadingProgress(payload.progress || 0);
    setEstimatedTime(payload.estimatedTime || 60);
  }
};

// 在渲染中使用
{jobStatus !== 'completed' && (
  <ProgressiveLoadingBar
    currentStage={loadingStage}
    progress={loadingProgress}
    estimatedTime={estimatedTime}
  />
)}
```

### 步骤 4: 测试

1. 启动后端服务
2. 启动前端服务
3. 上传图片开始分析
4. 观察进度条动画

---

## 🎨 第2天: 置信度徽章

### 快速实现

创建文件: `frontend/web/src/components/ConfidenceBadge.tsx`

```tsx
import React from 'react';
import './ConfidenceBadge.css';

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low' | 'very-low';
  confidence: number;
  showDetails?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  confidence,
  showDetails = false
}) => {
  const config = {
    high: { icon: '✓', label: '高置信度', color: '#10b981' },
    medium: { icon: '!', label: '中等置信度', color: '#f59e0b' },
    low: { icon: '⚠', label: '低置信度', color: '#ef4444' },
    'very-low': { icon: '⚠', label: '极低置信度', color: '#dc2626' }
  };

  const { icon, label, color } = config[level];
  const percentage = Math.round(confidence * 100);

  return (
    <div className={`confidence-badge confidence-${level}`}>
      <span className="badge-icon">{icon}</span>
      <span className="badge-label">{label}</span>
      <span className="badge-percentage">{percentage}%</span>
      
      {showDetails && (
        <div className="badge-tooltip">
          <p>置信度：{percentage}%</p>
          <p className="tooltip-hint">
            {level === 'high' && '识别结果可靠'}
            {level === 'medium' && '建议人工确认'}
            {level === 'low' && '建议重新拍照'}
            {level === 'very-low' && '强烈建议重新拍照'}
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## 📝 开发检查清单

### 每日检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 组件在移动端和桌面端都正常显示
- [ ] 动画流畅（60fps）
- [ ] 无控制台错误
- [ ] 代码已提交到 Git

### 集成检查
- [ ] 后端 API 调用成功
- [ ] SSE 事件正确接收
- [ ] 状态更新及时
- [ ] 错误处理完善
- [ ] 用户体验流畅

---

## 🐛 常见问题

### Q: SSE 连接失败？
A: 检查后端服务是否运行，CORS 配置是否正确

### Q: 动画卡顿？
A: 使用 transform 和 opacity，避免触发 layout

### Q: 样式不生效？
A: 检查 CSS 文件是否正确导入，类名是否正确

### Q: TypeScript 报错？
A: 检查类型定义，确保 props 类型正确

---

## 📚 参考资源

- [React 文档](https://react.dev/)
- [CSS 动画指南](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [SSE 规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [设计系统](https://www.figma.com/community)

---

**开始你的前端开发之旅吧！** 🚀✨
