// =================================================================================
// 低置信度警告管理器 (Low Confidence Warning Manager)
// 为低置信度结果生成警告提示
// =================================================================================

export interface LowConfidenceWarning {
  hasWarning: boolean;
  level: 'none' | 'low' | 'medium' | 'high';
  message: string;
  suggestions: string[];
  affectedItems: string[];
}

export interface ConfidenceCheckResult {
  overallConfidence: number;
  recognitionConfidence?: number;
  analysisConfidence?: number;
  evidenceCompleteness?: number;
  lowConfidenceProblems?: Array<{
    index: number;
    description: string;
    confidence: string;
  }>;
}

/**
 * 低置信度警告管理器
 * 检测低置信度情况并生成用户友好的警告
 */
export class LowConfidenceWarningManager {
  /**
   * 生成低置信度警告
   */
  generateWarning(confidenceData: ConfidenceCheckResult): LowConfidenceWarning {
    const {
      overallConfidence,
      recognitionConfidence,
      analysisConfidence,
      evidenceCompleteness,
      lowConfidenceProblems = []
    } = confidenceData;

    // 判断警告级别
    const level = this.determineWarningLevel(overallConfidence);
    
    if (level === 'none') {
      return {
        hasWarning: false,
        level: 'none',
        message: '',
        suggestions: [],
        affectedItems: []
      };
    }

    // 生成警告消息
    const message = this.generateWarningMessage(level, overallConfidence);
    
    // 生成建议
    const suggestions = this.generateSuggestions(
      level,
      recognitionConfidence,
      analysisConfidence,
      evidenceCompleteness,
      lowConfidenceProblems
    );

    // 收集受影响的项目
    const affectedItems = this.collectAffectedItems(
      recognitionConfidence,
      analysisConfidence,
      evidenceCompleteness,
      lowConfidenceProblems
    );

    return {
      hasWarning: true,
      level,
      message,
      suggestions,
      affectedItems
    };
  }

  /**
   * 确定警告级别
   */
  private determineWarningLevel(overallConfidence: number): 'none' | 'low' | 'medium' | 'high' {
    if (overallConfidence >= 0.80) {
      return 'none'; // 置信度≥80%，无需警告
    } else if (overallConfidence >= 0.70) {
      return 'low'; // 70-80%，低级警告
    } else if (overallConfidence >= 0.60) {
      return 'medium'; // 60-70%，中级警告
    } else {
      return 'high'; // <60%，高级警告
    }
  }

  /**
   * 生成警告消息
   */
  private generateWarningMessage(level: 'low' | 'medium' | 'high', confidence: number): string {
    const confidencePercent = Math.round(confidence * 100);

    switch (level) {
      case 'low':
        return `识别置信度为 ${confidencePercent}%，建议人工复核部分结果`;
      
      case 'medium':
        return `识别置信度为 ${confidencePercent}%，建议仔细核对分析结果`;
      
      case 'high':
        return `识别置信度较低（${confidencePercent}%），强烈建议重新拍照或人工审核`;
      
      default:
        return '';
    }
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    level: 'low' | 'medium' | 'high',
    recognitionConfidence?: number,
    analysisConfidence?: number,
    evidenceCompleteness?: number,
    lowConfidenceProblems?: Array<any>
  ): string[] {
    const suggestions: string[] = [];

    // 根据警告级别添加通用建议
    if (level === 'high') {
      suggestions.push('强烈建议重新拍摄更清晰的试卷照片');
      suggestions.push('确保光线充足，避免反光和阴影');
      suggestions.push('保持试卷平整，避免折叠和褶皱');
    } else if (level === 'medium') {
      suggestions.push('建议仔细核对分析结果的准确性');
      suggestions.push('如发现错误，可以手动修正');
    } else {
      suggestions.push('请核对标注为低置信度的分析项');
    }

    // 根据具体问题添加针对性建议
    if (recognitionConfidence !== undefined && recognitionConfidence < 0.7) {
      suggestions.push('图片识别质量较低，建议重新拍照');
      suggestions.push('确保试卷文字清晰可见，字迹工整');
    }

    if (analysisConfidence !== undefined && analysisConfidence < 0.7) {
      suggestions.push('分析结果可能不够准确，建议人工审核');
    }

    if (evidenceCompleteness !== undefined && evidenceCompleteness < 0.7) {
      suggestions.push('部分分析缺少完整证据，建议补充信息');
    }

    if (lowConfidenceProblems && lowConfidenceProblems.length > 0) {
      const count = lowConfidenceProblems.length;
      suggestions.push(`有 ${count} 个错因分析的置信度较低，请重点核对`);
    }

    // 去重
    return Array.from(new Set(suggestions));
  }

  /**
   * 收集受影响的项目
   */
  private collectAffectedItems(
    recognitionConfidence?: number,
    analysisConfidence?: number,
    evidenceCompleteness?: number,
    lowConfidenceProblems?: Array<any>
  ): string[] {
    const items: string[] = [];

    if (recognitionConfidence !== undefined && recognitionConfidence < 0.7) {
      items.push('图片识别');
    }

    if (analysisConfidence !== undefined && analysisConfidence < 0.7) {
      items.push('错因分析');
    }

    if (evidenceCompleteness !== undefined && evidenceCompleteness < 0.7) {
      items.push('证据完整性');
    }

    if (lowConfidenceProblems && lowConfidenceProblems.length > 0) {
      lowConfidenceProblems.forEach((problem, index) => {
        items.push(`错因 ${index + 1}: ${problem.description?.substring(0, 30) || '未知'}...`);
      });
    }

    return items;
  }

  /**
   * 从分析结果中提取低置信度问题
   */
  extractLowConfidenceProblems(result: any): Array<{ index: number; description: string; confidence: string }> {
    const problems: Array<{ index: number; description: string; confidence: string }> = [];

    if (!result || !result.observations || !Array.isArray(result.observations.problems)) {
      return problems;
    }

    result.observations.problems.forEach((problem: string, index: number) => {
      // 检查是否包含低置信度标记
      if (problem.includes('【置信度】低') || problem.includes('【置信度】中')) {
        const confidenceMatch = problem.match(/【置信度】(高|中|低)/);
        const confidence = confidenceMatch ? confidenceMatch[1] : '未知';
        
        // 提取知识点作为描述
        const knowledgeMatch = problem.match(/【知识点】([^【]+)/);
        const description = knowledgeMatch ? knowledgeMatch[1].trim() : '未知知识点';

        problems.push({
          index: index + 1,
          description,
          confidence
        });
      }
    });

    return problems;
  }
}

// 单例模式
let managerInstance: LowConfidenceWarningManager | null = null;

export function getLowConfidenceWarningManager(): LowConfidenceWarningManager {
  if (!managerInstance) {
    managerInstance = new LowConfidenceWarningManager();
  }
  return managerInstance;
}
