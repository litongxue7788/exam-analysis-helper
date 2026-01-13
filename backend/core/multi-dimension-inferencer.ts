// =================================================================================
// 多维度推断器 (Multi-Dimension Inferencer)
// 综合多个维度推断年级和学科
// =================================================================================

import { KnowledgePoint, getKnowledgePointAnalyzer } from './knowledge-point-analyzer';

export interface DimensionResult {
  dimension: 'title' | 'knowledge' | 'difficulty' | 'questionType';
  grade: string;
  subject: string;
  confidence: number;
  reasoning: string;
}

export interface InferenceResult {
  finalGrade: string;
  finalSubject: string;
  gradeConfidence?: number;
  subjectConfidence?: number;
  overallConfidence: number;
  dimensions: DimensionResult[];
  warnings: string[];
}

export class MultiDimensionInferencer {
  private analyzer = getKnowledgePointAnalyzer();

  /**
   * 从标题推断年级和学科
   */
  inferFromTitle(examName: string): DimensionResult {
    const name = (examName || '').trim();
    let grade = '';
    let subject = '';
    let confidence = 0;
    let reasoning = '';

    // 提取年级 - 优先匹配具体年级
    if (name.match(/高[一二三]/)) {
      const match = name.match(/高[一二三]/);
      grade = match ? match[0] : '';
      confidence = 0.95;
    } else if (name.match(/高中/)) {
      grade = '高中';
      confidence = 0.75;
    } else if (name.match(/初[一二三]/)) {
      const match = name.match(/初[一二三]/);
      grade = match ? match[0] : '';
      confidence = 0.95;
    } else if (name.match(/初中/)) {
      grade = '初中';
      confidence = 0.75;
    } else if (name.match(/[一二三四五六]年级/)) {
      const match = name.match(/[一二三四五六]年级/);
      grade = match ? match[0] : '';
      confidence = 0.95;
    } else if (name.match(/小学/)) {
      grade = '小学';
      confidence = 0.75;
    } else if (name.match(/[七八九]年级/)) {
      const match = name.match(/[七八九]年级/);
      const gradeNum = match ? match[0] : '';
      // 转换为初中年级
      const mapping: { [key: string]: string } = {
        '七年级': '初一',
        '八年级': '初二',
        '九年级': '初三'
      };
      grade = mapping[gradeNum] || gradeNum;
      confidence = 0.95;
    }

    // 提取学科
    if (name.includes('数学')) {
      subject = '数学';
    } else if (name.includes('语文')) {
      subject = '语文';
    } else if (name.includes('英语')) {
      subject = '英语';
    }

    if (!grade) {
      grade = '未知';
      confidence = 0;
      reasoning = '标题中未找到年级信息';
    } else {
      reasoning = `从标题"${name}"中提取年级"${grade}"`;
    }

    if (!subject) {
      subject = '未知';
      reasoning += '，未找到学科信息';
    } else {
      reasoning += `，学科"${subject}"`;
    }

    return {
      dimension: 'title',
      grade,
      subject,
      confidence,
      reasoning
    };
  }

  /**
   * 从知识点推断年级和学科
   */
  inferFromKnowledgePoints(points: KnowledgePoint[]): DimensionResult {
    const gradeResult = this.analyzer.inferGradeFromKnowledgePoints(points);
    
    // 统计学科
    const subjectCount: Map<string, number> = new Map();
    for (const point of points) {
      if (point.subject !== '未知') {
        subjectCount.set(point.subject, (subjectCount.get(point.subject) || 0) + 1);
      }
    }

    let subject = '未知';
    let maxCount = 0;
    for (const [subj, count] of subjectCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        subject = subj;
      }
    }

    return {
      dimension: 'knowledge',
      grade: gradeResult.grade,
      subject,
      confidence: gradeResult.confidence,
      reasoning: gradeResult.reasoning + `，学科"${subject}"`
    };
  }

  /**
   * 从难度推断年级
   */
  inferFromDifficulty(problems: string[]): DimensionResult {
    // 简化版：基于知识点难度分布
    const analyzer = getKnowledgePointAnalyzer();
    const points = analyzer.analyzeKnowledgePoints(problems);
    const distribution = analyzer.analyzeDifficultyDistribution(points);
    const result = analyzer.inferGradeFromDifficulty(distribution);

    return {
      dimension: 'difficulty',
      grade: result.gradeRange,
      subject: '未知',
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  }

  /**
   * 从题型推断年级
   */
  inferFromQuestionTypes(typeAnalysis: any[]): DimensionResult {
    // 简化版：基于题型数量和复杂度
    const types = typeAnalysis || [];
    let grade = '未知';
    let confidence = 0.5;
    let reasoning = '';

    if (types.length === 0) {
      return {
        dimension: 'questionType',
        grade: '未知',
        subject: '未知',
        confidence: 0,
        reasoning: '无题型信息'
      };
    }

    // 统计题型
    const hasChoice = types.some(t => t.type && t.type.includes('选择'));
    const hasFillBlank = types.some(t => t.type && t.type.includes('填空'));
    const hasSolve = types.some(t => t.type && t.type.includes('解答'));
    const hasComposition = types.some(t => t.type && t.type.includes('作文'));

    // 简单推断
    if (types.length <= 3 && hasChoice && hasFillBlank) {
      grade = '小学';
      confidence = 0.6;
      reasoning = '题型简单，推断为小学';
    } else if (types.length >= 4 && hasSolve) {
      grade = '初中或高中';
      confidence = 0.6;
      reasoning = '题型复杂，包含解答题，推断为初中或高中';
    } else {
      grade = '未知';
      confidence = 0.3;
      reasoning = '题型信息不足';
    }

    return {
      dimension: 'questionType',
      grade,
      subject: '未知',
      confidence,
      reasoning
    };
  }

  /**
   * 综合推断
   */
  combineResults(results: DimensionResult[]): InferenceResult {
    const warnings: string[] = [];

    // 动态权重：如果标题置信度很高（≥0.9），增加其权重
    const titleResult = results.find(r => r.dimension === 'title');
    const titleConfidence = titleResult?.confidence || 0;
    
    let weights = {
      title: 0.3,
      knowledge: 0.4,
      difficulty: 0.2,
      questionType: 0.1
    };

    // 如果标题明确指定了具体年级（如"高二"），大幅提高标题权重
    if (titleConfidence >= 0.9) {
      weights = {
        title: 0.5,      // 提高到50%
        knowledge: 0.3,  // 降低到30%
        difficulty: 0.15, // 降低到15%
        questionType: 0.05 // 降低到5%
      };
      console.log(`✅ [Multi-Dimension Inferencer] 标题置信度高 (${(titleConfidence * 100).toFixed(0)}%)，提高标题权重至 50%`);
    }

    // 统计年级投票
    const gradeVotes: Map<string, number> = new Map();
    const gradeConfidences: Map<string, number[]> = new Map();

    for (const result of results) {
      if (result.grade === '未知') continue;

      const weight = weights[result.dimension];
      const weightedConfidence = result.confidence * weight;

      gradeVotes.set(result.grade, (gradeVotes.get(result.grade) || 0) + weightedConfidence);
      
      if (!gradeConfidences.has(result.grade)) {
        gradeConfidences.set(result.grade, []);
      }
      gradeConfidences.get(result.grade)!.push(result.confidence);
    }

    // 找出得票最高的年级
    let finalGrade = '未知';
    let maxVotes = 0;

    for (const [grade, votes] of gradeVotes.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        finalGrade = grade;
      }
    }

    // 计算整体置信度
    let overallConfidence = 0;
    if (finalGrade !== '未知' && gradeConfidences.has(finalGrade)) {
      const confidences = gradeConfidences.get(finalGrade)!;
      overallConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }

    // 统计学科
    const subjectVotes: Map<string, number> = new Map();
    for (const result of results) {
      if (result.subject === '未知') continue;
      const weight = weights[result.dimension];
      subjectVotes.set(result.subject, (subjectVotes.get(result.subject) || 0) + weight);
    }

    let finalSubject = '未知';
    let maxSubjectVotes = 0;
    for (const [subject, votes] of subjectVotes.entries()) {
      if (votes > maxSubjectVotes) {
        maxSubjectVotes = votes;
        finalSubject = subject;
      }
    }

    // 检查维度冲突 - 但如果标题置信度很高，不算冲突
    const uniqueGrades = new Set(results.map(r => r.grade).filter(g => g !== '未知'));
    if (uniqueGrades.size > 2 && titleConfidence < 0.9) {
      warnings.push(`⚠️ 维度推断结果差异较大：${Array.from(uniqueGrades).join(', ')}`);
      overallConfidence *= 0.8; // 降低置信度
    }

    console.log(`✅ [Multi-Dimension Inferencer] 综合推断: 年级=${finalGrade}, 学科=${finalSubject}, 置信度=${(overallConfidence * 100).toFixed(0)}%`);

    return {
      finalGrade,
      finalSubject,
      overallConfidence,
      dimensions: results,
      warnings
    };
  }
}

// 单例模式
let inferencerInstance: MultiDimensionInferencer | null = null;

export function getMultiDimensionInferencer(): MultiDimensionInferencer {
  if (!inferencerInstance) {
    inferencerInstance = new MultiDimensionInferencer();
  }
  return inferencerInstance;
}
