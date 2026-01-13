/**
 * 双模型验证器
 * 
 * 对关键信息（题号、得分）使用两个模型交叉验证，提升准确性
 * 
 * 验证策略：
 * - 关键字段（题号、得分）必须双模型一致
 * - 不一致时取置信度高的结果
 * - 都不确定时标记需要用户确认
 */

export type LLMProvider = 'doubao' | 'aliyun' | 'zhipu';
export type ValidationStatus = 'consistent' | 'inconsistent' | 'uncertain';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ProblemInfo {
  questionNo: string;
  score: string; // "得分/满分" 格式
  knowledge: string;
  errorType: string;
  evidence: string;
  confidence: ConfidenceLevel;
}

export interface ValidatedResult {
  examName: string;
  subject: string;
  score: number;
  fullScore: number;
  problems: ProblemInfo[];
  validationStatus: {
    examName: ValidationStatus;
    subject: ValidationStatus;
    score: ValidationStatus;
    fullScore: ValidationStatus;
    problems: ValidationStatus;
  };
  validationDetails: {
    primaryProvider: LLMProvider;
    secondaryProvider: LLMProvider;
    inconsistencies: ValidationInconsistency[];
    needsUserConfirmation: boolean;
  };
}

export interface ValidationInconsistency {
  field: string;
  primaryValue: any;
  secondaryValue: any;
  selectedValue: any;
  reason: string;
}

export interface ExtractedData {
  meta: {
    examName: string;
    subject: string;
    score: number;
    fullScore: number;
    [key: string]: any;
  };
  observations: {
    problems: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * 双模型验证器类
 */
export class DualModelValidator {
  /**
   * 验证关键信息
   * @param primaryResult 主模型识别结果
   * @param secondaryResult 辅助模型识别结果
   * @param primaryProvider 主模型提供商
   * @param secondaryProvider 辅助模型提供商
   * @returns 验证后的结果
   */
  validate(
    primaryResult: ExtractedData,
    secondaryResult: ExtractedData,
    primaryProvider: LLMProvider,
    secondaryProvider: LLMProvider
  ): ValidatedResult {
    const inconsistencies: ValidationInconsistency[] = [];
    
    // 验证考试名称
    const examNameStatus = this.compareStrings(
      primaryResult.meta.examName,
      secondaryResult.meta.examName
    );
    const examName = this.selectBestString(
      primaryResult.meta.examName,
      secondaryResult.meta.examName,
      examNameStatus,
      'examName',
      inconsistencies
    );
    
    // 验证科目
    const subjectStatus = this.compareStrings(
      primaryResult.meta.subject,
      secondaryResult.meta.subject
    );
    const subject = this.selectBestString(
      primaryResult.meta.subject,
      secondaryResult.meta.subject,
      subjectStatus,
      'subject',
      inconsistencies
    );
    
    // 验证得分
    const scoreStatus = this.compareNumbers(
      primaryResult.meta.score,
      secondaryResult.meta.score
    );
    const score = this.selectBestNumber(
      primaryResult.meta.score,
      secondaryResult.meta.score,
      scoreStatus,
      'score',
      inconsistencies
    );
    
    // 验证满分
    const fullScoreStatus = this.compareNumbers(
      primaryResult.meta.fullScore,
      secondaryResult.meta.fullScore
    );
    const fullScore = this.selectBestNumber(
      primaryResult.meta.fullScore,
      secondaryResult.meta.fullScore,
      fullScoreStatus,
      'fullScore',
      inconsistencies
    );
    
    // 验证问题列表
    const { problems, status: problemsStatus } = this.validateProblems(
      primaryResult.observations.problems,
      secondaryResult.observations.problems,
      inconsistencies
    );
    
    // 判断是否需要用户确认
    const needsUserConfirmation = inconsistencies.some(
      inc => inc.reason.includes('不一致') || inc.reason.includes('不确定')
    );
    
    return {
      examName,
      subject,
      score,
      fullScore,
      problems,
      validationStatus: {
        examName: examNameStatus,
        subject: subjectStatus,
        score: scoreStatus,
        fullScore: fullScoreStatus,
        problems: problemsStatus
      },
      validationDetails: {
        primaryProvider,
        secondaryProvider,
        inconsistencies,
        needsUserConfirmation
      }
    };
  }
  
  /**
   * 比较两个字符串
   */
  private compareStrings(str1: string, str2: string): ValidationStatus {
    const s1 = String(str1 || '').trim();
    const s2 = String(str2 || '').trim();
    
    if (!s1 || !s2) return 'uncertain';
    if (s1 === s2) return 'consistent';
    
    // 模糊匹配：去除空格、标点后比较
    const normalized1 = s1.replace(/[\s\p{P}]/gu, '').toLowerCase();
    const normalized2 = s2.replace(/[\s\p{P}]/gu, '').toLowerCase();
    
    if (normalized1 === normalized2) return 'consistent';
    
    // 相似度检查
    const similarity = this.calculateSimilarity(s1, s2);
    if (similarity > 0.8) return 'consistent';
    
    return 'inconsistent';
  }
  
  /**
   * 比较两个数字
   */
  private compareNumbers(num1: number, num2: number): ValidationStatus {
    if (!Number.isFinite(num1) || !Number.isFinite(num2)) return 'uncertain';
    if (num1 === num2) return 'consistent';
    
    // 允许小幅度差异（±1分）
    if (Math.abs(num1 - num2) <= 1) return 'consistent';
    
    return 'inconsistent';
  }
  
  /**
   * 选择最佳字符串
   */
  private selectBestString(
    str1: string,
    str2: string,
    status: ValidationStatus,
    fieldName: string,
    inconsistencies: ValidationInconsistency[]
  ): string {
    const s1 = String(str1 || '').trim();
    const s2 = String(str2 || '').trim();
    
    if (status === 'consistent') {
      return s1 || s2;
    }
    
    if (status === 'uncertain') {
      const selected = s1 || s2;
      if (s1 && s2) {
        inconsistencies.push({
          field: fieldName,
          primaryValue: s1,
          secondaryValue: s2,
          selectedValue: selected,
          reason: '两个模型结果都不确定，选择主模型结果'
        });
      }
      return selected;
    }
    
    // 不一致时，选择更长、更详细的结果
    const selected = s1.length >= s2.length ? s1 : s2;
    inconsistencies.push({
      field: fieldName,
      primaryValue: s1,
      secondaryValue: s2,
      selectedValue: selected,
      reason: `两个模型结果不一致，选择更详细的结果`
    });
    
    return selected;
  }
  
  /**
   * 选择最佳数字
   */
  private selectBestNumber(
    num1: number,
    num2: number,
    status: ValidationStatus,
    fieldName: string,
    inconsistencies: ValidationInconsistency[]
  ): number {
    if (status === 'consistent') {
      return Number.isFinite(num1) ? num1 : num2;
    }
    
    if (status === 'uncertain') {
      const selected = Number.isFinite(num1) ? num1 : num2;
      if (Number.isFinite(num1) && Number.isFinite(num2)) {
        inconsistencies.push({
          field: fieldName,
          primaryValue: num1,
          secondaryValue: num2,
          selectedValue: selected,
          reason: '两个模型结果都不确定，选择主模型结果'
        });
      }
      return selected;
    }
    
    // 不一致时，选择更合理的结果
    const selected = this.selectMoreReasonableNumber(num1, num2, fieldName);
    inconsistencies.push({
      field: fieldName,
      primaryValue: num1,
      secondaryValue: num2,
      selectedValue: selected,
      reason: `两个模型结果不一致（差异：${Math.abs(num1 - num2)}），选择更合理的结果`
    });
    
    return selected;
  }
  
  /**
   * 选择更合理的数字
   */
  private selectMoreReasonableNumber(num1: number, num2: number, fieldName: string): number {
    // 对于得分，选择较小的（更保守）
    if (fieldName === 'score') {
      return Math.min(num1, num2);
    }
    
    // 对于满分，选择更常见的值（100, 150, 120等）
    if (fieldName === 'fullScore') {
      const commonScores = [100, 150, 120, 90, 80];
      const dist1 = Math.min(...commonScores.map(s => Math.abs(num1 - s)));
      const dist2 = Math.min(...commonScores.map(s => Math.abs(num2 - s)));
      return dist1 <= dist2 ? num1 : num2;
    }
    
    // 默认选择主模型结果
    return num1;
  }
  
  /**
   * 验证问题列表
   */
  private validateProblems(
    problems1: string[],
    problems2: string[],
    inconsistencies: ValidationInconsistency[]
  ): { problems: ProblemInfo[]; status: ValidationStatus } {
    const parsed1 = problems1.map(p => this.parseProblem(p));
    const parsed2 = problems2.map(p => this.parseProblem(p));
    
    // 按题号匹配问题
    const matched = this.matchProblems(parsed1, parsed2);
    
    // 合并结果
    const problems: ProblemInfo[] = [];
    let hasInconsistency = false;
    
    for (const match of matched) {
      if (match.status === 'consistent') {
        problems.push(match.primary);
      } else if (match.status === 'inconsistent') {
        hasInconsistency = true;
        // 选择置信度更高的结果
        const selected = this.selectBestProblem(match.primary, match.secondary);
        problems.push(selected);
        
        inconsistencies.push({
          field: `problem_${match.primary.questionNo}`,
          primaryValue: match.primary,
          secondaryValue: match.secondary,
          selectedValue: selected,
          reason: `题号 ${match.primary.questionNo} 的信息不一致，选择置信度更高的结果`
        });
      } else {
        // uncertain：只有一个模型识别到
        problems.push(match.primary || match.secondary);
      }
    }
    
    const status: ValidationStatus = hasInconsistency ? 'inconsistent' : 
                                     matched.some(m => m.status === 'uncertain') ? 'uncertain' : 
                                     'consistent';
    
    return { problems, status };
  }
  
  /**
   * 解析问题字符串
   */
  private parseProblem(problemStr: string): ProblemInfo {
    const knowledge = this.extractField(problemStr, '【知识点】');
    const questionNo = this.extractField(problemStr, '【题号】');
    const score = this.extractField(problemStr, '【得分】');
    const errorType = this.extractField(problemStr, '【错因】');
    const evidence = this.extractField(problemStr, '【证据】');
    const confidenceStr = this.extractField(problemStr, '【置信度】');
    
    const confidence = this.parseConfidence(confidenceStr);
    
    return {
      knowledge,
      questionNo,
      score,
      errorType,
      evidence,
      confidence
    };
  }
  
  /**
   * 提取字段
   */
  private extractField(text: string, label: string): string {
    const regex = new RegExp(`${label}([^【]+)`, 'u');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }
  
  /**
   * 解析置信度
   */
  private parseConfidence(confidenceStr: string): ConfidenceLevel {
    const str = confidenceStr.toLowerCase();
    if (str.includes('高') || str.includes('high')) return 'high';
    if (str.includes('低') || str.includes('low')) return 'low';
    return 'medium';
  }
  
  /**
   * 匹配问题
   */
  private matchProblems(
    problems1: ProblemInfo[],
    problems2: ProblemInfo[]
  ): Array<{
    primary: ProblemInfo;
    secondary: ProblemInfo | null;
    status: ValidationStatus;
  }> {
    const matched: Array<{
      primary: ProblemInfo;
      secondary: ProblemInfo | null;
      status: ValidationStatus;
    }> = [];
    
    const used2 = new Set<number>();
    
    for (const p1 of problems1) {
      // 查找匹配的题号
      const idx2 = problems2.findIndex((p2, i) => 
        !used2.has(i) && this.isSameQuestion(p1.questionNo, p2.questionNo)
      );
      
      if (idx2 >= 0) {
        used2.add(idx2);
        const p2 = problems2[idx2];
        const status = this.compareProblem(p1, p2);
        matched.push({ primary: p1, secondary: p2, status });
      } else {
        // 只有主模型识别到
        matched.push({ primary: p1, secondary: null, status: 'uncertain' });
      }
    }
    
    // 添加只有辅助模型识别到的问题
    for (let i = 0; i < problems2.length; i++) {
      if (!used2.has(i)) {
        matched.push({ primary: problems2[i], secondary: null, status: 'uncertain' });
      }
    }
    
    return matched;
  }
  
  /**
   * 判断是否是同一题
   */
  private isSameQuestion(q1: string, q2: string): boolean {
    const n1 = this.extractQuestionNumber(q1);
    const n2 = this.extractQuestionNumber(q2);
    return n1 === n2 && n1 !== '';
  }
  
  /**
   * 提取题号数字
   */
  private extractQuestionNumber(questionNo: string): string {
    const match = questionNo.match(/\d+/);
    return match ? match[0] : '';
  }
  
  /**
   * 比较两个问题
   */
  private compareProblem(p1: ProblemInfo, p2: ProblemInfo): ValidationStatus {
    // 比较关键字段：题号、得分
    const questionNoMatch = this.isSameQuestion(p1.questionNo, p2.questionNo);
    const scoreMatch = p1.score === p2.score;
    
    if (questionNoMatch && scoreMatch) return 'consistent';
    if (!questionNoMatch) return 'uncertain';
    
    return 'inconsistent';
  }
  
  /**
   * 选择最佳问题
   */
  private selectBestProblem(p1: ProblemInfo, p2: ProblemInfo | null): ProblemInfo {
    if (!p2) return p1;
    
    // 选择置信度更高的
    const confidenceOrder: Record<ConfidenceLevel, number> = {
      high: 3,
      medium: 2,
      low: 1
    };
    
    if (confidenceOrder[p1.confidence] >= confidenceOrder[p2.confidence]) {
      return p1;
    }
    
    return p2;
  }
  
  /**
   * 计算字符串相似度（简化版Levenshtein距离）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const maxLen = Math.max(len1, len2);
    const distance = this.levenshteinDistance(str1, str2);
    
    return 1 - distance / maxLen;
  }
  
  /**
   * Levenshtein距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // 删除
          matrix[i][j - 1] + 1,      // 插入
          matrix[i - 1][j - 1] + cost // 替换
        );
      }
    }
    
    return matrix[len1][len2];
  }
}

/**
 * 单例实例
 */
let dualModelValidatorInstance: DualModelValidator | null = null;

/**
 * 获取双模型验证器实例
 */
export function getDualModelValidator(): DualModelValidator {
  if (!dualModelValidatorInstance) {
    dualModelValidatorInstance = new DualModelValidator();
  }
  return dualModelValidatorInstance;
}
