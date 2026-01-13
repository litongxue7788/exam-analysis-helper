/**
 * Quality Assurance Module
 * 
 * 实现输出质量保证：
 * 1. 输出完整性验证
 * 2. 质量评分机制
 * 3. 质量报告生成
 */

export interface QualityMetrics {
  recognitionConfidence: number;  // 识别置信度 (0-1)
  analysisConfidence: number;     // 分析置信度 (0-1)
  evidenceCompleteness: number;   // 证据完整性 (0-1)
  contentReadability: number;     // 内容可读性 (0-1)
  overallScore: number;           // 总体质量分数 (0-100)
}

export interface CompletenessValidation {
  passed: boolean;
  missingFields: string[];
  invalidFields: { field: string; reason: string }[];
  warnings: string[];
}

export interface QualityReport {
  metrics: QualityMetrics;
  completeness: CompletenessValidation;
  recommendations: string[];
  timestamp: number;
}

export class QualityAssuranceManager {
  /**
   * 验证输出完整性
   */
  validateCompleteness(result: any): CompletenessValidation {
    const missingFields: string[] = [];
    const invalidFields: { field: string; reason: string }[] = [];
    const warnings: string[] = [];

    // 验证顶层字段
    const requiredTopFields = ['meta', 'observations', 'forStudent', 'forParent', 'studyMethods', 'practicePaper', 'acceptanceQuiz'];
    for (const field of requiredTopFields) {
      if (!result[field]) {
        missingFields.push(field);
      }
    }

    // 验证 meta 字段
    if (result.meta) {
      const requiredMetaFields = ['examName', 'subject', 'score', 'fullScore'];
      for (const field of requiredMetaFields) {
        if (result.meta[field] === undefined || result.meta[field] === null) {
          missingFields.push(`meta.${field}`);
        }
      }

      // 验证分数合理性
      if (typeof result.meta.score === 'number' && typeof result.meta.fullScore === 'number') {
        if (result.meta.score > result.meta.fullScore) {
          invalidFields.push({
            field: 'meta.score',
            reason: `得分(${result.meta.score})超过满分(${result.meta.fullScore})`
          });
        }
        if (result.meta.score < 0 || result.meta.fullScore <= 0) {
          invalidFields.push({
            field: 'meta.score',
            reason: '分数不能为负数或满分不能为0'
          });
        }
      }
    }

    // 验证 observations.problems
    if (result.observations?.problems) {
      if (!Array.isArray(result.observations.problems)) {
        invalidFields.push({
          field: 'observations.problems',
          reason: '必须是数组'
        });
      } else if (result.observations.problems.length === 0) {
        warnings.push('observations.problems 为空，可能没有识别到错题');
      } else {
        // 验证每个问题的格式
        result.observations.problems.forEach((problem: any, index: number) => {
          if (typeof problem !== 'string') {
            invalidFields.push({
              field: `observations.problems[${index}]`,
              reason: '问题必须是字符串格式'
            });
          } else {
            // 检查是否包含必需的标记
            const requiredMarkers = ['【知识点】', '【题号】', '【得分】', '【错因】', '【证据】', '【置信度】', '【最短改法】'];
            const missingMarkers = requiredMarkers.filter(marker => !problem.includes(marker));
            if (missingMarkers.length > 0) {
              warnings.push(`问题 ${index + 1} 缺少标记: ${missingMarkers.join(', ')}`);
            }

            // 检查得分格式
            const scoreMatch = problem.match(/【得分】(\d+)\/(\d+)/);
            if (!scoreMatch) {
              warnings.push(`问题 ${index + 1} 得分格式不正确，应为 "X/Y"`);
            }
          }
        });
      }
    } else {
      missingFields.push('observations.problems');
    }

    // 验证 forStudent
    if (result.forStudent) {
      if (!result.forStudent.overall) {
        missingFields.push('forStudent.overall');
      }
      if (!Array.isArray(result.forStudent.problems) || result.forStudent.problems.length === 0) {
        warnings.push('forStudent.problems 为空');
      }
      if (!Array.isArray(result.forStudent.advice) || result.forStudent.advice.length === 0) {
        warnings.push('forStudent.advice 为空');
      }
    }

    // 验证 forParent
    if (result.forParent) {
      if (!result.forParent.summary) {
        missingFields.push('forParent.summary');
      }
      if (!result.forParent.guidance) {
        missingFields.push('forParent.guidance');
      }
    }

    // 验证 studyMethods
    if (result.studyMethods) {
      if (!Array.isArray(result.studyMethods.methods) || result.studyMethods.methods.length === 0) {
        warnings.push('studyMethods.methods 为空');
      }
      if (!Array.isArray(result.studyMethods.weekPlan) || result.studyMethods.weekPlan.length === 0) {
        warnings.push('studyMethods.weekPlan 为空');
      }
    }

    // 验证 practicePaper
    if (result.practicePaper) {
      if (!result.practicePaper.title) {
        missingFields.push('practicePaper.title');
      }
      if (!Array.isArray(result.practicePaper.sections) || result.practicePaper.sections.length === 0) {
        warnings.push('practicePaper.sections 为空');
      }
    }

    // 验证 acceptanceQuiz
    if (result.acceptanceQuiz) {
      if (!result.acceptanceQuiz.title) {
        missingFields.push('acceptanceQuiz.title');
      }
      if (!Array.isArray(result.acceptanceQuiz.questions) || result.acceptanceQuiz.questions.length === 0) {
        warnings.push('acceptanceQuiz.questions 为空');
      }
    }

    const passed = missingFields.length === 0 && invalidFields.length === 0;

    return {
      passed,
      missingFields,
      invalidFields,
      warnings
    };
  }

  /**
   * 计算质量指标
   */
  calculateQualityMetrics(result: any, extractedData?: any): QualityMetrics {
    // 1. 识别置信度
    const recognitionConfidence = this.calculateRecognitionConfidence(extractedData);

    // 2. 分析置信度
    const analysisConfidence = this.calculateAnalysisConfidence(result);

    // 3. 证据完整性
    const evidenceCompleteness = this.calculateEvidenceCompleteness(result);

    // 4. 内容可读性
    const contentReadability = this.calculateContentReadability(result);

    // 5. 总体质量分数（加权平均）
    const overallScore = Math.round(
      recognitionConfidence * 0.25 * 100 +
      analysisConfidence * 0.30 * 100 +
      evidenceCompleteness * 0.25 * 100 +
      contentReadability * 0.20 * 100
    );

    return {
      recognitionConfidence,
      analysisConfidence,
      evidenceCompleteness,
      contentReadability,
      overallScore
    };
  }

  /**
   * 计算识别置信度
   */
  private calculateRecognitionConfidence(extractedData?: any): number {
    if (!extractedData) return 0.8; // 默认值

    let score = 1.0;
    const problems = extractedData.observations?.problems || [];

    // 检查低置信度问题的比例
    let lowConfidenceCount = 0;
    problems.forEach((problem: string) => {
      if (problem.includes('【置信度】低') || problem.includes('【置信度】中')) {
        lowConfidenceCount++;
      }
    });

    if (problems.length > 0) {
      const lowConfidenceRatio = lowConfidenceCount / problems.length;
      score = 1.0 - (lowConfidenceRatio * 0.3); // 低置信度问题最多扣30%
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 计算分析置信度
   */
  private calculateAnalysisConfidence(result: any): number {
    let score = 1.0;

    // 检查分析内容的完整性
    const problems = result.observations?.problems || [];
    if (problems.length === 0) {
      return 0.3; // 没有问题，置信度很低
    }

    // 检查每个问题是否有完整的分析
    let incompleteCount = 0;
    problems.forEach((problem: string) => {
      const hasKnowledge = problem.includes('【知识点】');
      const hasEvidence = problem.includes('【证据】');
      const hasFix = problem.includes('【最短改法】');
      
      if (!hasKnowledge || !hasEvidence || !hasFix) {
        incompleteCount++;
      }
    });

    if (problems.length > 0) {
      const incompleteRatio = incompleteCount / problems.length;
      score = 1.0 - (incompleteRatio * 0.5); // 不完整问题最多扣50%
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 计算证据完整性
   */
  private calculateEvidenceCompleteness(result: any): number {
    const problems = result.observations?.problems || [];
    if (problems.length === 0) return 0.5;

    let completeCount = 0;
    problems.forEach((problem: string) => {
      // 检查是否包含所有必需的证据元素
      const hasQuestionNo = problem.includes('【题号】');
      const hasScore = problem.includes('【得分】') && /【得分】\d+\/\d+/.test(problem);
      const hasEvidence = problem.includes('【证据】');
      const hasConfidence = problem.includes('【置信度】');

      if (hasQuestionNo && hasScore && hasEvidence && hasConfidence) {
        completeCount++;
      }
    });

    return completeCount / problems.length;
  }

  /**
   * 计算内容可读性
   */
  private calculateContentReadability(result: any): number {
    const content = JSON.stringify(result);
    let score = 1.0;

    // 检查是否包含不可读字符
    const issues: string[] = [];

    // 检查 Markdown 代码块
    if (content.includes('```')) {
      issues.push('包含Markdown代码块');
      score -= 0.3;
    }

    // 检查 LaTeX 代码
    if (/\$[^$]+\$/.test(content)) {
      issues.push('包含LaTeX代码');
      score -= 0.3;
    }

    // 检查控制字符
    if (/[\x00-\x1F\x7F-\x9F]/.test(content)) {
      issues.push('包含控制字符');
      score -= 0.2;
    }

    // 检查 BOM
    if (content.includes('\uFEFF')) {
      issues.push('包含BOM字符');
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 生成质量报告
   */
  generateQualityReport(result: any, extractedData?: any): QualityReport {
    const completeness = this.validateCompleteness(result);
    const metrics = this.calculateQualityMetrics(result, extractedData);
    const recommendations: string[] = [];

    // 根据质量指标生成建议
    if (metrics.recognitionConfidence < 0.8) {
      recommendations.push('识别置信度较低，建议检查图片质量或重新拍照');
    }

    if (metrics.analysisConfidence < 0.8) {
      recommendations.push('分析置信度较低，建议补充更多证据或人工审核');
    }

    if (metrics.evidenceCompleteness < 0.8) {
      recommendations.push('证据完整性不足，建议补充题号、得分、证据等信息');
    }

    if (metrics.contentReadability < 0.9) {
      recommendations.push('内容可读性有问题，建议检查输出清洗流程');
    }

    if (metrics.overallScore < 70) {
      recommendations.push('整体质量较低，建议重新分析或人工介入');
    }

    // 添加完整性相关的建议
    if (!completeness.passed) {
      if (completeness.missingFields.length > 0) {
        recommendations.push(`缺少必需字段: ${completeness.missingFields.join(', ')}`);
      }
      if (completeness.invalidFields.length > 0) {
        completeness.invalidFields.forEach(({ field, reason }) => {
          recommendations.push(`字段 ${field} 无效: ${reason}`);
        });
      }
    }

    return {
      metrics,
      completeness,
      recommendations,
      timestamp: Date.now()
    };
  }
}

// 单例实例
let qaManagerInstance: QualityAssuranceManager | null = null;

export function getQualityAssuranceManager(): QualityAssuranceManager {
  if (!qaManagerInstance) {
    qaManagerInstance = new QualityAssuranceManager();
  }
  return qaManagerInstance;
}
