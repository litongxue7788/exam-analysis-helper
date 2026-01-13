# 任务5: 实时进度反馈 - 实施计划

## 📋 任务概述

**目标**: 增强进度显示，实时显示识别结果和置信度

**当前状态**: Report页面已有基础进度显示（lines 1573-1640），但缺少识别信息的实时更新

**需要实现**:
- 在进度横幅中实时显示识别的年级、学科和置信度
- 优化阶段显示，添加图标
- 改进预计时间显示
- 保持现有的SSE实时更新机制

---

## 🎯 实施方案

### 方案选择: 增强现有进度横幅

**理由**:
- Report页面已有完善的SSE实时更新机制（lines 500-641）
- 已有进度横幅UI（lines 1573-1640）
- 只需增强显示内容，无需重构

**优势**:
- 最小化改动
- 复用现有SSE连接
- 保持代码一致性

---

## 📝 实施步骤

### Step 1: 添加识别结果状态管理

在 Report.tsx 中添加状态：

```typescript
// 在 line 335 附近添加
const [recognitionInfo, setRecognitionInfo] = useState<{
  grade?: string;
  subject?: string;
  confidence?: number;
  confidenceLevel?: 'high' | 'medium' | 'low' | 'very-low';
} | null>(null);
```

---

### Step 2: 在SSE事件处理中更新识别信息

修改 `useEffect` 中的SSE事件处理（lines 500-641）：

```typescript
// 在 snapshot 事件处理中添加（line 560附近）
if (t === 'snapshot') {
  const job = payload?.job || {};
  setLoadingState(String(job?.status || ''), String(job?.stage || ''), String(job?.errorMessage || ''));
  
  // ✅ 新增: 更新识别信息
  if (job?.recognition) {
    setRecognitionInfo({
      grade: job.recognition.grade,
      subject: job.recognition.subject,
      confidence: job.recognition.confidence,
      confidenceLevel: job.recognition.confidenceLevel,
    });
  }
  
  // ... 其他代码
}

// 在 progress 事件处理中添加（line 584附近）
if (t === 'progress') {
  const status = jobStatusRef.current || 'running';
  setLoadingState(status, String(payload?.stage || ''), String(payload?.message || ''));
  
  // ✅ 新增: 更新识别信息
  if (payload?.recognition) {
    setRecognitionInfo({
      grade: payload.recognition.grade,
      subject: payload.recognition.subject,
      confidence: payload.recognition.confidence,
      confidenceLevel: payload.recognition.confidenceLevel,
    });
  }
  
  return;
}
```

---

### Step 3: 增强进度横幅UI

修改进度横幅（lines 1573-1640），添加识别信息显示：

```typescript
{jobId && jobStatus !== 'completed' && jobStatus !== 'failed' && jobStatus !== 'canceled' && (
  <div
    style={{
      position: 'fixed',
      top: 12,
      left: 12,
      right: 12,
      zIndex: 200,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(148,163,184,0.55)',
      borderRadius: 12,
      padding: '10px 12px',
      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 阶段显示 */}
      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
        {getStageIcon(jobStage)} {getStageText(jobStage)}
      </div>
      
      {/* ✅ 新增: 识别信息显示 */}
      {recognitionInfo && (
        <div style={{ 
          fontSize: 12, 
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>
            识别结果: {recognitionInfo.grade} · {recognitionInfo.subject}
          </span>
          {recognitionInfo.confidence !== undefined && (
            <span style={{
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              ...getConfidenceBadgeStyle(recognitionInfo.confidenceLevel),
            }}>
              {getConfidenceText(recognitionInfo.confidence)}
            </span>
          )}
        </div>
      )}
      
      {/* 预计时间和其他信息 */}
      <div style={{ fontSize: 12, color: '#64748b' }}>
        {jobMessage ||
          [
            jobImageCount ? `共 ${jobImageCount} 页` : '',
            estimateSeconds ? `预计 ${Math.max(30, Math.round(estimateSeconds / 10) * 10)} 秒左右` : '',
            isPolling ? '连接不稳定，已切到轮询' : '',
          ]
            .filter(Boolean)
            .join(' · ') ||
          '请保持页面打开，完成后会自动刷新内容'}
      </div>
    </div>
    
    {/* 操作按钮 */}
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="op-btn-secondary"
        onClick={() => {
          try {
            navigator.clipboard?.writeText(jobId);
            showToast('已复制 jobId');
          } catch {
            showToast(`jobId：${jobId}`);
          }
        }}
      >
        复制jobId
      </button>
      <button className="op-btn-secondary" onClick={cancelJob} disabled={canceling}>
        {canceling ? '取消中…' : '取消'}
      </button>
    </div>
  </div>
)}
```

---

### Step 4: 添加辅助函数

在 Report.tsx 中添加辅助函数（在组件内部，line 200附近）：

```typescript
// 阶段图标映射
const getStageIcon = (stage: string) => {
  switch (stage) {
    case 'queued': return '⏳';
    case 'extracting': return '🔍';
    case 'diagnosing': return '🧠';
    case 'practicing': return '📝';
    case 'merging': return '📊';
    default: return '⚙️';
  }
};

// 阶段文本映射
const getStageText = (stage: string) => {
  switch (stage) {
    case 'queued': return '排队中…';
    case 'extracting': return '正在提取关键信息…';
    case 'diagnosing': return '正在生成核心结论…';
    case 'practicing': return '正在生成训练与验收…';
    case 'merging': return '正在整合报告…';
    default: return '正在分析中…';
  }
};

// 置信度徽章样式
const getConfidenceBadgeStyle = (level?: string) => {
  switch (level) {
    case 'high':
      return { background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9' };
    case 'medium':
      return { background: '#FFF8E1', color: '#FF8F00', border: '1px solid #FFE082' };
    case 'low':
    case 'very-low':
      return { background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' };
    default:
      return { background: '#F5F5F5', color: '#666', border: '1px solid #eee' };
  }
};

// 置信度文本
const getConfidenceText = (confidence: number) => {
  const percent = Math.round(confidence * 100);
  return `置信度 ${percent}%`;
};
```

---

## 🔍 后端验证

需要确认后端SSE事件是否包含识别信息：

### 检查点 1: snapshot 事件
```typescript
// backend/server.ts 中的 snapshot 事件应该包含:
{
  type: 'snapshot',
  job: {
    id: string,
    status: string,
    stage: string,
    recognition?: {  // ✅ 需要确认
      grade: string,
      subject: string,
      confidence: number,
      confidenceLevel: string,
    }
  }
}
```

### 检查点 2: progress 事件
```typescript
// backend/server.ts 中的 progress 事件应该包含:
{
  type: 'progress',
  stage: string,
  message: string,
  recognition?: {  // ✅ 需要确认
    grade: string,
    subject: string,
    confidence: number,
    confidenceLevel: string,
  }
}
```

**如果后端不包含识别信息**，需要修改后端代码添加识别信息到SSE事件。

---

## ✅ 测试计划

### 功能测试
1. **识别信息显示**
   - [ ] 上传图片后，进度横幅显示识别的年级和学科
   - [ ] 置信度徽章正确显示（高/中/低）
   - [ ] 识别信息实时更新

2. **阶段显示**
   - [ ] 各阶段图标正确显示
   - [ ] 阶段文本正确显示
   - [ ] 阶段切换流畅

3. **预计时间**
   - [ ] 预计时间正确计算
   - [ ] 时间显示格式正确

### 视觉测试
- [ ] 进度横幅布局合理
- [ ] 识别信息不遮挡其他内容
- [ ] 置信度徽章颜色清晰
- [ ] 移动端适配良好

### 性能测试
- [ ] SSE连接稳定
- [ ] 进度更新延迟 < 1秒
- [ ] 无内存泄漏

---

## 📊 预期效果

完成后，用户将看到：

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 正在提取关键信息…                                      │
│ 识别结果: 七年级 · 数学  [置信度 85%]                     │
│ 共 3 页 · 预计 90 秒左右                                  │
│                                    [复制jobId] [取消]    │
└─────────────────────────────────────────────────────────┘
```

**用户体验提升**:
- ✅ 实时看到识别结果
- ✅ 了解当前分析阶段
- ✅ 知道预计剩余时间
- ✅ 增强信任感和透明度

---

## 🚨 注意事项

1. **后端兼容性**: 需要确认后端SSE事件包含识别信息
2. **性能影响**: 识别信息更新不应影响SSE性能
3. **错误处理**: 识别信息缺失时不应崩溃
4. **移动端适配**: 确保在小屏幕上显示良好

---

## 📝 实施检查清单

- [ ] 添加 `recognitionInfo` 状态
- [ ] 修改 SSE 事件处理，更新识别信息
- [ ] 增强进度横幅UI，显示识别信息
- [ ] 添加辅助函数（图标、文本、样式）
- [ ] 验证后端SSE事件包含识别信息
- [ ] 测试识别信息实时更新
- [ ] 测试各阶段显示
- [ ] 测试置信度徽章
- [ ] 测试移动端适配
- [ ] 更新文档

---

**文档版本**: 1.0  
**创建日期**: 2026-01-12  
**预计时间**: 2小时  
**状态**: 待实施
