// =================================================================================
// 置信度评估器 (Confidence Evaluator)
// 评估推断结果的可信度
// =================================================================================

import { InferenceResult } from './multi-dimension-inferencer';

export interface ConfidenceEvaluation {
  level: 'high' | 'medium' | 'low' | 'very-low';
  score: number;  // 0-1
  factors: {
    titleClarity: number;      // 标题清晰度
    knowledgeConsistency: number;  // 知识点一致性
    difficultyAlignment: number;   // 难度对齐度
    dimensionAgreement: number;    // 维度一致性
  };
  recommendations: string[];  // 改进建议
}

export class ConfidenceEvaluator {
  /**
   * 评估推断结果的置信度
   */
  evaluate(inference: InferenceResult): ConfidenceEvaluation {
    const factors = {
      titleClarity: this.evaluateTitleClarity(inference),
      knowledgeConsistency: this.evaluateKnowledgeConsistency(inference),
      difficultyAlignment: this.evaluateDifficultyAlignment(inference),
      dimensionAgreement: this.evaluateDimensionAgreement(inference)
    };

    // 综合评分：加权平均
    const score = (
      factors.titleClarity * 0.25 +
      factors.knowledgeConsistency * 0.35 +
      factors.difficultyAlignment * 0.20 +
      factors.dimensionAgreement * 0.20
    );

    // 确定置信度级别
    let level: 'high' | 'medium' | 'low' | 'very-low';
    if (score >= 0.8) {
      level = 'high';
    } else if (score >= 0.6) {
      level = 'medium';
    } else if (score >= 0.4) {
      level = 'low';
    } else {
      level = 'very-low';
    }

    // 生成建议
    const recommendations = this.generateRecommendations(factors, level);

    console.log(`✅ [Confidence Evaluator] 置信度评估: ${level} (${(score * 100).toFixed(0)}%)`);

    return { level, score, factors, recommendations };
  }

  /**
   * 评估标题清晰度
   */
  private evaluateTitleClarity(inference: InferenceResult): number {
    const titleDimension = inference.dimensions.find(d => d.dimension === 'title');
    if (!titleDimension) return 0;

    // 如果标题明确包含年级，置信度高
    if (titleDimension.grade !== '未知' && titleDimension.confidence > 0.8) {
      return 0.9;
    } else if (titleDimension.grade !== '未知') {
      return 0.6;
    } else {
      return 0.3;
    }
  }

  /**
   * 评估知识点一致性
   */
  private evaluateKnowledgeConsistency(inference: InferenceResult): number {
    const knowledgeDimension = inference.dimensions.find(d => d.dimension === 'knowledge');
    if (!knowledgeDimension) return 0;

    return knowledgeDimension.confidence;
  }

  /**
   * 评估难度对齐度
   */
  private evaluateDifficultyAlignment(inference: InferenceResult): number {
    const difficultyDimension = inference.dimensions.find(d => d.dimension === 'difficulty');
    if (!difficultyDimension) return 0.5;

    return difficultyDimension.confidence;
  }

  /**
   * 评估维度一致性
   */
  private evaluateDimensionAgreement(inference: InferenceResult): number {
    const grades = inference.dimensions
      .map(d => d.grade)
      .filter(g => g !== '未知');

    if (grades.length === 0) return 0;

    // 检查是否所有维度一致
    const uniqueGrades = new Set(grades);
    if (uniqueGrades.size === 1) {
      return 1.0; // 完全一致
    } else if (uniqueGrades.size === 2) {
      return 0.6; // 轻微冲突
    } else {
      return 0.3; // 严重冲突
    }
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    factors: ConfidenceEvaluation['factors'],
    level: ConfidenceEvaluation['level']
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'very-low' || level === 'low') {
      recommendations.push('建议重新上传更清晰的试卷图片');
      recommendations.push('确保试卷标题完整可见');
    }

    if (factors.titleClarity < 0.5) {
      recommendations.push('试卷标题不清晰，建议确认年级信息');
    }

    if (factors.knowledgeConsistency < 0.5) {
      recommendations.push('知识点匹配度较低，可能需要扩充知识点库');
    }

    if (factors.dimensionAgreement < 0.5) {
      recommendations.push('多个维度推断结果冲突，建议人工确认');
    }

    return recommendations;
  }

  /**
   * 判断是否应该使用用户输入
   */
  shouldUseUserInput(confidence: ConfidenceEvaluation): boolean {
    // 只有在置信度极低时才考虑使用用户输入
    return confidence.level === 'very-low';
  }

  /**
   * 生成警告信息
   */
  generateWarningMessage(confidence: ConfidenceEvaluation): string {
    if (confidence.level === 'high') {
      return '✅ 识别置信度高，可直接使用';
    } else if (confidence.level === 'medium') {
      return '⚠️ 识别置信度中等，建议核对';
    } else if (confidence.level === 'low') {
      return '⚠️ 识别置信度较低，建议人工确认';
    } else {
      return '❌ 识别置信度极低，请重新上传清晰的试卷图片';
    }
  }
}

// 单例模式
let evaluatorInstance: ConfidenceEvaluator | null = null;

export function getConfidenceEvaluator(): ConfidenceEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new ConfidenceEvaluator();
  }
  return evaluatorInstance;
}
