// =================================================================================
// 证据来源追溯管理器 (Evidence Source Tracker)
// 记录和追溯证据来源
// =================================================================================

export interface EvidenceSource {
  problemIndex: number;        // 错因索引
  imageIndex?: number;          // 来源图片索引（如果可确定）
  imageCount: number;           // 总图片数
  confidence: string;           // 置信度
  canViewOriginal: boolean;     // 是否可以查看原图
}

export interface SourceTrackingMetadata {
  totalImages: number;          // 总图片数
  analysisMethod: 'batch' | 'individual';  // 分析方法：批量或逐张
  trackingEnabled: boolean;     // 是否启用追溯
  sources: EvidenceSource[];    // 证据来源列表
}

/**
 * 证据来源追溯管理器
 * 记录每个错因分析的来源信息
 */
export class EvidenceSourceTracker {
  /**
   * 创建来源追溯元数据
   */
  createTrackingMetadata(
    imageCount: number,
    problems: string[],
    analysisMethod: 'batch' | 'individual' = 'batch'
  ): SourceTrackingMetadata {
    const sources: EvidenceSource[] = [];

    problems.forEach((problem, index) => {
      // 尝试从问题描述中提取题号
      const questionNoMatch = problem.match(/【题号】([^【]+)/);
      const questionNo = questionNoMatch ? questionNoMatch[1].trim() : null;

      // 提取置信度
      const confidenceMatch = problem.match(/【置信度】(高|中|低)/);
      const confidence = confidenceMatch ? confidenceMatch[1] : '未知';

      // 对于批量分析，我们无法精确确定来自哪张图片
      // 但可以提供一些启发式推断
      let imageIndex: number | undefined = undefined;
      
      if (analysisMethod === 'individual' && imageCount > 0) {
        // 如果是逐张分析，可以精确追溯
        imageIndex = Math.floor(index / (problems.length / imageCount));
      } else if (questionNo && imageCount > 1) {
        // 批量分析时，根据题号进行粗略估计
        // 假设题号是连续的，可以估算在哪张图片上
        const questionNumber = parseInt(questionNo);
        if (!isNaN(questionNumber)) {
          // 简单启发式：假设题目均匀分布在图片上
          const questionsPerImage = Math.ceil(problems.length / imageCount);
          imageIndex = Math.min(
            Math.floor((questionNumber - 1) / questionsPerImage),
            imageCount - 1
          );
        }
      }

      sources.push({
        problemIndex: index,
        imageIndex,
        imageCount,
        confidence,
        canViewOriginal: imageCount > 0
      });
    });

    return {
      totalImages: imageCount,
      analysisMethod,
      trackingEnabled: imageCount > 0,
      sources
    };
  }

  /**
   * 为响应添加来源追溯信息
   */
  addSourceTracking(
    response: any,
    imageCount: number,
    analysisMethod: 'batch' | 'individual' = 'batch'
  ): void {
    if (!response || !response.data) {
      return;
    }

    // 从响应中提取问题列表
    let problems: string[] = [];
    
    if (response.data.report?.forStudent?.problems) {
      problems = response.data.report.forStudent.problems;
    } else if (response.observations?.problems) {
      problems = response.observations.problems;
    }

    if (problems.length === 0) {
      return;
    }

    // 创建追溯元数据
    const trackingMetadata = this.createTrackingMetadata(
      imageCount,
      problems,
      analysisMethod
    );

    // 添加到响应中
    response.data.evidenceSourceTracking = trackingMetadata;

    console.log(`📍 [Evidence Source Tracking] 已添加来源追溯信息`);
    console.log(`   总图片数: ${imageCount}`);
    console.log(`   分析方法: ${analysisMethod}`);
    console.log(`   可追溯证据: ${trackingMetadata.sources.length}`);
  }

  /**
   * 获取特定问题的来源信息
   */
  getSourceForProblem(
    trackingMetadata: SourceTrackingMetadata,
    problemIndex: number
  ): EvidenceSource | null {
    if (!trackingMetadata || !trackingMetadata.sources) {
      return null;
    }

    return trackingMetadata.sources.find(s => s.problemIndex === problemIndex) || null;
  }

  /**
   * 生成查看原图的提示信息
   */
  generateViewOriginalHint(source: EvidenceSource): string {
    if (!source.canViewOriginal) {
      return '原图不可用';
    }

    if (source.imageIndex !== undefined) {
      return `查看第 ${source.imageIndex + 1} 张图片`;
    }

    if (source.imageCount === 1) {
      return '查看原图';
    }

    return `查看试卷图片（共 ${source.imageCount} 张）`;
  }
}

// 单例模式
let trackerInstance: EvidenceSourceTracker | null = null;

export function getEvidenceSourceTracker(): EvidenceSourceTracker {
  if (!trackerInstance) {
    trackerInstance = new EvidenceSourceTracker();
  }
  return trackerInstance;
}
