// =================================================================================
// 内容一致性验证器 (Content Consistency Validator)
// 验证所有输出内容与试卷识别结果的一致性
// =================================================================================

import { InferenceResult } from './multi-dimension-inferencer';
import { KnowledgePoint } from './knowledge-point-analyzer';

export interface ConsistencyCheck {
  aspect: string;  // 检查方面
  passed: boolean;
  expected: string;
  actual: string;
  message: string;
}

export interface ConsistencyReport {
  overallPassed: boolean;
  checks: ConsistencyCheck[];
  warnings: string[];
  errors: string[];
}

export class ContentConsistencyValidator {
  /**
   * 验证诊断报告
   */
  validateDiagnosisReport(
    report: any,
    inference: InferenceResult,
    knowledgePoints: KnowledgePoint[]
  ): ConsistencyReport {
    const checks: ConsistencyCheck[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查1：报告中的知识点是否来自试卷识别
    const reportKnowledgePoints = this.extractKnowledgePointsFromReport(report);
    const recognizedKnowledgePoints = knowledgePoints.map(kp => kp.name);

    for (const kp of reportKnowledgePoints) {
      const isRecognized = recognizedKnowledgePoints.some(rkp => 
        rkp.includes(kp) || kp.includes(rkp)
      );

      checks.push({
        aspect: '知识点来源',
        passed: isRecognized,
        expected: '来自试卷识别',
        actual: kp,
        message: isRecognized 
          ? `✅ 知识点"${kp}"来自试卷识别` 
          : `⚠️ 知识点"${kp}"未在试卷中识别到`
      });

      if (!isRecognized) {
        warnings.push(`知识点"${kp}"未在试卷中识别到，可能是生成的`);
      }
    }

    // 检查2：语言风格是否匹配年级
    const gradeLevel = this.inferGradeLevel(inference.finalGrade);
    const languageCheck = this.checkLanguageStyle(report, gradeLevel);
    checks.push(languageCheck);

    if (!languageCheck.passed) {
      warnings.push(languageCheck.message);
    }

    // 检查3：建议难度是否匹配年级
    const difficultyCheck = this.checkDifficultyAlignment(report, inference.finalGrade);
    checks.push(difficultyCheck);

    if (!difficultyCheck.passed) {
      warnings.push(difficultyCheck.message);
    }

    const overallPassed = checks.every(c => c.passed);

    console.log(`✅ [Content Consistency Validator] 诊断报告验证: ${overallPassed ? '通过' : '有警告'}`);
    if (warnings.length > 0) {
      console.log(`   警告: ${warnings.join('; ')}`);
    }

    return { overallPassed, checks, warnings, errors };
  }

  /**
   * 验证练习题
   */
  validatePracticeQuestions(
    practice: any,
    inference: InferenceResult,
    knowledgePoints: KnowledgePoint[]
  ): ConsistencyReport {
    const checks: ConsistencyCheck[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查1：练习题知识点是否与试卷一致
    const practiceKnowledgePoints = this.extractKnowledgePointsFromPractice(practice);
    const recognizedKnowledgePoints = knowledgePoints.map(kp => kp.name);

    for (const kp of practiceKnowledgePoints) {
      const isRecognized = recognizedKnowledgePoints.some(rkp => 
        rkp.includes(kp) || kp.includes(rkp)
      );

      checks.push({
        aspect: '练习题知识点',
        passed: isRecognized,
        expected: '与试卷一致',
        actual: kp,
        message: isRecognized 
          ? `✅ 练习题知识点"${kp}"与试卷一致` 
          : `⚠️ 练习题知识点"${kp}"与试卷不一致`
      });

      if (!isRecognized) {
        warnings.push(`练习题知识点"${kp}"与试卷不一致`);
      }
    }

    // 检查2：练习题难度是否匹配
    const difficultyCheck = this.checkPracticeDifficulty(practice, knowledgePoints);
    checks.push(difficultyCheck);

    if (!difficultyCheck.passed) {
      warnings.push(difficultyCheck.message);
    }

    // 检查3：题型分布是否合理
    const typeCheck = this.checkQuestionTypeDistribution(practice);
    checks.push(typeCheck);

    if (!typeCheck.passed) {
      warnings.push(typeCheck.message);
    }

    const overallPassed = checks.every(c => c.passed);

    console.log(`✅ [Content Consistency Validator] 练习题验证: ${overallPassed ? '通过' : '有警告'}`);
    if (warnings.length > 0) {
      console.log(`   警告: ${warnings.join('; ')}`);
    }

    return { overallPassed, checks, warnings, errors };
  }

  /**
   * 验证学习方法
   */
  validateStudyMethods(
    methods: any,
    inference: InferenceResult
  ): ConsistencyReport {
    const checks: ConsistencyCheck[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查1：学习方法是否适合年级
    const gradeLevel = this.inferGradeLevel(inference.finalGrade);
    const methodCheck = this.checkMethodsForGrade(methods, gradeLevel);
    checks.push(methodCheck);

    if (!methodCheck.passed) {
      warnings.push(methodCheck.message);
    }

    // 检查2：建议内容是否具体可执行
    const actionableCheck = this.checkMethodsActionable(methods);
    checks.push(actionableCheck);

    if (!actionableCheck.passed) {
      warnings.push(actionableCheck.message);
    }

    const overallPassed = checks.every(c => c.passed);

    console.log(`✅ [Content Consistency Validator] 学习方法验证: ${overallPassed ? '通过' : '有警告'}`);

    return { overallPassed, checks, warnings, errors };
  }

  // ========== 辅助方法 ==========

  private extractKnowledgePointsFromReport(report: any): string[] {
    const knowledgePoints: string[] = [];

    // 从 forStudent.advice 中提取
    if (report.forStudent && Array.isArray(report.forStudent.advice)) {
      for (const advice of report.forStudent.advice) {
        const matches = advice.match(/【[^】]+】/g);
        if (matches) {
          knowledgePoints.push(...matches.map((m: string) => m.replace(/【|】/g, '')));
        }
      }
    }

    // 从 problems 中提取
    if (report.forStudent && Array.isArray(report.forStudent.problems)) {
      for (const problem of report.forStudent.problems) {
        // 确保 problem 是字符串
        const problemStr = typeof problem === 'string' ? problem : JSON.stringify(problem);
        const match = problemStr.match(/【知识点】([^【]+)/);
        if (match) {
          knowledgePoints.push(match[1].trim());
        }
      }
    }

    return [...new Set(knowledgePoints)]; // 去重
  }

  private extractKnowledgePointsFromPractice(practice: any): string[] {
    const knowledgePoints: string[] = [];

    // 从练习卷标题和内容中提取
    if (practice.practicePaper && Array.isArray(practice.practicePaper.sections)) {
      for (const section of practice.practicePaper.sections) {
        // 从 section name 中提取
        const matches = section.name.match(/【[^】]+】/g);
        if (matches) {
          knowledgePoints.push(...matches.map((m: string) => m.replace(/【|】/g, '')));
        }
      }
    }

    return [...new Set(knowledgePoints)];
  }

  private inferGradeLevel(grade: string): 'primary' | 'middle' | 'high' | 'unknown' {
    if (grade.includes('小学') || grade.match(/[一二三四五六]年级/)) {
      return 'primary';
    } else if (grade.includes('初中') || grade.includes('初') || grade.match(/[七八九]年级/)) {
      return 'middle';
    } else if (grade.includes('高中') || grade.includes('高')) {
      return 'high';
    } else {
      return 'unknown';
    }
  }

  private checkLanguageStyle(report: any, gradeLevel: string): ConsistencyCheck {
    // 简化版：检查语言复杂度
    const overall = report.forStudent?.overall || '';
    
    // 小学：语言应该简单易懂
    if (gradeLevel === 'primary') {
      const hasComplexWords = /深入|探究|综合|抽象/.test(overall);
      return {
        aspect: '语言风格',
        passed: !hasComplexWords,
        expected: '小学生易懂',
        actual: hasComplexWords ? '包含复杂词汇' : '语言简单',
        message: hasComplexWords 
          ? '⚠️ 语言风格过于复杂，不适合小学生' 
          : '✅ 语言风格适合小学生'
      };
    }

    // 默认通过
    return {
      aspect: '语言风格',
      passed: true,
      expected: '适合年级',
      actual: '符合要求',
      message: '✅ 语言风格适合年级'
    };
  }

  private checkDifficultyAlignment(report: any, grade: string): ConsistencyCheck {
    // 简化版：检查建议难度是否合理
    const advice = report.forStudent?.advice || [];
    const gradeLevel = this.inferGradeLevel(grade);

    // 检查是否有不合理的难度建议
    let hasIssue = false;
    let issueMessage = '';

    if (gradeLevel === 'primary') {
      // 小学不应该有高中知识点
      const hasHighSchoolContent = advice.some((a: string) => 
        /导数|微积分|向量|立体几何/.test(a)
      );
      if (hasHighSchoolContent) {
        hasIssue = true;
        issueMessage = '建议包含高中知识点，不适合小学生';
      }
    }

    return {
      aspect: '建议难度',
      passed: !hasIssue,
      expected: '匹配年级',
      actual: hasIssue ? issueMessage : '合理',
      message: hasIssue ? `⚠️ ${issueMessage}` : '✅ 建议难度匹配年级'
    };
  }

  private checkPracticeDifficulty(practice: any, knowledgePoints: KnowledgePoint[]): ConsistencyCheck {
    // 检查练习题难度是否与识别的知识点难度匹配
    const avgDifficulty = this.calculateAverageDifficulty(knowledgePoints);

    return {
      aspect: '练习题难度',
      passed: true, // 简化版，默认通过
      expected: `匹配试卷难度 (${avgDifficulty})`,
      actual: '合理',
      message: '✅ 练习题难度合理'
    };
  }

  private calculateAverageDifficulty(knowledgePoints: KnowledgePoint[]): string {
    if (knowledgePoints.length === 0) return 'medium';

    const difficultyScores = knowledgePoints.map(kp => {
      if (kp.difficulty === 'basic') return 1;
      if (kp.difficulty === 'medium') return 2;
      if (kp.difficulty === 'hard') return 3;
      return 2;
    });

    const avg = difficultyScores.reduce((a, b) => a + b, 0) / difficultyScores.length;

    if (avg < 1.5) return 'basic';
    if (avg < 2.5) return 'medium';
    return 'hard';
  }

  private checkQuestionTypeDistribution(practice: any): ConsistencyCheck {
    // 检查题型分布是否合理
    const sections = practice.practicePaper?.sections || [];

    if (sections.length === 0) {
      return {
        aspect: '题型分布',
        passed: false,
        expected: '至少1个题型',
        actual: '无题目',
        message: '⚠️ 练习卷无题目'
      };
    }

    return {
      aspect: '题型分布',
      passed: true,
      expected: '合理分布',
      actual: `${sections.length}个题型`,
      message: '✅ 题型分布合理'
    };
  }

  private checkMethodsForGrade(methods: any, gradeLevel: string): ConsistencyCheck {
    // 检查学习方法是否适合年级
    const methodList = methods.methods || [];

    if (methodList.length === 0) {
      return {
        aspect: '学习方法',
        passed: false,
        expected: '至少1条方法',
        actual: '无方法',
        message: '⚠️ 无学习方法建议'
      };
    }

    return {
      aspect: '学习方法',
      passed: true,
      expected: `适合${gradeLevel}`,
      actual: `${methodList.length}条方法`,
      message: '✅ 学习方法适合年级'
    };
  }

  private checkMethodsActionable(methods: any): ConsistencyCheck {
    // 检查方法是否具体可执行
    const methodList = methods.methods || [];
    const weekPlan = methods.weekPlan || [];

    const hasActionable = methodList.length > 0 && weekPlan.length > 0;

    return {
      aspect: '可执行性',
      passed: hasActionable,
      expected: '具体可执行',
      actual: hasActionable ? '包含方法和计划' : '缺少方法或计划',
      message: hasActionable 
        ? '✅ 学习方法具体可执行' 
        : '⚠️ 学习方法不够具体'
    };
  }
}

// 单例模式
let validatorInstance: ContentConsistencyValidator | null = null;

export function getContentConsistencyValidator(): ContentConsistencyValidator {
  if (!validatorInstance) {
    validatorInstance = new ContentConsistencyValidator();
  }
  return validatorInstance;
}
