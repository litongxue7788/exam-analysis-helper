# 任务6: 优化错误处理 - 实施计划

## 📋 任务概述

**目标**: 优化错误处理，提供友好的错误提示和自动重试机制

**当前状态**: 
- Home.tsx已有基础错误处理（lines 1008-1053）
- Report.tsx已有取消和重试功能（lines 700-752）
- 需要增强错误提示的友好性和自动重试机制

**需要实现**:
1. 更友好的错误提示（具体原因+解决方案）
2. 自动重试机制（网络错误自动重试3次）
3. 分析超时处理（显示选项）
4. 错误恢复流程优化

---

## 🎯 实施方案

### 方案选择: 增强现有错误处理

**理由**:
- Home.tsx已有详细的错误分类（网络、超时、权限、配额等）
- Report.tsx已有取消和重试功能
- 只需增强提示友好性和添加自动重试

**优势**:
- 最小化改动
- 复用现有逻辑
- 保持代码一致性

---

## 📝 实施步骤

### Step 1: 增强Home.tsx的错误提示

**目标**: 让错误提示更友好，提供具体的解决方案

#### 1.1 优化网络错误提示

**当前**:
```typescript
if (typeof navigator !== 'undefined' && !navigator.onLine) {
  showToast('分析失败：当前网络连接异常，请检查 Wi-Fi/数据网络后重试。');
  return;
}
```

**优化后**:
```typescript
if (typeof navigator !== 'undefined' && !navigator.onLine) {
  showToast('❌ 网络连接失败\n请检查您的网络连接后重试');
  return;
}
```

#### 1.2 优化超时错误提示

**当前**:
```typescript
if (String(error?.name || '') === 'AbortError') {
  showToast('分析超时：请减少图片数量或稍后重试。');
  return;
}
```

**优化后**:
```typescript
if (String(error?.name || '') === 'AbortError') {
  showToast('⏱️ 分析超时\n建议：减少图片数量或稍后重试');
  return;
}
```

#### 1.3 优化权限错误提示

**当前**:
```typescript
if (status === 401 || msg.includes('访问口令')) {
  showToast('访问口令错误或缺失：请在设置中填写正确的口令。');
  return;
}
```

**优化后**:
```typescript
if (status === 401 || msg.includes('访问口令')) {
  showToast('🔒 访问口令错误\n请在设置中填写正确的口令');
  return;
}
```

#### 1.4 优化配额错误提示

**当前**:
```typescript
if (code === 'DAILY_QUOTA_EXCEEDED' && resetAtRaw) {
  // ... 计算重置时间
  showToast(`今日使用额度已用完，将于 ${y}-${m}-${dd} ${hh}:${mm} 重置`);
  return;
}
showToast(msg || '请求过于频繁，请稍后再试。');
```

**优化后**:
```typescript
if (code === 'DAILY_QUOTA_EXCEEDED' && resetAtRaw) {
  // ... 计算重置时间
  showToast(`📊 今日额度已用完\n将于 ${y}-${m}-${dd} ${hh}:${mm} 重置`);
  return;
}
showToast('⚠️ 请求过于频繁\n请稍后再试');
```

#### 1.5 优化API配置错误提示

**当前**:
```typescript
if (msg.includes('API Key') || msg.includes('未配置')) {
  showToast('后端大模型配置异常（API Key 或模型未配置），请检查服务器环境或更换服务商。');
  return;
}
```

**优化后**:
```typescript
if (msg.includes('API Key') || msg.includes('未配置')) {
  showToast('⚙️ 服务配置异常\nAPI Key未配置，请联系管理员');
  return;
}
```

#### 1.6 优化通用错误提示

**当前**:
```typescript
showToast(msg || '分析失败，请稍后重试。');
```

**优化后**:
```typescript
showToast(`❌ 分析失败\n${msg || '请稍后重试'}`);
```

---

### Step 2: 添加自动重试机制

**目标**: 网络错误时自动重试3次

#### 2.1 添加重试状态管理

```typescript
const [retryCount, setRetryCount] = useState(0);
const [isRetrying, setIsRetrying] = useState(false);
const maxRetries = 3;
```

#### 2.2 实现自动重试函数

```typescript
const handleGenerateReportWithRetry = async (retryAttempt: number = 0) => {
  try {
    // 原有的分析逻辑
    await handleGenerateReport();
    setRetryCount(0); // 成功后重置重试计数
  } catch (error: any) {
    const isNetworkError = 
      !navigator.onLine || 
      error?.name === 'TypeError' || 
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Network');
    
    if (isNetworkError && retryAttempt < maxRetries) {
      setIsRetrying(true);
      setRetryCount(retryAttempt + 1);
      showToast(`🔄 网络错误，正在重试 (${retryAttempt + 1}/${maxRetries})...`);
      
      // 延迟重试（指数退避）
      const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return handleGenerateReportWithRetry(retryAttempt + 1);
    } else {
      setIsRetrying(false);
      setRetryCount(0);
      // 显示错误提示
      throw error;
    }
  }
};
```

#### 2.3 显示重试进度

```typescript
{isRetrying && (
  <div style={{
    position: 'fixed',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 200,
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(251,191,36,0.55)',
    borderRadius: 12,
    padding: '10px 12px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
  }}>
    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
      🔄 正在重试...
    </div>
    <div style={{ fontSize: 12, color: '#64748b' }}>
      第 {retryCount}/{maxRetries} 次重试
    </div>
  </div>
)}
```

---

### Step 3: 优化Report.tsx的错误处理

**目标**: 增强失败状态的显示和操作

#### 3.1 增强失败状态横幅

**当前** (lines 1640-1680):
```typescript
{jobId && (jobStatus === 'failed' || jobStatus === 'canceled') && (
  <div style={{...}}>
    <div style={{...}}>
      <div style={{...}}>
        {jobStatus === 'failed' ? '分析失败' : '已取消'}
      </div>
      <div style={{...}}>
        {jobMessage || (jobStatus === 'failed' ? '请重试或联系支持' : '您已取消分析')}
      </div>
    </div>
    <div style={{...}}>
      <button onClick={retryJob} disabled={retrying}>
        {retrying ? '重试中…' : '重试'}
      </button>
    </div>
  </div>
)}
```

**优化后**:
```typescript
{jobId && (jobStatus === 'failed' || jobStatus === 'canceled') && (
  <div style={{
    position: 'fixed',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 200,
    background: 'rgba(255,255,255,0.92)',
    border: `1px solid ${jobStatus === 'failed' ? 'rgba(239,68,68,0.35)' : 'rgba(148,163,184,0.35)'}`,
    borderRadius: 12,
    padding: '10px 12px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ 
        fontSize: 13, 
        color: jobStatus === 'failed' ? '#dc2626' : '#64748b', 
        fontWeight: 600 
      }}>
        {jobStatus === 'failed' ? '❌ 分析失败' : '⏹️ 已取消'}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        {jobMessage || (
          jobStatus === 'failed' 
            ? '可能是网络问题或服务异常，请重试' 
            : '您已取消分析，可以重新开始'
        )}
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      {jobStatus === 'failed' && (
        <button 
          className="op-btn-primary" 
          onClick={retryJob} 
          disabled={retrying}
        >
          {retrying ? '🔄 重试中…' : '🔄 重试'}
        </button>
      )}
      <button 
        className="op-btn-secondary" 
        onClick={onBack}
      >
        返回
      </button>
    </div>
  </div>
)}
```

---

### Step 4: 优化Toast组件

**目标**: 让Toast支持多行文本和图标

#### 4.1 增强Toast样式

**当前** (Home.tsx):
```typescript
{toastMsg && (
  <div className="toast-msg">{toastMsg}</div>
)}
```

**优化后**:
```typescript
{toastMsg && (
  <div 
    className="toast-msg"
    style={{
      whiteSpace: 'pre-line', // 支持换行
      textAlign: 'left',
      maxWidth: '90%',
      lineHeight: 1.5,
    }}
  >
    {toastMsg}
  </div>
)}
```

---

## 🎨 UI效果

### 错误提示示例

**网络错误**:
```
┌─────────────────────────────────┐
│ ❌ 网络连接失败                  │
│ 请检查您的网络连接后重试         │
└─────────────────────────────────┘
```

**超时错误**:
```
┌─────────────────────────────────┐
│ ⏱️ 分析超时                      │
│ 建议：减少图片数量或稍后重试     │
└─────────────────────────────────┘
```

**权限错误**:
```
┌─────────────────────────────────┐
│ 🔒 访问口令错误                  │
│ 请在设置中填写正确的口令         │
└─────────────────────────────────┘
```

**配额错误**:
```
┌─────────────────────────────────┐
│ 📊 今日额度已用完                │
│ 将于 2026-01-13 00:00 重置       │
└─────────────────────────────────┘
```

**自动重试**:
```
┌─────────────────────────────────┐
│ 🔄 正在重试...                   │
│ 第 2/3 次重试                    │
└─────────────────────────────────┘
```

**失败状态横幅**:
```
┌─────────────────────────────────────────┐
│ ❌ 分析失败                              │
│ 可能是网络问题或服务异常，请重试         │
│                        [🔄 重试] [返回]  │
└─────────────────────────────────────────┘
```

---

## ✅ 测试计划

### 功能测试
1. **网络错误**
   - [ ] 断网后上传图片，显示网络错误提示
   - [ ] 自动重试3次
   - [ ] 显示重试进度

2. **超时错误**
   - [ ] 模拟超时，显示超时提示
   - [ ] 提供重试选项

3. **权限错误**
   - [ ] 使用错误口令，显示权限错误提示
   - [ ] 提示用户在设置中修改

4. **配额错误**
   - [ ] 超出配额，显示配额错误提示
   - [ ] 显示重置时间

5. **失败状态**
   - [ ] 分析失败后显示失败横幅
   - [ ] 重试按钮可用
   - [ ] 返回按钮可用

### 视觉测试
- [ ] Toast支持多行文本
- [ ] Toast图标清晰
- [ ] 失败横幅布局合理
- [ ] 重试进度显示清晰

### 性能测试
- [ ] 自动重试不阻塞UI
- [ ] 重试延迟合理（指数退避）
- [ ] 无内存泄漏

---

## 📊 预期效果

### 优化前
- 错误提示冗长，不易理解
- 无自动重试机制
- 失败后操作不明确

### 优化后
- ✅ 错误提示简洁明了（图标+原因+解决方案）
- ✅ 网络错误自动重试3次
- ✅ 失败后提供明确的操作选项
- ✅ 用户体验更友好

---

## 🚨 注意事项

1. **重试策略**: 只对网络错误自动重试，其他错误需要用户手动处理
2. **重试延迟**: 使用指数退避（1s, 2s, 4s），避免频繁请求
3. **用户反馈**: 重试时显示进度，让用户知道系统在工作
4. **错误分类**: 准确识别错误类型，提供针对性的解决方案

---

## 📝 实施检查清单

- [ ] 优化Home.tsx的错误提示（添加图标和换行）
- [ ] 添加自动重试机制（网络错误）
- [ ] 添加重试状态管理
- [ ] 添加重试进度显示
- [ ] 优化Report.tsx的失败状态横幅
- [ ] 增强Toast组件（支持多行）
- [ ] 测试各种错误场景
- [ ] 测试自动重试
- [ ] 测试失败状态操作
- [ ] 更新文档

---

**文档版本**: 1.0  
**创建日期**: 2026-01-12  
**预计时间**: 2小时  
**状态**: 待实施
