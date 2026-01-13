# 试卷分析系统 - 新增功能API文档

## 📋 文档概述

本文档描述了质量优化项目中新增的后端功能和API接口变更，供前端团队对接使用。

**版本**: v2.0  
**更新日期**: 2026年1月12日  
**状态**: 已完成并测试通过

---

## 🆕 新增API接口

### 1. 用户反馈接口

#### POST /api/feedback
提交用户反馈

**请求体**:
```typescript
{
  type: 'accuracy' | 'quality' | 'suggestion' | 'bug' | 'other';  // 反馈类型
  rating?: number;        // 评分 (1-5)
  comment?: string;       // 反馈内容
  context?: {            // 上下文信息（可选）
    analysisId?: string;
    examName?: string;
    [key: string]: any;
  };
}
```

**响应**:
```typescript
{
  success: true;
  feedbackId: string;     // 反馈ID
  timestamp: string;      // 提交时间
}
```

**示例**:
```javascript
const response = await fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'accuracy',
    rating: 5,
    comment: '分析很准确，帮助很大！',
    context: {
      analysisId: 'abc123',
      examName: '七年级数学期中考试'
    }
  })
});
```

---

#### GET /api/feedback/summary
获取反馈摘要（管理员用）

**响应**:
```typescript
{
  success: true;
  summary: {
    totalCount: number;           // 总反馈数
    averageRating: number;        // 平均评分
    byType: {                     // 按类型统计
      [type: string]: number;
    };
    byRating: {                   // 按评分统计
      [rating: string]: number;
    };
    recentFeedbacks: Array<{      // 最近反馈
      id: string;
      type: string;
      rating?: number;
      comment?: string;
      timestamp: string;
    }>;
  };
}
```

---

## 📊 现有API接口的扩展字段

### 1. /api/analyze-exam 和 /api/analyze-images

这两个接口的响应中新增了以下字段：

#### 低置信度警告
```typescript
{
  data: {
    lowConfidenceWarning?: {
      hasWarning: boolean;                    // 是否有警告
      level: 'none' | 'low' | 'medium' | 'high';  // 警告级别
      message: string;                        // 警告消息
      suggestions: string[];                  // 改进建议
      affectedItems: string[];                // 受影响的项目
    };
  }
}
```

**警告级别说明**:
- `none`: 置信度≥80%，无警告
- `low`: 置信度70-80%，建议核对
- `medium`: 置信度60-70%，建议重新拍照
- `high`: 置信度<60%，强烈建议重新拍照或人工确认

**前端展示建议**:
```javascript
if (response.data.lowConfidenceWarning?.hasWarning) {
  const { level, message, suggestions } = response.data.lowConfidenceWarning;
  
  // 根据级别显示不同颜色的警告
  const color = {
    low: 'yellow',
    medium: 'orange',
    high: 'red'
  }[level];
  
  // 显示警告消息和建议
  showWarning(message, suggestions, color);
}
```

---

#### 证据来源追溯
```typescript
{
  data: {
    evidenceSourceTracking?: {
      totalImages: number;                    // 总图片数
      analysisMethod: 'batch' | 'individual'; // 分析方法
      trackingEnabled: boolean;               // 是否启用追溯
      sources: Array<{
        problemIndex: number;                 // 问题索引
        imageIndex?: number;                  // 来源图片索引（0-based）
        imageCount: number;                   // 总图片数
        confidence: string;                   // 置信度
        canViewOriginal: boolean;             // 是否可查看原图
      }>;
    };
  }
}
```

**前端展示建议**:
```javascript
// 在每个错因旁边显示"查看原图"按钮
response.data.evidenceSourceTracking?.sources.forEach((source, index) => {
  if (source.canViewOriginal && source.imageIndex !== undefined) {
    // 显示"查看第 X 张图片"按钮
    const button = createButton(`查看第 ${source.imageIndex + 1} 张图片`);
    button.onclick = () => showImage(source.imageIndex);
  }
});
```

---

#### 质量指标
```typescript
{
  qualityMetrics?: {
    recognitionConfidence: number;    // 识别置信度 (0-1)
    analysisConfidence: number;       // 分析置信度 (0-1)
    evidenceCompleteness: number;     // 证据完整性 (0-1)
    contentReadability: number;       // 内容可读性 (0-1)
    overallScore: number;             // 总体质量分数 (0-100)
  };
}
```

**前端展示建议**:
```javascript
// 显示质量指标仪表盘
const metrics = response.qualityMetrics;
if (metrics) {
  showQualityDashboard({
    '识别准确度': `${(metrics.recognitionConfidence * 100).toFixed(0)}%`,
    '分析准确度': `${(metrics.analysisConfidence * 100).toFixed(0)}%`,
    '证据完整性': `${(metrics.evidenceCompleteness * 100).toFixed(0)}%`,
    '内容可读性': `${(metrics.contentReadability * 100).toFixed(0)}%`,
    '总体评分': `${metrics.overallScore}/100`
  });
}
```

---

## 🔄 SSE事件流增强

### /api/analyze-images/stream/:jobId

SSE事件流新增了以下事件类型：

#### 1. progress 事件（增强）
```typescript
{
  type: 'progress';
  stage: 'extracting' | 'extracted' | 'diagnosing' | 'diagnosed' | 'practicing' | 'completed';
  message: string;                    // 阶段描述
  provider?: string;                  // 使用的LLM提供商
  progress: number;                   // 进度百分比 (0-100)
  estimatedSeconds: number;           // 预计剩余时间（秒）
  at: number;                         // 时间戳
}
```

**阶段说明**:
- `extracting` (10%): 正在识别试卷内容
- `extracted` (30%): 识别完成，正在准备分析
- `diagnosing` (50%): 正在分析错因和知识点
- `diagnosed` (70%): 核心分析完成，正在生成练习题
- `practicing` (85%): 正在生成针对性练习题
- `completed` (100%): 分析完成

**前端展示建议**:
```javascript
const eventSource = new EventSource(`/api/analyze-images/stream/${jobId}`);

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'progress') {
    // 更新进度条
    updateProgressBar(data.progress);
    
    // 显示阶段消息
    updateStatusMessage(data.message);
    
    // 显示剩余时间
    updateRemainingTime(data.estimatedSeconds);
  }
});
```

---

#### 2. partial_result 事件（新增）
```typescript
{
  type: 'partial_result';
  stage: 'extracted' | 'diagnosed';
  result: any;                        // 部分结果
  at: number;                         // 时间戳
}
```

**部分结果类型**:

**extracted 阶段** - 返回试卷基本信息:
```typescript
{
  meta: {
    examName: string;
    subject: string;
    grade: string;
    score: number;
    fullScore: number;
    typeAnalysis: Array<{
      type: string;
      score: number;
      full: number;
    }>;
  };
  stage: 'extracted';
  message: '试卷识别完成';
}
```

**diagnosed 阶段** - 返回Top3错因:
```typescript
{
  meta: {
    examName: string;
    subject: string;
    grade: string;
    score: number;
    fullScore: number;
  };
  observations: {
    problems: string[];  // Top3错因
  };
  forStudent: {
    overall: string;
    problems: string[];  // Top3问题描述
    advice: string[];    // Top3建议
  };
  stage: 'diagnosed';
  message: '核心分析完成（Top3错因）';
}
```

**前端展示建议**:
```javascript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'partial_result') {
    if (data.stage === 'extracted') {
      // 立即显示试卷基本信息
      showExamBasicInfo(data.result.meta);
    } else if (data.stage === 'diagnosed') {
      // 立即显示Top3错因
      showTop3Problems(data.result);
    }
  }
});
```

---

## 🎨 前端UI开发建议

### 1. 低置信度警告组件

```jsx
// LowConfidenceWarning.jsx
function LowConfidenceWarning({ warning }) {
  if (!warning?.hasWarning) return null;
  
  const colors = {
    low: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800' },
    medium: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800' },
    high: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800' }
  };
  
  const style = colors[warning.level];
  
  return (
    <div className={`${style.bg} ${style.border} border-l-4 p-4 mb-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${style.text}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className={`text-sm ${style.text} font-medium`}>
            {warning.message}
          </p>
          {warning.suggestions.length > 0 && (
            <div className="mt-2">
              <p className={`text-sm ${style.text} font-medium`}>建议：</p>
              <ul className={`mt-1 text-sm ${style.text} list-disc list-inside`}>
                {warning.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {warning.affectedItems.length > 0 && (
            <p className={`mt-2 text-xs ${style.text}`}>
              受影响项: {warning.affectedItems.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 2. 证据来源追溯组件

```jsx
// EvidenceSourceButton.jsx
function EvidenceSourceButton({ source, onViewImage }) {
  if (!source.canViewOriginal || source.imageIndex === undefined) {
    return null;
  }
  
  return (
    <button
      onClick={() => onViewImage(source.imageIndex)}
      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
    >
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      查看第 {source.imageIndex + 1} 张图片
    </button>
  );
}
```

---

### 3. 渐进式加载组件

```jsx
// ProgressiveAnalysis.jsx
function ProgressiveAnalysis({ jobId }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [message, setMessage] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [partialResult, setPartialResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/analyze-images/stream/${jobId}`);
    
    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'progress') {
        setProgress(data.progress);
        setStage(data.stage);
        setMessage(data.message);
        setRemainingTime(data.estimatedSeconds);
      } else if (data.type === 'partial_result') {
        setPartialResult(data.result);
      } else if (data.type === 'result') {
        setFinalResult(data.result);
        eventSource.close();
      }
    });
    
    return () => eventSource.close();
  }, [jobId]);
  
  return (
    <div className="space-y-4">
      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* 状态消息 */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>{message}</span>
        <span>预计剩余 {remainingTime} 秒</span>
      </div>
      
      {/* 部分结果展示 */}
      {partialResult && stage === 'extracted' && (
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-medium mb-2">试卷基本信息</h3>
          <p>考试名称: {partialResult.meta.examName}</p>
          <p>学科: {partialResult.meta.subject}</p>
          <p>年级: {partialResult.meta.grade}</p>
          <p>得分: {partialResult.meta.score}/{partialResult.meta.fullScore}</p>
        </div>
      )}
      
      {partialResult && stage === 'diagnosed' && (
        <div className="bg-green-50 p-4 rounded">
          <h3 className="font-medium mb-2">核心分析（Top3错因）</h3>
          <p className="mb-2">{partialResult.forStudent.overall}</p>
          <ul className="list-disc list-inside space-y-1">
            {partialResult.forStudent.problems.slice(0, 3).map((problem, index) => (
              <li key={index}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* 最终结果 */}
      {finalResult && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">完整分析报告</h3>
          {/* 渲染完整结果 */}
        </div>
      )}
    </div>
  );
}
```

---

### 4. 用户反馈组件

```jsx
// FeedbackForm.jsx
function FeedbackForm({ analysisId, examName }) {
  const [type, setType] = useState('quality');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        rating,
        comment,
        context: { analysisId, examName }
      })
    });
    
    if (response.ok) {
      setSubmitted(true);
    }
  };
  
  if (submitted) {
    return (
      <div className="bg-green-50 p-4 rounded">
        <p className="text-green-800">感谢您的反馈！</p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">反馈类型</label>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="accuracy">准确性</option>
          <option value="quality">质量</option>
          <option value="suggestion">建议</option>
          <option value="bug">问题反馈</option>
          <option value="other">其他</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">评分</label>
        <div className="flex space-x-2 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">详细反馈</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          placeholder="请描述您的反馈..."
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        提交反馈
      </button>
    </form>
  );
}
```

---

## 🔧 集成步骤

### 1. 更新API客户端
```javascript
// api/client.js
export async function analyzeExam(images) {
  const response = await fetch('/api/analyze-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images })
  });
  
  const data = await response.json();
  
  // 新增字段已自动包含在响应中
  return data;
}

export function subscribeToProgress(jobId, callbacks) {
  const eventSource = new EventSource(`/api/analyze-images/stream/${jobId}`);
  
  eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'progress' && callbacks.onProgress) {
      callbacks.onProgress(data);
    } else if (data.type === 'partial_result' && callbacks.onPartialResult) {
      callbacks.onPartialResult(data);
    } else if (data.type === 'result' && callbacks.onComplete) {
      callbacks.onComplete(data);
      eventSource.close();
    } else if (data.type === 'error' && callbacks.onError) {
      callbacks.onError(data);
      eventSource.close();
    }
  });
  
  return () => eventSource.close();
}

export async function submitFeedback(feedback) {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback)
  });
  
  return response.json();
}
```

### 2. 使用示例
```javascript
// 在分析页面中使用
import { analyzeExam, subscribeToProgress, submitFeedback } from './api/client';

function AnalysisPage() {
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  
  // 开始分析
  const startAnalysis = async (images) => {
    const response = await analyzeExam(images);
    setJobId(response.jobId);
    
    // 订阅进度更新
    subscribeToProgress(response.jobId, {
      onProgress: (data) => {
        console.log('进度:', data.progress, '%');
        console.log('消息:', data.message);
        console.log('剩余时间:', data.estimatedSeconds, '秒');
      },
      onPartialResult: (data) => {
        console.log('部分结果:', data.result);
        // 立即显示部分结果
      },
      onComplete: (data) => {
        console.log('完整结果:', data.result);
        setResult(data.result);
        
        // 检查低置信度警告
        if (data.result.data.lowConfidenceWarning?.hasWarning) {
          showWarning(data.result.data.lowConfidenceWarning);
        }
      },
      onError: (data) => {
        console.error('错误:', data.errorMessage);
      }
    });
  };
  
  // 提交反馈
  const handleFeedback = async (type, rating, comment) => {
    await submitFeedback({
      type,
      rating,
      comment,
      context: {
        analysisId: jobId,
        examName: result?.data?.meta?.examName
      }
    });
  };
  
  return (
    <div>
      {/* UI组件 */}
    </div>
  );
}
```

---

## 📞 技术支持

如有问题，请联系后端团队或查看以下文档：
- `质量优化项目完成报告.md` - 项目总结
- `P0_P1_PROGRESS_SUMMARY.md` - 进度总结
- `.kiro/specs/quality-optimization/design.md` - 设计文档

---

**文档版本**: v2.0  
**最后更新**: 2026年1月12日  
**维护者**: 后端团队
