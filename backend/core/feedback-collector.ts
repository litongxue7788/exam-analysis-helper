// =================================================================================
// 用户反馈收集器 (Feedback Collector)
// 收集和存储用户对分析结果的反馈
// =================================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserFeedback {
  id: string;                    // 反馈ID
  timestamp: number;             // 提交时间戳
  analysisId?: string;           // 关联的分析ID
  feedbackType: 'accuracy' | 'quality' | 'suggestion' | 'bug' | 'other';  // 反馈类型
  rating?: number;               // 评分 (1-5)
  content: string;               // 反馈内容
  specificIssues?: string[];     // 具体问题列表
  userInfo?: {                   // 用户信息（可选）
    grade?: string;
    subject?: string;
    deviceType?: string;
  };
  metadata?: Record<string, any>;  // 额外元数据
}

export interface FeedbackSummary {
  totalFeedbacks: number;
  averageRating: number;
  feedbacksByType: Record<string, number>;
  recentFeedbacks: UserFeedback[];
}

/**
 * 用户反馈收集器
 * 收集、存储和分析用户反馈
 */
export class FeedbackCollector {
  private feedbackDir: string;
  private feedbackFile: string;

  constructor() {
    // 确定反馈存储目录
    const repoRoot = this.findRepoRoot();
    this.feedbackDir = path.join(repoRoot, 'data', 'feedbacks');
    this.feedbackFile = path.join(this.feedbackDir, 'user-feedbacks.jsonl');

    // 确保目录存在
    this.ensureDirectoryExists();
  }

  /**
   * 查找仓库根目录
   */
  private findRepoRoot(): string {
    let dir = __dirname;
    for (let i = 0; i < 8; i++) {
      const marker = path.resolve(dir, 'package.json');
      if (fs.existsSync(marker)) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return path.resolve(__dirname, '..', '..');
  }

  /**
   * 确保目录存在
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.feedbackDir)) {
      fs.mkdirSync(this.feedbackDir, { recursive: true });
      console.log(`📁 [Feedback Collector] 创建反馈目录: ${this.feedbackDir}`);
    }
  }

  /**
   * 生成反馈ID
   */
  private generateFeedbackId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `fb_${timestamp}_${random}`;
  }

  /**
   * 收集用户反馈
   */
  async collectFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp'>): Promise<UserFeedback> {
    const completeFeedback: UserFeedback = {
      id: this.generateFeedbackId(),
      timestamp: Date.now(),
      ...feedback
    };

    // 验证反馈内容
    if (!completeFeedback.content || completeFeedback.content.trim().length === 0) {
      throw new Error('反馈内容不能为空');
    }

    // 保存到文件（JSONL格式，每行一个JSON对象）
    try {
      const feedbackLine = JSON.stringify(completeFeedback) + '\n';
      fs.appendFileSync(this.feedbackFile, feedbackLine, 'utf-8');
      
      console.log(`✅ [Feedback Collector] 收集反馈成功: ${completeFeedback.id}`);
      console.log(`   类型: ${completeFeedback.feedbackType}`);
      console.log(`   评分: ${completeFeedback.rating || '未评分'}`);
      console.log(`   内容: ${completeFeedback.content.substring(0, 50)}...`);

      return completeFeedback;
    } catch (error) {
      console.error(`❌ [Feedback Collector] 保存反馈失败:`, error);
      throw new Error('保存反馈失败');
    }
  }

  /**
   * 读取所有反馈
   */
  async getAllFeedbacks(): Promise<UserFeedback[]> {
    if (!fs.existsSync(this.feedbackFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.feedbackFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const feedbacks: UserFeedback[] = [];
      for (const line of lines) {
        try {
          const feedback = JSON.parse(line);
          feedbacks.push(feedback);
        } catch (e) {
          console.warn(`⚠️ [Feedback Collector] 解析反馈失败:`, line.substring(0, 50));
        }
      }

      return feedbacks;
    } catch (error) {
      console.error(`❌ [Feedback Collector] 读取反馈失败:`, error);
      return [];
    }
  }

  /**
   * 获取反馈摘要
   */
  async getFeedbackSummary(limit: number = 10): Promise<FeedbackSummary> {
    const allFeedbacks = await this.getAllFeedbacks();

    // 计算平均评分
    const ratedFeedbacks = allFeedbacks.filter(f => f.rating !== undefined);
    const averageRating = ratedFeedbacks.length > 0
      ? ratedFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / ratedFeedbacks.length
      : 0;

    // 按类型统计
    const feedbacksByType: Record<string, number> = {};
    allFeedbacks.forEach(f => {
      feedbacksByType[f.feedbackType] = (feedbacksByType[f.feedbackType] || 0) + 1;
    });

    // 获取最近的反馈
    const recentFeedbacks = allFeedbacks
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return {
      totalFeedbacks: allFeedbacks.length,
      averageRating: Math.round(averageRating * 10) / 10,
      feedbacksByType,
      recentFeedbacks
    };
  }

  /**
   * 根据分析ID查找反馈
   */
  async getFeedbacksByAnalysisId(analysisId: string): Promise<UserFeedback[]> {
    const allFeedbacks = await this.getAllFeedbacks();
    return allFeedbacks.filter(f => f.analysisId === analysisId);
  }

  /**
   * 根据类型查找反馈
   */
  async getFeedbacksByType(feedbackType: string): Promise<UserFeedback[]> {
    const allFeedbacks = await this.getAllFeedbacks();
    return allFeedbacks.filter(f => f.feedbackType === feedbackType);
  }

  /**
   * 验证反馈数据
   */
  validateFeedback(feedback: Partial<UserFeedback>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证反馈类型
    const validTypes = ['accuracy', 'quality', 'suggestion', 'bug', 'other'];
    if (!feedback.feedbackType || !validTypes.includes(feedback.feedbackType)) {
      errors.push('反馈类型无效');
    }

    // 验证内容
    if (!feedback.content || feedback.content.trim().length === 0) {
      errors.push('反馈内容不能为空');
    } else if (feedback.content.length > 5000) {
      errors.push('反馈内容过长（最多5000字符）');
    }

    // 验证评分
    if (feedback.rating !== undefined) {
      if (typeof feedback.rating !== 'number' || feedback.rating < 1 || feedback.rating > 5) {
        errors.push('评分必须在1-5之间');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 单例模式
let collectorInstance: FeedbackCollector | null = null;

export function getFeedbackCollector(): FeedbackCollector {
  if (!collectorInstance) {
    collectorInstance = new FeedbackCollector();
  }
  return collectorInstance;
}
