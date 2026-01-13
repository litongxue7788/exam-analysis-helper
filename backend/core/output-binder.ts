// =================================================================================
// 输出强制绑定器 (Output Binder)
// 确保所有输出生成都使用试卷识别结果，完全忽略用户输入
// =================================================================================

import { InferenceResult } from './multi-dimension-inferencer';
import { ConfidenceEvaluation, getConfidenceEvaluator } from './confidence-evaluator';
import { KnowledgePoint } from './knowledge-point-analyzer';

export interface BoundContext {
  grade: string;           // 强制使用的年级
  subject: string;         // 强制使用的学科
  knowledgePoints: KnowledgePoint[];  // 强制使用的知识点
  confidence: ConfidenceEvaluation;   // 置信度
  userInput: {             // 用户输入（仅记录，不使用）
    grade?: string;
    subject?: string;
  };
  warnings: string[];      // 警告信息
  source: 'recognition' | 'user-fallback';  // 数据来源
}

export class OutputBinder {
  /**
   * 创建绑定上下文
   */
  createBoundContext(
    inference: InferenceResult,
    confidence: ConfidenceEvaluation,
    knowledgePoints: KnowledgePoint[],
    userInput: { grade?: string; subject?: string }
  ): BoundContext {
    const warnings: string[] = [];
    let source: 'recognition' | 'user-fallback' = 'recognition';

    // 检查用户输入与识别结果的差异
    if (userInput.grade && userInput.grade !== inference.finalGrade) {
      warnings.push(
        `⚠️ 用户输入年级"${userInput.grade}"与识别结果"${inference.finalGrade}"不一致，已使用识别结果`
      );
    }

    if (userInput.subject && userInput.subject !== inference.finalSubject) {
      warnings.push(
        `⚠️ 用户输入学科"${userInput.subject}"与识别结果"${inference.finalSubject}"不一致，已使用识别结果`
      );
    }

    // 只有在识别置信度极低时才考虑使用用户输入
    let finalGrade = inference.finalGrade;
    let finalSubject = inference.finalSubject;

    if (confidence.level === 'very-low') {
      if (userInput.grade && inference.finalGrade === '未知') {
        finalGrade = userInput.grade;
        source = 'user-fallback';
        warnings.push(`⚠️ 识别置信度极低，使用用户输入年级"${userInput.grade}"作为备选`);
      }
      if (userInput.subject && inference.finalSubject === '未知') {
        finalSubject = userInput.subject;
        source = 'user-fallback';
        warnings.push(`⚠️ 识别置信度极低，使用用户输入学科"${userInput.subject}"作为备选`);
      }
    }

    // 添加置信度警告
    const evaluator = getConfidenceEvaluator();
    warnings.push(evaluator.generateWarningMessage(confidence));

    console.log(`✅ [Output Binder] 创建绑定上下文: 年级=${finalGrade}, 学科=${finalSubject}, 来源=${source}`);
    if (warnings.length > 0) {
      console.log(`   警告: ${warnings.join('; ')}`);
    }

    return {
      grade: finalGrade,
      subject: finalSubject,
      knowledgePoints,
      confidence,
      userInput,
      warnings,
      source
    };
  }

  /**
   * 生成诊断提示词（强制使用绑定上下文）
   */
  generateDiagnosisPrompt(
    context: BoundContext,
    extracted: any,
    getGradeLevelInstruction: (grade: string) => string,
    getSubjectAnalysisInstruction: (subject: string) => string
  ): string {
    // 强制使用识别结果，完全忽略用户输入
    const grade = context.grade;
    const subject = context.subject;

    return `
你是一位经验丰富的特级教师。基于下面"试卷信息提取结果"，生成面向学生与家长的核心结论与行动建议。

要求：
- 不要编造题号或得分；如果信息不足，保持谨慎并提示补拍/老师确认。
- 语言温暖积极、可执行。
- 输出严格 JSON（不要包含 Markdown 代码块）。

【已提取信息】：
${JSON.stringify(extracted, null, 2)}

【学段与学科适配】：
年级：${grade}
学科：${subject}
数据来源：${context.source === 'recognition' ? '试卷识别' : '用户输入（备选）'}
识别置信度：${context.confidence.level} (${(context.confidence.score * 100).toFixed(0)}%)

${grade && grade !== '未知' ? getGradeLevelInstruction(grade) : ''}
${subject && subject !== '未知' ? getSubjectAnalysisInstruction(subject) : ''}

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
  }

  /**
   * 生成练习提示词（强制使用绑定上下文）
   */
  generatePracticePrompt(
    context: BoundContext,
    extracted: any,
    getSubjectPracticeInstruction: (subject: string) => string
  ): string {
    // 强制使用识别结果
    const subject = context.subject;

    return `
请基于下面信息，为学生生成一份"针对性巩固练习卷"和"验收小测"。

要求：
- 题目必须可直接作答（完整题干/数值/设问），不要只写概括。
- 每道题提供 hints（三层：审题提示、思路提示、关键一步起始），不出现最终答案。
- 输出严格 JSON（不要包含 Markdown 代码块）。

【试卷信息提取】：
${JSON.stringify(extracted, null, 2)}

【学科适配】：
学科：${subject}
数据来源：${context.source === 'recognition' ? '试卷识别' : '用户输入（备选）'}

${subject && subject !== '未知' ? getSubjectPracticeInstruction(subject) : ''}

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
  }

  /**
   * 构建响应（包含绑定上下文信息）
   */
  buildResponse(
    context: BoundContext,
    extractedMeta: any,
    extractedProblems: string[],
    diagnosis: any,
    practice: any
  ): any {
    const meta = { ...(extractedMeta || {}) };
    
    // 强制使用识别结果覆盖 meta 中的学科
    if (context.subject && context.subject !== '未知') {
      meta.subject = context.subject;
    }

    const reportJson = {
      meta,
      review: diagnosis.review,
      forStudent: {
        ...(diagnosis.forStudent || {}),
        problems: Array.isArray(extractedProblems) ? extractedProblems : [],
      },
      studyMethods: diagnosis.studyMethods,
      forParent: diagnosis.forParent,
      practicePaper: practice.practicePaper,
      acceptanceQuiz: practice.acceptanceQuiz,
      // 添加识别信息
      recognitionInfo: {
        grade: context.grade,
        subject: context.subject,
        confidence: {
          level: context.confidence.level,
          score: context.confidence.score
        },
        source: context.source,
        warnings: context.warnings
      }
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
        recognitionInfo: reportJson.recognitionInfo
      },
    };
  }
}

// 单例模式
let binderInstance: OutputBinder | null = null;

export function getOutputBinder(): OutputBinder {
  if (!binderInstance) {
    binderInstance = new OutputBinder();
  }
  return binderInstance;
}
