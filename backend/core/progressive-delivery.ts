/**
 * Progressive Delivery Manager
 * 
 * 实现分段交付优化，提升用户等待体验：
 * 1. 先返回识别结果和基本信息（5-15秒）
 * 2. 再返回核心分析（Top3错因）（15-30秒）
 * 3. 最后返回完整报告（30-60秒）
 */

export type DeliveryStage = 
  | 'extracting'    // 正在识别
  | 'extracted'     // 识别完成，返回基本信息
  | 'diagnosing'    // 正在分析
  | 'diagnosed'     // 核心分析完成，返回Top3错因
  | 'practicing'    // 正在生成练习题
  | 'completed';    // 全部完成

export interface ProgressUpdate {
  stage: DeliveryStage;
  progress: number; // 0-100
  estimatedRemainingSeconds: number;
  message: string;
  partialResult?: any;
}

export interface ProgressiveDeliveryConfig {
  imageCount: number;
  enableProgressiveDelivery: boolean;
}

export class ProgressiveDeliveryManager {
  private startTime: number;
  private config: ProgressiveDeliveryConfig;
  private stageTimings: Map<DeliveryStage, number>;

  constructor(config: ProgressiveDeliveryConfig) {
    this.startTime = Date.now();
    this.config = config;
    this.stageTimings = new Map();
  }

  /**
   * 估算总时长（秒）
   */
  estimateTotalSeconds(): number {
    const { imageCount } = this.config;
    // 基础时间 + 每张图片增加的时间
    // 1-3张: 30秒, 4-6张: 60秒
    if (imageCount <= 3) {
      return 30;
    } else if (imageCount <= 6) {
      return 60;
    } else {
      return 60 + (imageCount - 6) * 10;
    }
  }

  /**
   * 估算剩余时间（秒）
   */
  estimateRemainingSeconds(currentStage: DeliveryStage): number {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const total = this.estimateTotalSeconds();
    const progress = this.getStageProgress(currentStage);
    const remaining = total * (1 - progress / 100);
    return Math.max(0, Math.ceil(remaining));
  }

  /**
   * 获取当前阶段的进度百分比
   */
  getStageProgress(stage: DeliveryStage): number {
    const progressMap: Record<DeliveryStage, number> = {
      'extracting': 10,
      'extracted': 30,
      'diagnosing': 50,
      'diagnosed': 70,
      'practicing': 85,
      'completed': 100
    };
    return progressMap[stage] || 0;
  }

  /**
   * 获取阶段描述消息
   */
  getStageMessage(stage: DeliveryStage): string {
    const messageMap: Record<DeliveryStage, string> = {
      'extracting': '正在识别试卷内容...',
      'extracted': '识别完成，正在准备分析...',
      'diagnosing': '正在分析错因和知识点...',
      'diagnosed': '核心分析完成，正在生成练习题...',
      'practicing': '正在生成针对性练习题...',
      'completed': '分析完成！'
    };
    return messageMap[stage] || '处理中...';
  }

  /**
   * 创建进度更新
   */
  createProgressUpdate(stage: DeliveryStage, partialResult?: any): ProgressUpdate {
    // 记录阶段时间
    this.stageTimings.set(stage, Date.now());

    return {
      stage,
      progress: this.getStageProgress(stage),
      estimatedRemainingSeconds: this.estimateRemainingSeconds(stage),
      message: this.getStageMessage(stage),
      partialResult
    };
  }

  /**
   * 创建识别完成的部分结果
   */
  createExtractedPartialResult(extracted: any): any {
    const meta = extracted?.meta || {};
    return {
      meta: {
        examName: meta.examName,
        subject: meta.subject,
        grade: meta.grade,
        score: meta.score,
        fullScore: meta.fullScore,
        typeAnalysis: meta.typeAnalysis || []
      },
      stage: 'extracted',
      message: '试卷识别完成'
    };
  }

  /**
   * 创建核心分析完成的部分结果（Top3错因）
   */
  createDiagnosedPartialResult(extracted: any, diagnosis: any): any {
    const meta = extracted?.meta || {};
    const problems = extracted?.observations?.problems || [];
    const top3Problems = problems.slice(0, 3);

    return {
      meta: {
        examName: meta.examName,
        subject: meta.subject,
        grade: meta.grade,
        score: meta.score,
        fullScore: meta.fullScore
      },
      observations: {
        problems: top3Problems
      },
      forStudent: {
        overall: diagnosis?.forStudent?.overall || '',
        problems: (diagnosis?.forStudent?.problems || []).slice(0, 3),
        advice: (diagnosis?.forStudent?.advice || []).slice(0, 3)
      },
      stage: 'diagnosed',
      message: '核心分析完成（Top3错因）'
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    totalSeconds: number;
    stageTimings: { stage: string; seconds: number }[];
  } {
    const totalSeconds = (Date.now() - this.startTime) / 1000;
    const stageTimings: { stage: string; seconds: number }[] = [];

    const stages: DeliveryStage[] = ['extracting', 'extracted', 'diagnosing', 'diagnosed', 'practicing', 'completed'];
    let prevTime = this.startTime;

    for (const stage of stages) {
      const time = this.stageTimings.get(stage);
      if (time) {
        const seconds = (time - prevTime) / 1000;
        stageTimings.push({ stage, seconds });
        prevTime = time;
      }
    }

    return { totalSeconds, stageTimings };
  }
}
