// =================================================================================
// 证据验证器 (Evidence Validator)
// 验证错因分析的证据完整性，确保包含所有必需字段
// =================================================================================

export interface EvidenceValidationResult {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
  warnings: string[];
  problem: string;
}

export interface EvidenceValidationSummary {
  totalProblems: number;
  validProblems: number;
  invalidProblems: number;
  completenessRate: number;
  issues: EvidenceValidationResult[];
}

/**
 * 证据验证器
 * 检查每个错因分析是否包含完整的六要素：
 * 1. 【知识点】
 * 2. 【题号】
 * 3. 【得分】(格式: X/Y)
 * 4. 【错因】
 * 5. 【证据】
 * 6. 【置信度】
 * 7. 【最短改法】
 */
export class EvidenceValidator {
  private readonly REQUIRED_FIELDS = [
    '知识点',
    '题号',
    '得分',
    '错因',
    '证据',
    '置信度',
    '最短改法'
  ];

  /**
   * 验证单个问题的证据完整性
   */
  validateProblem(problem: string): EvidenceValidationResult {
    const missingFields: string[] = [];
    const invalidFields: string[] = [];
    const warnings: string[] = [];

    // 检查每个必需字段
    for (const field of this.REQUIRED_FIELDS) {
      const regex = new RegExp(`【${field}】([^【]+)`, 'g');
      const match = regex.exec(problem);

      if (!match) {
        missingFields.push(field);
      } else {
        const value = match[1].trim();
        
        // 验证字段内容
        if (value.length === 0) {
          invalidFields.push(`${field}（内容为空）`);
        }

        // 特殊验证：得分格式
        if (field === '得分') {
          if (!/^\d+\/\d+$/.test(value)) {
            invalidFields.push(`${field}（格式错误，应为"X/Y"格式，实际为"${value}"）`);
          }
        }

        // 特殊验证：题号非空
        if (field === '题号' && value === '未知') {
          warnings.push(`${field}标记为"未知"，建议明确题号`);
        }

        // 特殊验证：证据非空且有实质内容
        if (field === '证据' && value.length < 5) {
          warnings.push(`${field}内容过短（${value.length}字符），建议提供更详细的证据`);
        }

        // 特殊验证：置信度
        if (field === '置信度') {
          const validLevels = ['高', '中', '低'];
          if (!validLevels.includes(value)) {
            invalidFields.push(`${field}（无效值"${value}"，应为：高/中/低）`);
          }
        }
      }
    }

    const isValid = missingFields.length === 0 && invalidFields.length === 0;

    return {
      isValid,
      missingFields,
      invalidFields,
      warnings,
      problem
    };
  }

  /**
   * 验证所有问题的证据完整性
   */
  validateProblems(problems: string[]): EvidenceValidationSummary {
    if (!Array.isArray(problems) || problems.length === 0) {
      return {
        totalProblems: 0,
        validProblems: 0,
        invalidProblems: 0,
        completenessRate: 0,
        issues: []
      };
    }

    const issues: EvidenceValidationResult[] = [];
    let validCount = 0;

    for (const problem of problems) {
      const result = this.validateProblem(problem);
      if (!result.isValid) {
        issues.push(result);
      } else {
        validCount++;
      }
    }

    const completenessRate = problems.length > 0 
      ? (validCount / problems.length) * 100 
      : 0;

    return {
      totalProblems: problems.length,
      validProblems: validCount,
      invalidProblems: issues.length,
      completenessRate,
      issues
    };
  }

  /**
   * 生成验证报告
   */
  generateReport(summary: EvidenceValidationSummary): string {
    if (summary.totalProblems === 0) {
      return '⚠️ 没有找到错因分析';
    }

    const lines: string[] = [];
    lines.push('📋 证据完整性验证报告');
    lines.push('='.repeat(60));
    lines.push(`总问题数: ${summary.totalProblems}`);
    lines.push(`完整问题: ${summary.validProblems} (${summary.completenessRate.toFixed(1)}%)`);
    lines.push(`不完整问题: ${summary.invalidProblems}`);
    lines.push('');

    if (summary.issues.length > 0) {
      lines.push('❌ 不完整的问题:');
      lines.push('');

      summary.issues.forEach((issue, index) => {
        lines.push(`问题 ${index + 1}:`);
        lines.push(`内容: ${issue.problem.substring(0, 100)}...`);
        
        if (issue.missingFields.length > 0) {
          lines.push(`  缺失字段: ${issue.missingFields.join(', ')}`);
        }
        
        if (issue.invalidFields.length > 0) {
          lines.push(`  无效字段: ${issue.invalidFields.join(', ')}`);
        }
        
        if (issue.warnings.length > 0) {
          lines.push(`  警告: ${issue.warnings.join(', ')}`);
        }
        
        lines.push('');
      });
    } else {
      lines.push('✅ 所有问题都包含完整的证据信息');
    }

    return lines.join('\n');
  }

  /**
   * 检查是否需要重新生成
   * 如果完整性低于阈值，建议重新生成
   */
  shouldRegenerate(summary: EvidenceValidationSummary, threshold: number = 80): boolean {
    return summary.completenessRate < threshold;
  }

  /**
   * 生成修复提示
   * 用于告诉LLM如何修复不完整的证据
   */
  generateFixPrompt(summary: EvidenceValidationSummary): string {
    if (summary.issues.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('⚠️ 以下错因分析不完整，请补充缺失的字段：');
    lines.push('');

    summary.issues.forEach((issue, index) => {
      lines.push(`问题 ${index + 1}:`);
      lines.push(`原内容: ${issue.problem}`);
      
      if (issue.missingFields.length > 0) {
        lines.push(`需要补充: ${issue.missingFields.map(f => `【${f}】`).join(' ')}`);
      }
      
      if (issue.invalidFields.length > 0) {
        lines.push(`需要修正: ${issue.invalidFields.join('; ')}`);
      }
      
      lines.push('');
    });

    lines.push('请确保每个错因分析都包含以下七个字段：');
    lines.push('【知识点】【题号】【得分】【错因】【证据】【置信度】【最短改法】');
    lines.push('');
    lines.push('注意：');
    lines.push('- 【得分】必须使用"X/Y"格式（如"0/5"、"3/10"）');
    lines.push('- 【题号】不能为空或"未知"');
    lines.push('- 【证据】必须具体说明从试卷哪里看到的问题');
    lines.push('- 【置信度】只能是：高、中、低');

    return lines.join('\n');
  }
}

// 单例模式
let validatorInstance: EvidenceValidator | null = null;

export function getEvidenceValidator(): EvidenceValidator {
  if (!validatorInstance) {
    validatorInstance = new EvidenceValidator();
  }
  return validatorInstance;
}
