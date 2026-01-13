# Design Document - 试卷分析质量优化

## Overview

本设计文档针对试卷分析助手在实际使用中发现的四大核心质量问题，提供系统性的解决方案。这些问题直接影响用户体验和产品成败：

1. **分析报告内容与试卷不符** - 识别错误或分析偏离
2. **输出包含不可读符号** - 乱码、LaTeX代码、特殊字符
3. **练习题目与错题不相关** - 生成的题目偏离错因
4. **分析时长过长** - 用户等待体验差

## Architecture

### 整体架构优化

```
用户上传试卷
    ↓
[图片质量检查] ← 新增
    ↓
[视觉模型识别] + [置信度评估] ← 增强
    ↓
[结构化提取] → [双模型验证] ← 新增
    ↓
[错因分析] + [证据链绑定] ← 增强
    ↓
[内容清洗与验证] ← 新增
    ↓
[练习题生成] + [相关性验证] ← 增强
    ↓
[分段交付] + [渐进式加载] ← 优化
    ↓
用户查看结果
```

### 关键改进点

1. **前置质量门控** - 在识别前检查图片质量
2. **双模型验证** - 关键信息使用两个模型交叉验证
3. **证据链强制绑定** - 每个分析必须有试卷证据
4. **内容清洗管道** - 多层过滤确保输出可读
5. **相关性验证** - 练习题生成后验证与错因的关联度
6. **分段交付** - 先返回核心结果，再补充完整报告

## Components and Interfaces

### 1. 图片质量检查器 (ImageQualityChecker)

**职责**: 在分析前检查图片质量，避免低质量输入导致错误识别

```typescript
interface ImageQualityChecker {
  /**
   * 检查图片质量
   * @returns 质量评分和建议
   */
  checkQuality(imageDataUrl: string): Promise<QualityCheckResult>;
}

interface QualityCheckResult {
  score: number; // 0-100
  issues: QualityIssue[];
  canProceed: boolean;
  suggestions: string[];
}

interface QualityIssue {
  type: 'blur' | 'dark' | 'skew' | 'lowResolution' | 'glare';
  severity: 'low' | 'medium' | 'high';
  message: string;
}
```

**实现策略**:
- 使用Canvas API检测图片亮度、对比度
- 检测图片分辨率是否足够
- 前端实时反馈，后端二次验证

### 2. 置信度评估器 (ConfidenceEvaluator)

**职责**: 评估识别结果的可信度，低置信度结果需要用户确认

```typescript
interface ConfidenceEvaluator {
  /**
   * 评估识别结果的置信度
   */
  evaluate(extractedData: ExtractedData): ConfidenceScore;
}

interface ConfidenceScore {
  overall: number; // 0-1
  fields: {
    [key: string]: {
      value: any;
      confidence: number;
      needsConfirmation: boolean;
    };
  };
}

interface ExtractedData {
  examName: string;
  subject: string;
  score: number;
  fullScore: number;
  problems: string[];
  // ... 其他字段
}
```

**置信度判定规则**:
- 题号识别：数字清晰度、位置合理性
- 得分识别：数字格式、范围合理性
- 文字识别：OCR置信度、语义连贯性

### 3. 双模型验证器 (DualModelValidator)

**职责**: 对关键信息使用两个模型交叉验证，提升准确性

```typescript
interface DualModelValidator {
  /**
   * 使用两个模型验证关键信息
   */
  validate(
    images: string[],
    primaryProvider: LLMProvider,
    secondaryProvider: LLMProvider
  ): Promise<ValidatedResult>;
}

interface ValidatedResult {
  examName: string;
  subject: string;
  score: number;
  fullScore: number;
  problems: ProblemInfo[];
  validationStatus: {
    examName: 'consistent' | 'inconsistent' | 'uncertain';
    score: 'consistent' | 'inconsistent' | 'uncertain';
    // ... 其他字段
  };
}

interface ProblemInfo {
  questionNo: string;
  score: string; // "得分/满分" 格式
  knowledge: string;
  errorType: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
}
```

**验证策略**:
- 关键字段（题号、得分）必须双模型一致
- 不一致时取置信度高的结果
- 都不确定时标记需要用户确认

### 4. 证据链绑定器 (EvidenceLinker)

**职责**: 确保每个分析结论都有明确的试卷证据

```typescript
interface EvidenceLinker {
  /**
   * 为分析结果绑定证据
   */
  linkEvidence(
    analysis: AnalysisResult,
    extractedData: ExtractedData
  ): AnalysisWithEvidence;
}

interface AnalysisWithEvidence {
  problems: ProblemWithEvidence[];
  // ... 其他字段
}

interface ProblemWithEvidence {
  knowledge: string;
  questionNo: string; // 必需
  score: string; // 必需，格式："得分/满分"
  errorType: string;
  evidence: string; // 必需，来自试卷的具体证据
  confidence: 'high' | 'medium' | 'low'; // 必需
  shortestFix: string;
  sourceImage?: number; // 证据来自第几张图片
  sourceRegion?: { x: number; y: number; w: number; h: number }; // 证据在图片中的位置
}
```

**绑定规则**:
- 无证据的分析不允许输出
- 证据必须是试卷原文，不能编造
- 低置信度必须明确标注

### 5. 内容清洗管道 (ContentSanitizer)

**职责**: 多层过滤确保输出内容可读、无乱码

```typescript
interface ContentSanitizer {
  /**
   * 清洗LLM输出内容
   */
  sanitize(rawContent: string): SanitizedContent;
}

interface SanitizedContent {
  cleaned: string;
  issues: ContentIssue[];
  wasModified: boolean;
}

interface ContentIssue {
  type: 'markdown' | 'latex' | 'specialChar' | 'encoding' | 'format';
  original: string;
  fixed: string;
  position: number;
}
```

**清洗规则**:

1. **移除Markdown标记**
   ```typescript
   // 移除代码块标记
   content = content.replace(/```json\s*/gi, '');
   content = content.replace(/```\s*/g, '');
   
   // 移除多余的反引号
   content = content.replace(/`{1,3}/g, '');
   ```

2. **转换LaTeX公式**
   ```typescript
   // 检测LaTeX公式
   const latexPattern = /\$\$?([^$]+)\$\$?/g;
   
   // 转换为文字描述或Unicode符号
   content = content.replace(latexPattern, (match, formula) => {
     return convertLatexToText(formula);
   });
   ```

3. **清理特殊字符**
   ```typescript
   // 移除BOM和控制字符
   content = content.replace(/\uFEFF/g, '');
   content = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
   
   // 规范化空白字符
   content = content.replace(/\s+/g, ' ');
   content = content.replace(/\n{3,}/g, '\n\n');
   ```

4. **验证编码**
   ```typescript
   // 检测并修复编码问题
   if (hasEncodingIssues(content)) {
     content = fixEncoding(content);
   }
   ```

### 6. 练习题相关性验证器 (RelevanceValidator)

**职责**: 验证生成的练习题与错因的相关性

```typescript
interface RelevanceValidator {
  /**
   * 验证练习题与错因的相关性
   */
  validate(
    problems: ProblemWithEvidence[],
    practiceQuestions: PracticeQuestion[]
  ): RelevanceResult;
}

interface RelevanceResult {
  overall: number; // 0-1，整体相关性得分
  questions: QuestionRelevance[];
  needsRegeneration: boolean;
}

interface QuestionRelevance {
  questionNo: number;
  targetProblem: string; // 对应的错因
  relevanceScore: number; // 0-1
  reason: string;
  isRelevant: boolean;
}
```

**相关性判定规则**:
- 知识点匹配：练习题知识点与错因知识点一致
- 题型匹配：练习题题型与错题题型相同或相近
- 难度匹配：练习题难度与错题难度相当
- 错因针对性：练习题能针对性训练该错因

### 7. 分段交付管理器 (ProgressiveDelivery)

**职责**: 实现分段交付，优化用户等待体验

```typescript
interface ProgressiveDelivery {
  /**
   * 分段交付分析结果
   */
  deliver(jobId: string, stage: DeliveryStage, data: any): void;
}

type DeliveryStage = 
  | 'extracting'    // 正在识别
  | 'extracted'     // 识别完成，返回基本信息
  | 'diagnosing'    // 正在分析
  | 'diagnosed'     // 核心分析完成，返回Top3错因
  | 'practicing'    // 正在生成练习题
  | 'completed';    // 全部完成

interface DeliveryData {
  stage: DeliveryStage;
  progress: number; // 0-100
  estimatedTime: number; // 剩余秒数
  partialResult?: Partial<AnalyzeExamResponse>;
}
```

**交付策略**:
1. **0-5秒**: 返回识别进度
2. **5-15秒**: 返回基本信息（考试名、科目、总分）
3. **15-30秒**: 返回核心分析（Top3错因+最短改法）
4. **30-60秒**: 返回完整报告（包含练习题）

## Data Models

### 优化后的分析结果数据模型

```typescript
interface OptimizedAnalyzeExamResponse {
  // 元数据
  meta: {
    examName: string;
    subject: string;
    grade: string;
    score: number;
    fullScore: number;
    typeAnalysis: TypeScore[];
    paperAppearance?: {
      rating: string;
      content: string;
    };
    // 新增：质量指标
    qualityMetrics: {
      recognitionConfidence: number; // 识别置信度
      analysisConfidence: number; // 分析置信度
      evidenceCompleteness: number; // 证据完整性
      contentReadability: number; // 内容可读性
    };
  };

  // 观察结果（识别到的问题）
  observations: {
    problems: ProblemWithEvidence[]; // 使用增强的问题模型
    // 新增：识别原始数据
    rawExtraction?: {
      ocrText: string;
      structuredData: any;
      confidence: ConfidenceScore;
    };
  };

  // 给学生的分析
  forStudent: {
    overall: string;
    problems: string[]; // 格式化的问题描述
    advice: string[];
    // 新增：可视化证据
    evidenceImages?: {
      problemId: string;
      imageUrl: string;
      region: { x: number; y: number; w: number; h: number };
    }[];
  };

  // 给家长的分析
  forParent: {
    summary: string;
    guidance: string;
  };

  // 学习方法
  studyMethods: {
    methods: string[];
    weekPlan: string[];
  };

  // 练习卷
  practicePaper: {
    title: string;
    sections: PracticeSection[];
    // 新增：相关性验证结果
    relevanceValidation?: RelevanceResult;
  };

  // 验收小测
  acceptanceQuiz: {
    title: string;
    passRule: string;
    questions: PracticeQuestion[];
  };

  // 新增：质量保证信息
  qualityAssurance: {
    contentSanitized: boolean;
    sanitizationIssues: ContentIssue[];
    validationPassed: boolean;
    validationWarnings: string[];
  };
}
```

## Correctness Properties

### Property 1: 识别准确性保证
*For any* 上传的试卷图片，如果图片质量合格（质量分数≥60），则识别出的题号、得分、题型的准确率应≥95%，且所有低置信度结果（<80%）必须明确标注。

**Validates: Requirements 1.1, 1.2**

### Property 2: 分析证据完整性
*For any* 生成的错因分析，必须包含【题号】、【得分】、【错因】、【证据】、【置信度】、【最短改法】六要素，且证据必须来自试卷原文，不得为空或编造。

**Validates: Requirements 2.1, 2.2**

### Property 3: 内容可读性保证
*For any* 输出的文本内容，不得包含Markdown代码块标记（```）、LaTeX原始代码（$...$）、不可读的Unicode控制字符，所有数学公式必须转换为文字描述或标准Unicode符号。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: 练习题相关性保证
*For any* 生成的练习题，必须与对应的错因在知识点、题型、难度上匹配，相关性得分应≥0.8，且每道题必须标注【对应错因】和【训练目标】。

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: 分析时长上限
*For any* 包含N张图片的分析请求（1≤N≤6），核心分析结果（Top3错因+最短改法）的返回时间应≤30+10*N秒，完整报告的返回时间应≤60+15*N秒。

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: 输出完整性保证
*For any* 成功完成的分析，输出必须包含meta、observations、forStudent、forParent、studyMethods、practicePaper、acceptanceQuiz七个顶层字段，且每个字段的必需子字段不得为空。

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 7: 错误处理清晰性
*For any* 分析失败的情况，错误消息必须明确指出失败原因（如"图片模糊"、"识别置信度低"、"网络超时"），不得使用泛泛的"分析失败"或"系统错误"。

**Validates: Requirements 7.1, 7.2**

### Property 8: 提示词结构化输出
*For any* 调用大模型的请求，提示词必须明确要求输出格式、必需字段、内容规范（如"使用标准中文"、"不得编造"、"基于图片内容"），且必须包含输出示例。

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

## Error Handling

### 1. 图片质量不合格
```typescript
if (qualityScore < 60) {
  return {
    success: false,
    errorCode: 'IMAGE_QUALITY_LOW',
    message: '图片质量不佳，建议重新拍照',
    suggestions: [
      '确保光线充足',
      '避免模糊和倾斜',
      '保持适当距离，确保文字清晰'
    ],
    qualityIssues: issues
  };
}
```

### 2. 识别置信度低
```typescript
if (overallConfidence < 0.8) {
  return {
    success: true,
    data: result,
    warnings: [
      {
        type: 'LOW_CONFIDENCE',
        message: '部分内容识别置信度较低，请核对',
        fields: lowConfidenceFields
      }
    ],
    needsUserConfirmation: true
  };
}
```

### 3. 内容清洗失败
```typescript
if (sanitizationIssues.length > 0) {
  logger.warn('Content sanitization issues:', sanitizationIssues);
  
  // 尝试修复
  const fixed = attemptAutoFix(content, sanitizationIssues);
  
  if (!fixed.success) {
    return {
      success: false,
      errorCode: 'CONTENT_UNREADABLE',
      message: '输出内容包含不可读字符，请重试',
      issues: sanitizationIssues
    };
  }
}
```

### 4. 练习题相关性不足
```typescript
if (relevanceResult.overall < 0.6) {
  logger.warn('Practice questions relevance too low, regenerating...');
  
  // 自动重新生成
  const regenerated = await regeneratePracticeQuestions(
    problems,
    { minRelevance: 0.8 }
  );
  
  return regenerated;
}
```

### 5. 分析超时
```typescript
if (elapsedTime > timeoutMs) {
  // 返回部分结果
  return {
    success: true,
    partial: true,
    data: partialResult,
    message: '分析部分完成，完整报告将在后台继续生成',
    estimatedCompletion: estimateRemainingTime()
  };
}
```

## Testing Strategy

### Unit Tests

1. **内容清洗测试**
   ```typescript
   describe('ContentSanitizer', () => {
     it('should remove markdown code blocks', () => {
       const input = '```json\n{"key": "value"}\n```';
       const output = sanitizer.sanitize(input);
       expect(output.cleaned).not.toContain('```');
     });

     it('should convert LaTeX to text', () => {
       const input = '公式：$x^2 + y^2 = r^2$';
       const output = sanitizer.sanitize(input);
       expect(output.cleaned).not.toContain('$');
       expect(output.cleaned).toContain('x²');
     });

     it('should remove control characters', () => {
       const input = 'text\x00with\x1Fcontrol\x7Fchars';
       const output = sanitizer.sanitize(input);
       expect(output.cleaned).toBe('textwithcontrolchars');
     });
   });
   ```

2. **证据链验证测试**
   ```typescript
   describe('EvidenceLinker', () => {
     it('should reject analysis without evidence', () => {
       const analysis = {
         problems: [
           { knowledge: '一次函数', errorType: '概念错误' }
           // 缺少 evidence
         ]
       };
       
       expect(() => linker.linkEvidence(analysis, extractedData))
         .toThrow('Missing evidence for problem');
     });

     it('should bind evidence to each problem', () => {
       const result = linker.linkEvidence(analysis, extractedData);
       
       result.problems.forEach(problem => {
         expect(problem.evidence).toBeDefined();
         expect(problem.evidence.length).toBeGreaterThan(0);
         expect(problem.questionNo).toBeDefined();
         expect(problem.score).toMatch(/\d+\/\d+/);
       });
     });
   });
   ```

3. **相关性验证测试**
   ```typescript
   describe('RelevanceValidator', () => {
     it('should validate practice question relevance', () => {
       const problems = [
         { knowledge: '分式方程', errorType: '计算失误' }
       ];
       const questions = [
         { content: '解分式方程：...', targetKnowledge: '分式方程' }
       ];
       
       const result = validator.validate(problems, questions);
       
       expect(result.overall).toBeGreaterThan(0.8);
       expect(result.needsRegeneration).toBe(false);
     });

     it('should flag irrelevant questions', () => {
       const problems = [
         { knowledge: '分式方程', errorType: '计算失误' }
       ];
       const questions = [
         { content: '解一元二次方程：...', targetKnowledge: '一元二次方程' }
       ];
       
       const result = validator.validate(problems, questions);
       
       expect(result.overall).toBeLessThan(0.6);
       expect(result.needsRegeneration).toBe(true);
     });
   });
   ```

### Property-Based Tests

1. **内容可读性属性测试**
   ```typescript
   describe('Content Readability Property', () => {
     it('should ensure all output is readable', () => {
       fc.assert(
         fc.property(
           fc.string(), // 任意字符串输入
           (rawContent) => {
             const sanitized = sanitizer.sanitize(rawContent);
             
             // 不包含Markdown标记
             expect(sanitized.cleaned).not.toMatch(/```/);
             
             // 不包含LaTeX代码
             expect(sanitized.cleaned).not.toMatch(/\$[^$]+\$/);
             
             // 不包含控制字符
             expect(sanitized.cleaned).not.toMatch(/[\x00-\x1F\x7F-\x9F]/);
             
             return true;
           }
         ),
         { numRuns: 100 }
       );
     });
   });
   ```

2. **证据完整性属性测试**
   ```typescript
   describe('Evidence Completeness Property', () => {
     it('should ensure all problems have complete evidence', () => {
       fc.assert(
         fc.property(
           fc.array(fc.record({
             knowledge: fc.string(),
             errorType: fc.string(),
             evidence: fc.string(),
             questionNo: fc.string(),
             score: fc.string()
           })),
           (problems) => {
             problems.forEach(problem => {
               // 必需字段不为空
               expect(problem.knowledge).toBeTruthy();
               expect(problem.evidence).toBeTruthy();
               expect(problem.questionNo).toBeTruthy();
               expect(problem.score).toMatch(/\d+\/\d+/);
             });
             
             return true;
           }
         ),
         { numRuns: 100 }
       );
     });
   });
   ```

### Integration Tests

1. **端到端质量测试**
   ```typescript
   describe('End-to-End Quality Test', () => {
     it('should produce high-quality analysis', async () => {
       const images = [testImage1, testImage2];
       const result = await analyzeExam(images, {
         subject: '数学',
         grade: '初三'
       });
       
       // 验证输出质量
       expect(result.qualityMetrics.recognitionConfidence).toBeGreaterThan(0.9);
       expect(result.qualityMetrics.contentReadability).toBe(1.0);
       expect(result.qualityAssurance.validationPassed).toBe(true);
       
       // 验证内容可读性
       const allText = JSON.stringify(result);
       expect(allText).not.toContain('```');
       expect(allText).not.toMatch(/\$[^$]+\$/);
       
       // 验证证据完整性
       result.observations.problems.forEach(problem => {
         expect(problem).toHaveProperty('questionNo');
         expect(problem).toHaveProperty('score');
         expect(problem).toHaveProperty('evidence');
         expect(problem).toHaveProperty('confidence');
       });
     });
   });
   ```

## Performance Optimization

### 1. 分段交付实现

```typescript
async function analyzeWithProgressiveDelivery(
  jobId: string,
  images: string[],
  options: AnalyzeOptions
): Promise<void> {
  const emit = (stage: DeliveryStage, data: any) => {
    broadcastSSE(jobId, { type: 'progress', stage, data });
  };

  try {
    // 阶段1：识别（5-15秒）
    emit('extracting', { progress: 0, message: '正在识别试卷...' });
    const extracted = await extractWithTimeout(images, 15000);
    emit('extracted', { 
      progress: 30, 
      partialResult: { meta: extracted.meta } 
    });

    // 阶段2：核心分析（15-30秒）
    emit('diagnosing', { progress: 30, message: '正在分析错因...' });
    const diagnosed = await diagnoseWithTimeout(extracted, 15000);
    emit('diagnosed', { 
      progress: 60, 
      partialResult: { 
        meta: extracted.meta,
        observations: diagnosed.observations,
        forStudent: { problems: diagnosed.topProblems }
      } 
    });

    // 阶段3：生成练习题（30-60秒）
    emit('practicing', { progress: 60, message: '正在生成练习题...' });
    const practice = await generatePracticeWithTimeout(diagnosed, 30000);
    
    // 阶段4：完成
    const fullResult = mergeResults(extracted, diagnosed, practice);
    emit('completed', { progress: 100, result: fullResult });
    
  } catch (error) {
    emit('failed', { error: error.message });
  }
}
```

### 2. 缓存策略

```typescript
// 图片内容哈希缓存
const cacheKey = computeImageHash(images) + options.subject + options.grade;
const cached = await cache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached.result;
}

// 执行分析...
const result = await analyze(images, options);

// 缓存结果
await cache.set(cacheKey, {
  result,
  timestamp: Date.now()
}, CACHE_TTL);
```

### 3. 并行处理

```typescript
// 多张图片并行识别
const extractionPromises = images.map(img => 
  extractSingleImage(img)
);
const extractions = await Promise.all(extractionPromises);

// 合并结果
const merged = mergeExtractions(extractions);
```

---

**设计完成时间**: 2026-01-11  
**设计人员**: Kiro AI Assistant  
**审核状态**: 待审核
