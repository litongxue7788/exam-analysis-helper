# Server.ts 集成指南

## 概述
本文档说明如何将基于内容的智能推断系统集成到 `backend/server.ts` 中。

---

## 步骤 1: 添加导入语句

在 `backend/server.ts` 文件顶部，找到现有的导入语句，添加以下导入：

```typescript
// 在第 11-15 行附近添加
import { getKnowledgePointAnalyzer } from './core/knowledge-point-analyzer';
import { getMultiDimensionInferencer } from './core/multi-dimension-inferencer';
import { getConfidenceEvaluator } from './core/confidence-evaluator';
import { getOutputBinder } from './core/output-binder';
import { getContentConsistencyValidator } from './core/content-consistency-validator';
```

**状态**: ✅ 已完成

---

## 步骤 2: 替换信息提取逻辑

在 `runImageAnalyzeJob()` 函数中，找到以下代码（约第 1210 行）:

```typescript
// 旧代码
const extractedMeta = extracted?.meta || {};
const extractedProblems = extracted?.observations?.problems || [];

// ========== 智能信息提取和验证 ==========
const validatedInfo = extractAndValidateExamInfo(extractedMeta, {
  grade,
  subject,
  examName: undefined,
});

// 打印验证报告
console.log(generateValidationReport(validatedInfo));

// 使用验证后的信息
const effectiveGrade = validatedInfo.grade;
const effectiveSubject = validatedInfo.subject;
const effectiveExamName = validatedInfo.examName;

// 如果有严重冲突，记录警告
if (validatedInfo.confidence === 'low' || validatedInfo.warnings.some(w => w.includes('严重冲突'))) {
  console.warn('⚠️ [信息验证] 检测到信息冲突或置信度较低，建议用户检查基本信息设置');
}
// ========================================
```

**替换为**:

```typescript
const extractedMeta = extracted?.meta || {};
const extractedProblems = extracted?.observations?.problems || [];

// ========== 基于内容的智能推断系统 ==========
console.log('🚀 [Content-Driven Analysis] 开始基于试卷内容的智能推断...');

// 1. 知识点分析
const analyzer = getKnowledgePointAnalyzer();
const knowledgePoints = analyzer.analyzeKnowledgePoints(extractedProblems);
console.log(`✅ [Knowledge Point Analyzer] 提取了 ${knowledgePoints.length} 个知识点`);

// 2. 多维度推断
const inferencer = getMultiDimensionInferencer();
const titleResult = inferencer.inferFromTitle(extractedMeta.examName || '');
const knowledgeResult = inferencer.inferFromKnowledgePoints(knowledgePoints);
const difficultyResult = inferencer.inferFromDifficulty(extractedProblems);
const questionTypeResult = inferencer.inferFromQuestionTypes(extractedMeta.typeAnalysis || []);

const inference = inferencer.combineResults([
  titleResult,
  knowledgeResult,
  difficultyResult,
  questionTypeResult
]);

console.log(`✅ [Multi-Dimension Inferencer] 综合推断: 年级=${inference.finalGrade}, 学科=${inference.finalSubject}, 置信度=${(inference.overallConfidence * 100).toFixed(0)}%`);

// 3. 置信度评估
const evaluator = getConfidenceEvaluator();
const confidence = evaluator.evaluate(inference);
console.log(`✅ [Confidence Evaluator] 置信度评估: ${confidence.level} (${(confidence.score * 100).toFixed(0)}%)`);
console.log(`   因素: 标题清晰度=${(confidence.factors.titleClarity * 100).toFixed(0)}%, 知识点一致性=${(confidence.factors.knowledgeConsistency * 100).toFixed(0)}%, 难度对齐=${(confidence.factors.difficultyAlignment * 100).toFixed(0)}%, 维度一致性=${(confidence.factors.dimensionAgreement * 100).toFixed(0)}%`);

// 4. 创建绑定上下文（强制使用识别结果，忽略用户输入）
const binder = getOutputBinder();
const boundContext = binder.createBoundContext(
  inference,
  confidence,
  knowledgePoints,
  { grade, subject }  // 用户输入仅记录，不使用
);

console.log(`✅ [Output Binder] 创建绑定上下文: 年级=${boundContext.grade}, 学科=${boundContext.subject}, 来源=${boundContext.source}`);

// 打印警告信息
if (boundContext.warnings.length > 0) {
  boundContext.warnings.forEach(warning => console.warn(warning));
}

// 使用绑定上下文中的信息（完全基于识别结果）
const effectiveGrade = boundContext.grade;
const effectiveSubject = boundContext.subject;
const effectiveExamName = extractedMeta.examName;
// ========================================
```

**状态**: ✅ 已完成

---

## 步骤 3: 替换提示词生成逻辑

找到以下代码（约第 1270 行）:

```typescript
// 旧代码
setSnapshot('diagnosing'); 

const diagnosisPrompt = `
你是一位经验丰富的特级教师。基于下面"试卷信息提取结果"，生成面向学生与家长的核心结论与行动建议。

要求：
- 不要编造题号或得分；如果信息不足，保持谨慎并提示补拍/老师确认。
- 语言温暖积极、可执行。
- 输出严格 JSON（不要包含 Markdown 代码块）。

【已提取信息】：
${JSON.stringify(extracted, null, 2)}

【学段与学科适配】：
年级：${effectiveGrade}
学科：${effectiveSubject}

${effectiveGrade ? getGradeLevelInstruction(effectiveGrade) : ''}
${effectiveSubject ? getSubjectAnalysisInstruction(effectiveSubject) : ''}

输出结构：
{
  "review": { "required": false, "reason": "", "suggestions": [] },
  "forStudent": {
    "overall": "整体评价（3-6句）",
    "advice": ["【基础巩固】...", "【专项训练】...", "【习惯养成】..."]
  },
  "studyMethods": {
    "methods": ["更高效的做法（4-6条）"],
    "weekPlan": ["接下来7天微计划（5-7条）"]
  },
  "forParent": {
    "summary": "家长可读总结（2-4句）",
    "guidance": "家长督学建议（3-5句）"
  }
}
`.trim();

const diagnosisTask = generateTextJsonWithRepair(
  diagnosisPrompt,
  providers.diagnose,
  'diagnosing',
  emit,
  validateDiagnosisJson,
  `- review (object)\n- forStudent.overall (string)\n- forStudent.advice (string[])\n- studyMethods.methods (string[])\n- studyMethods.weekPlan (string[])\n- forParent (object)`
);

const practicePrompt = `
请基于下面信息，为学生生成一份"针对性巩固练习卷"和"验收小测"。

要求：
- 题目必须可直接作答（完整题干/数值/设问），不要只写概括。
- 每道题提供 hints（三层：审题提示、思路提示、关键一步起始），不出现最终答案。
- 输出严格 JSON（不要包含 Markdown 代码块）。

【试卷信息提取】：
${JSON.stringify(extracted, null, 2)}

${effectiveSubject ? getSubjectPracticeInstruction(effectiveSubject) : ''}

输出结构：
{
  "practicePaper": {
    "title": "针对性巩固练习卷",
    "sections": [
      { "name": "一、...", "questions": [ { "no": 1, "content": "...", "hints": ["..."] } ] }
    ]
  },
  "acceptanceQuiz": {
    "title": "验收小测",
    "passRule": "3题全对",
    "questions": [ { "no": 1, "content": "...", "hints": ["..."] } ]
  }
}
`.trim();

const practiceTask = generateTextJsonWithRepair(
  practicePrompt,
  providers.practice,
  'practicing',
  emit,
  validatePracticeJson,
  `- practicePaper (object)\n- acceptanceQuiz (object)`
);
```

**替换为**:

```typescript
setSnapshot('diagnosing'); 

// 使用 OutputBinder 生成提示词（强制使用识别结果）
const diagnosisPrompt = binder.generateDiagnosisPrompt(
  boundContext,
  extracted,
  getGradeLevelInstruction,
  getSubjectAnalysisInstruction
);

const diagnosisTask = generateTextJsonWithRepair(
  diagnosisPrompt,
  providers.diagnose,
  'diagnosing',
  emit,
  validateDiagnosisJson,
  `- review (object)\n- forStudent.overall (string)\n- forStudent.advice (string[])\n- studyMethods.methods (string[])\n- studyMethods.weekPlan (string[])\n- forParent (object)`
);

const practicePrompt = binder.generatePracticePrompt(
  boundContext,
  extracted,
  getSubjectPracticeInstruction
);

const practiceTask = generateTextJsonWithRepair(
  practicePrompt,
  providers.practice,
  'practicing',
  emit,
  validatePracticeJson,
  `- practicePaper (object)\n- acceptanceQuiz (object)`
);
```

**状态**: ⏳ 待手动完成（由于模板字符串匹配问题）

---

## 步骤 4: 添加内容一致性验证

在 `const [diagnosis, practice] = await Promise.all([diagnosisTask, practiceTask]);` 之后，找到现有的相关性验证代码（约第 1295 行），在其**之前**添加:

```typescript
// 验证内容一致性
if (isCanceled()) return;

try {
  const validator = getContentConsistencyValidator();
  
  // 验证诊断报告
  const diagnosisReport = validator.validateDiagnosisReport(diagnosis, inference, knowledgePoints);
  if (!diagnosisReport.overallPassed) {
    console.warn('⚠️ [Content Consistency] 诊断报告一致性验证有警告');
    diagnosisReport.warnings.forEach(w => console.warn(`   ${w}`));
  }
  
  // 验证练习题
  const practiceReport = validator.validatePracticeQuestions(practice, inference, knowledgePoints);
  if (!practiceReport.overallPassed) {
    console.warn('⚠️ [Content Consistency] 练习题一致性验证有警告');
    practiceReport.warnings.forEach(w => console.warn(`   ${w}`));
  }
  
  // 验证学习方法
  const methodsReport = validator.validateStudyMethods(diagnosis.studyMethods, inference);
  if (!methodsReport.overallPassed) {
    console.warn('⚠️ [Content Consistency] 学习方法一致性验证有警告');
    methodsReport.warnings.forEach(w => console.warn(`   ${w}`));
  }
} catch (err) {
  console.error('⚠️ [Content Consistency] 验证失败:', err);
  // 不阻止流程，继续执行
}
```

**状态**: ⏳ 待手动完成

---

## 步骤 5: 替换响应构建逻辑

找到 `buildResponse` 函数定义（约第 1340 行）:

```typescript
// 旧代码
const buildResponse = (opts: { practice?: any; diagnosis?: any } = {}): AnalyzeExamResponse => {
  const meta = { ...(extractedMeta || {}) };
  if (!String((meta as any)?.subject || '').trim() && effectiveSubject) (meta as any).subject = effectiveSubject;
  const diag = opts.diagnosis || {};
  const prac = opts.practice || {};
  
  const reportJson = {
    meta,
    review: diag.review,
    forStudent: {
      ...(diag.forStudent || {}),
      problems: Array.isArray(extractedProblems) ? extractedProblems : [],
    },
    studyMethods: diag.studyMethods,
    forParent: diag.forParent,
    practicePaper: prac.practicePaper,
    acceptanceQuiz: prac.acceptanceQuiz,
  };
  return {
    success: true,
    data: {
      summary: {
        totalScore: meta.score || 0,
        rank: 0,
        beatPercentage: 0,
        strongestKnowledge: '基于图像分析',
        weakestKnowledge: '基于图像分析',
      },
      report: {
        forStudent: reportJson.forStudent || {},
        forParent: reportJson.forParent || {},
      },
      studyMethods: reportJson.studyMethods,
      examName: meta.examName,
      typeAnalysis: meta.typeAnalysis || [],
      paperAppearance: meta.paperAppearance,
      subject: meta.subject,
      review: reportJson.review,
      rawLlmOutput: JSON.stringify(reportJson),
      practiceQuestions: [],
      practicePaper: reportJson.practicePaper,
      acceptanceQuiz: reportJson.acceptanceQuiz,
    },
  };
};
```

**替换为**:

```typescript
// 使用 OutputBinder 构建响应
const buildResponse = (opts: { practice?: any; diagnosis?: any } = {}): AnalyzeExamResponse => {
  const diag = opts.diagnosis || {};
  const prac = opts.practice || {};
  
  return binder.buildResponse(
    boundContext,
    extractedMeta,
    extractedProblems,
    diag,
    prac
  );
};
```

**状态**: ⏳ 待手动完成

---

## 验证步骤

完成集成后，执行以下步骤验证:

### 1. 编译检查
```bash
cd backend
npx tsc --noEmit
```

### 2. 运行测试
```bash
cd backend
npx ts-node test_content_driven.ts
```

### 3. 重启后端服务
```bash
# 停止现有服务（如果正在运行）
# 然后启动
cd backend
npm run dev
```

### 4. 真实试卷测试
- 上传一份高中试卷
- 在用户输入中故意填写"小学三年级"
- 检查输出是否正确识别为"高中"
- 检查所有输出内容是否与试卷匹配

---

## 预期效果

集成完成后，系统将:

1. ✅ 完全基于试卷识别结果生成分析
2. ✅ 忽略用户错误输入
3. ✅ 提供多维度推断和置信度评估
4. ✅ 验证所有输出内容与试卷一致
5. ✅ 生成详细的警告和建议

---

## 故障排除

### 问题1: 编译错误
- 检查所有导入语句是否正确
- 检查变量名是否一致（`binder`, `boundContext`, `inference`, `knowledgePoints`）

### 问题2: 运行时错误
- 检查知识点数据库是否正确加载
- 检查所有模块是否正确导出

### 问题3: 输出不符合预期
- 检查 `boundContext` 是否正确创建
- 检查提示词是否使用了 `boundContext` 而不是用户输入
- 查看控制台日志，确认推断过程

---

## 联系支持

如有问题，请查看:
- 设计文档: `.kiro/specs/content-driven-analysis/design.md`
- 测试脚本: `backend/test_content_driven.ts`
- 完成报告: `.kiro/specs/content-driven-analysis/IMPLEMENTATION_COMPLETE.md`
