// =================================================================================
// 知识点分析器 (Knowledge Point Analyzer)
// 分析试卷中的知识点，判断难度级别和所属年级
// =================================================================================

import { getKnowledgePointDatabase, KnowledgePointEntry } from './knowledge-point-database';

export interface KnowledgePoint {
  name: string;              // 知识点名称
  difficulty: 'basic' | 'medium' | 'hard';  // 难度级别
  suggestedGrades: string[]; // 建议年级范围
  subject: string;           // 所属学科
  confidence: number;        // 匹配置信度 (0-1)
  matchedEntry?: KnowledgePointEntry;  // 匹配的知识点库条目
}

export interface GradeInferenceResult {
  grade: string;
  confidence: number;
  reasoning: string;
}

export class KnowledgePointAnalyzer {
  private database = getKnowledgePointDatabase();

  /**
   * 从 problems 中提取知识点
   */
  analyzeKnowledgePoints(problems: string[]): KnowledgePoint[] {
    const knowledgePoints: KnowledgePoint[] = [];

    for (const problem of problems) {
      // 提取【知识点】标签
      const match = problem.match(/【知识点】([^【]+)/);
      if (!match) continue;

      const knowledgePointText = match[1].trim();
      
      // 先尝试精确匹配
      let matchedEntry = this.database.findByName(knowledgePointText);
      let confidence = matchedEntry ? 1.0 : 0;

      // 如果精确匹配失败，尝试模糊匹配
      if (!matchedEntry) {
        const fuzzyMatches = this.database.fuzzyMatch(knowledgePointText);
        if (fuzzyMatches.length > 0) {
          matchedEntry = fuzzyMatches[0];
          confidence = 0.7; // 模糊匹配置信度较低
        }
      }

      if (matchedEntry) {
        knowledgePoints.push({
          name: matchedEntry.name,
          difficulty: matchedEntry.difficulty,
          suggestedGrades: matchedEntry.grades,
          subject: matchedEntry.subject,
          confidence,
          matchedEntry
        });
      } else {
        // 未匹配到，使用原始文本
        knowledgePoints.push({
          name: knowledgePointText,
          difficulty: 'medium',  // 默认中等难度
          suggestedGrades: [],
          subject: '未知',
          confidence: 0.3  // 低置信度
        });
      }
    }

    console.log(`✅ [Knowledge Point Analyzer] 提取了 ${knowledgePoints.length} 个知识点`);
    return knowledgePoints;
  }

  /**
   * 基于知识点推断年级
   */
  inferGradeFromKnowledgePoints(points: KnowledgePoint[]): GradeInferenceResult {
    if (points.length === 0) {
      return {
        grade: '未知',
        confidence: 0,
        reasoning: '未提取到知识点'
      };
    }

    // 统计年级分布
    const gradeCount: Map<string, number> = new Map();
    const gradeConfidence: Map<string, number[]> = new Map();
    const gradeStage: Map<string, string> = new Map(); // 记录学段

    // 定义学段映射
    const getStage = (grade: string): string => {
      if (grade.includes('高') || grade === '高一' || grade === '高二' || grade === '高三') return '高中';
      if (grade.includes('初') || grade === '七年级' || grade === '八年级' || grade === '九年级') return '初中';
      if (grade.match(/[一二三四五六]年级/) || grade === '小学') return '小学';
      return '未知';
    };

    for (const point of points) {
      for (const grade of point.suggestedGrades) {
        // 累计出现次数 - 高置信度的知识点权重更高
        const weight = point.confidence > 0.8 ? 1.5 : 1.0;
        gradeCount.set(grade, (gradeCount.get(grade) || 0) + weight);
        
        // 记录置信度
        if (!gradeConfidence.has(grade)) {
          gradeConfidence.set(grade, []);
        }
        gradeConfidence.get(grade)!.push(point.confidence);
        
        // 记录学段
        gradeStage.set(grade, getStage(grade));
      }
    }

    if (gradeCount.size === 0) {
      return {
        grade: '未知',
        confidence: 0.3,
        reasoning: '知识点未匹配到年级信息'
      };
    }

    // 找出出现频率最高的年级
    let maxCount = 0;
    let inferredGrade = '';
    
    for (const [grade, count] of gradeCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        inferredGrade = grade;
      }
    }

    // 如果推断出的是具体年级，检查是否有同学段的其他年级也有较高权重
    // 这样可以避免高二试卷被误判为初二
    const inferredStage = gradeStage.get(inferredGrade) || '未知';
    if (inferredStage !== '未知') {
      // 统计同学段的总权重
      let stageWeight = 0;
      for (const [grade, count] of gradeCount.entries()) {
        if (gradeStage.get(grade) === inferredStage) {
          stageWeight += count;
        }
      }
      
      // 如果同学段权重占比很高，提高置信度
      const totalWeight = Array.from(gradeCount.values()).reduce((a, b) => a + b, 0);
      const stageRatio = stageWeight / totalWeight;
      
      if (stageRatio > 0.8) {
        // 同学段占比超过80%，说明学段判断很准确
        console.log(`✅ [Knowledge Point Analyzer] 学段"${inferredStage}"占比 ${(stageRatio * 100).toFixed(0)}%，学段判断准确`);
      }
    }

    // 计算置信度：基于出现频率和匹配置信度
    const totalPoints = points.length;
    const frequency = maxCount / totalPoints;
    const avgConfidence = gradeConfidence.get(inferredGrade)!.reduce((a, b) => a + b, 0) / gradeConfidence.get(inferredGrade)!.length;
    let confidence = frequency * avgConfidence;

    // 如果知识点数量较少，降低置信度
    if (totalPoints < 3) {
      confidence *= 0.7;
    }

    // 生成推断理由
    const reasoning = `基于 ${totalPoints} 个知识点分析，${maxCount.toFixed(1)} 个知识点指向 ${inferredGrade}，频率 ${(frequency * 100).toFixed(0)}%，平均匹配置信度 ${(avgConfidence * 100).toFixed(0)}%`;

    console.log(`✅ [Knowledge Point Analyzer] 推断年级: ${inferredGrade} (置信度: ${(confidence * 100).toFixed(0)}%)`);
    console.log(`   理由: ${reasoning}`);

    return {
      grade: inferredGrade,
      confidence,
      reasoning
    };
  }

  /**
   * 分析知识点难度分布
   */
  analyzeDifficultyDistribution(points: KnowledgePoint[]): {
    basic: number;
    medium: number;
    hard: number;
  } {
    const distribution = { basic: 0, medium: 0, hard: 0 };

    for (const point of points) {
      distribution[point.difficulty]++;
    }

    return distribution;
  }

  /**
   * 基于难度分布推断年级范围
   */
  inferGradeFromDifficulty(distribution: { basic: number; medium: number; hard: number }): {
    gradeRange: string;
    confidence: number;
    reasoning: string;
  } {
    const total = distribution.basic + distribution.medium + distribution.hard;
    
    if (total === 0) {
      return {
        gradeRange: '未知',
        confidence: 0,
        reasoning: '无难度信息'
      };
    }

    const basicRatio = distribution.basic / total;
    const mediumRatio = distribution.medium / total;
    const hardRatio = distribution.hard / total;

    let gradeRange = '';
    let confidence = 0;
    let reasoning = '';

    // 优化判断逻辑：更准确地区分高中和初中
    if (basicRatio > 0.7) {
      gradeRange = '小学';
      confidence = 0.85;
      reasoning = `基础题占比 ${(basicRatio * 100).toFixed(0)}%，推断为小学阶段`;
    } else if (hardRatio > 0.6) {
      // 困难题占比超过60%，很可能是高中
      gradeRange = '高中';
      confidence = 0.85;
      reasoning = `困难题占比 ${(hardRatio * 100).toFixed(0)}%，推断为高中阶段`;
    } else if (hardRatio > 0.4) {
      // 困难题占比40-60%，也倾向于高中
      gradeRange = '高中';
      confidence = 0.75;
      reasoning = `困难题占比 ${(hardRatio * 100).toFixed(0)}%，推断为高中阶段`;
    } else if (mediumRatio > 0.6 && hardRatio < 0.3) {
      // 中等题为主，困难题较少，倾向于初中
      gradeRange = '初中';
      confidence = 0.75;
      reasoning = `中等题占比 ${(mediumRatio * 100).toFixed(0)}%，困难题占比 ${(hardRatio * 100).toFixed(0)}%，推断为初中阶段`;
    } else if (mediumRatio > 0.4) {
      // 中等题占比较高，但有一定困难题，可能是初中或高中
      gradeRange = '初中或高中';
      confidence = 0.6;
      reasoning = `中等题占比 ${(mediumRatio * 100).toFixed(0)}%，困难题占比 ${(hardRatio * 100).toFixed(0)}%，推断为初中或高中阶段`;
    } else {
      gradeRange = '初中或高中';
      confidence = 0.5;
      reasoning = `难度分布较均匀，推断为初中或高中阶段`;
    }

    console.log(`✅ [Knowledge Point Analyzer] 基于难度推断: ${gradeRange} (置信度: ${(confidence * 100).toFixed(0)}%)`);
    console.log(`   理由: ${reasoning}`);

    return { gradeRange, confidence, reasoning };
  }
}

// 单例模式
let analyzerInstance: KnowledgePointAnalyzer | null = null;

export function getKnowledgePointAnalyzer(): KnowledgePointAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new KnowledgePointAnalyzer();
  }
  return analyzerInstance;
}
