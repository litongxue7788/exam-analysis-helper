// =================================================================================
// 智能时长估算器 (Time Estimator)
// 基于历史数据和图片特征动态估算分析时间
// =================================================================================

interface AnalysisRecord {
  imageCount: number;
  actualDuration: number;
  timestamp: number;
  provider: string;
  success: boolean;
}

interface EstimationFactors {
  imageCount: number;
  provider: string;
  hasOcrText: boolean;
  averageImageSize?: number;
}

/**
 * 智能时长估算器
 * 结合历史数据和当前任务特征进行时长预测
 */
export class TimeEstimator {
  private historyRecords: AnalysisRecord[] = [];
  private readonly maxHistorySize = 100;
  private readonly baseEstimates = {
    doubao: { base: 45, perImage: 35 },
    aliyun: { base: 50, perImage: 40 },
    zhipu: { base: 55, perImage: 45 }
  };

  /**
   * 记录分析完成的历史数据
   */
  recordAnalysis(
    imageCount: number,
    actualDuration: number,
    provider: string,
    success: boolean
  ): void {
    const record: AnalysisRecord = {
      imageCount,
      actualDuration,
      timestamp: Date.now(),
      provider,
      success
    };

    this.historyRecords.push(record);

    // 保持历史记录数量在限制内
    if (this.historyRecords.length > this.maxHistorySize) {
      this.historyRecords = this.historyRecords.slice(-this.maxHistorySize);
    }

    console.log(`📊 [Time Estimator] 记录分析数据: ${imageCount}张图片, ${actualDuration}秒, ${provider}, 成功: ${success}`);
  }

  /**
   * 估算分析时长
   */
  estimateAnalysisTime(factors: EstimationFactors): {
    estimatedSeconds: number;
    confidence: 'high' | 'medium' | 'low';
    breakdown: {
      baseTime: number;
      imageTime: number;
      providerAdjustment: number;
      historyAdjustment: number;
      ocrAdjustment: number;
    };
  } {
    const { imageCount, provider, hasOcrText } = factors;
    
    // 1. 基础估算
    const baseConfig = this.baseEstimates[provider as keyof typeof this.baseEstimates] || this.baseEstimates.doubao;
    const baseTime = baseConfig.base;
    const imageTime = imageCount * baseConfig.perImage;
    
    // 2. 历史数据调整
    const historyAdjustment = this.calculateHistoryAdjustment(imageCount, provider);
    
    // 3. OCR文本调整（有OCR文本时可能更快）
    const ocrAdjustment = hasOcrText ? -10 : 0;
    
    // 4. 服务商调整
    const providerAdjustment = this.getProviderAdjustment(provider);
    
    // 5. 计算最终估算
    let estimatedSeconds = baseTime + imageTime + historyAdjustment + ocrAdjustment + providerAdjustment;
    
    // 6. 应用合理范围限制
    estimatedSeconds = Math.max(30, Math.min(600, estimatedSeconds));
    
    // 7. 计算置信度
    const confidence = this.calculateConfidence(imageCount, provider);
    
    const breakdown = {
      baseTime,
      imageTime,
      providerAdjustment,
      historyAdjustment,
      ocrAdjustment
    };

    console.log(`⏱️ [Time Estimator] 估算结果: ${estimatedSeconds}秒 (置信度: ${confidence})`);
    console.log(`   基础时间: ${baseTime}s, 图片时间: ${imageTime}s, 历史调整: ${historyAdjustment}s`);

    return {
      estimatedSeconds: Math.round(estimatedSeconds),
      confidence,
      breakdown
    };
  }

  /**
   * 基于历史数据计算调整值
   */
  private calculateHistoryAdjustment(imageCount: number, provider: string): number {
    // 过滤相关的历史记录（相似图片数量和相同服务商）
    const relevantRecords = this.historyRecords.filter(record => {
      const imageDiff = Math.abs(record.imageCount - imageCount);
      return record.provider === provider && 
             record.success && 
             imageDiff <= 2 && // 图片数量差异不超过2张
             Date.now() - record.timestamp < 7 * 24 * 60 * 60 * 1000; // 7天内的数据
    });

    if (relevantRecords.length < 3) {
      return 0; // 历史数据不足，不做调整
    }

    // 计算历史平均每张图片的处理时间
    const avgTimePerImage = relevantRecords.reduce((sum, record) => {
      return sum + (record.actualDuration / Math.max(1, record.imageCount));
    }, 0) / relevantRecords.length;

    // 与基础估算对比
    const baseConfig = this.baseEstimates[provider as keyof typeof this.baseEstimates] || this.baseEstimates.doubao;
    const baseTimePerImage = baseConfig.perImage;
    
    // 计算调整值
    const adjustment = (avgTimePerImage - baseTimePerImage) * imageCount;
    
    // 限制调整幅度（不超过±50%）
    const maxAdjustment = (baseConfig.base + imageCount * baseConfig.perImage) * 0.5;
    return Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));
  }

  /**
   * 获取服务商调整值
   */
  private getProviderAdjustment(provider: string): number {
    // 基于不同服务商的性能特点进行微调
    switch (provider) {
      case 'doubao': return 0;    // 基准
      case 'aliyun': return 5;    // 稍慢
      case 'zhipu': return 10;    // 最慢
      default: return 0;
    }
  }

  /**
   * 计算估算置信度
   */
  private calculateConfidence(imageCount: number, provider: string): 'high' | 'medium' | 'low' {
    const relevantRecords = this.historyRecords.filter(record => {
      const imageDiff = Math.abs(record.imageCount - imageCount);
      return record.provider === provider && 
             record.success && 
             imageDiff <= 1;
    });

    if (relevantRecords.length >= 10) return 'high';
    if (relevantRecords.length >= 5) return 'medium';
    return 'low';
  }

  /**
   * 获取实时进度更新的时间点
   */
  getProgressUpdatePoints(estimatedSeconds: number): number[] {
    const points = [];
    const intervals = [0.2, 0.4, 0.6, 0.8]; // 20%, 40%, 60%, 80%
    
    for (const interval of intervals) {
      points.push(Math.round(estimatedSeconds * interval));
    }
    
    return points;
  }

  /**
   * 根据当前进度更新剩余时间估算
   */
  updateRemainingTime(
    originalEstimate: number,
    elapsedSeconds: number,
    currentProgress: number
  ): number {
    if (currentProgress <= 0) return originalEstimate;
    if (currentProgress >= 1) return 0;

    // 基于实际进度重新估算
    const projectedTotal = elapsedSeconds / currentProgress;
    const remainingTime = projectedTotal - elapsedSeconds;
    
    // 与原始估算进行加权平均（避免估算波动过大）
    const originalRemaining = originalEstimate - elapsedSeconds;
    const weight = Math.min(0.7, currentProgress * 2); // 进度越高，实际数据权重越大
    
    const adjustedRemaining = remainingTime * weight + originalRemaining * (1 - weight);
    
    return Math.max(5, Math.round(adjustedRemaining));
  }

  /**
   * 获取历史统计信息
   */
  getStatistics(): {
    totalAnalyses: number;
    averageAccuracy: number;
    providerStats: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const providerStats: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    
    for (const record of this.historyRecords) {
      if (!providerStats[record.provider]) {
        providerStats[record.provider] = { count: 0, avgDuration: 0, successRate: 0 };
      }
      
      const stats = providerStats[record.provider];
      stats.count++;
      stats.avgDuration = (stats.avgDuration * (stats.count - 1) + record.actualDuration) / stats.count;
      stats.successRate = this.historyRecords
        .filter(r => r.provider === record.provider)
        .reduce((sum, r) => sum + (r.success ? 1 : 0), 0) / stats.count;
    }

    // 计算平均准确性（估算与实际的偏差）
    let totalAccuracy = 0;
    let accuracyCount = 0;
    
    for (const record of this.historyRecords) {
      if (record.success) {
        const factors: EstimationFactors = {
          imageCount: record.imageCount,
          provider: record.provider,
          hasOcrText: false // 历史记录中没有这个信息
        };
        
        const { estimatedSeconds } = this.estimateAnalysisTime(factors);
        const accuracy = 1 - Math.abs(estimatedSeconds - record.actualDuration) / record.actualDuration;
        totalAccuracy += Math.max(0, accuracy);
        accuracyCount++;
      }
    }

    return {
      totalAnalyses: this.historyRecords.length,
      averageAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
      providerStats
    };
  }
}

// 单例模式
let estimatorInstance: TimeEstimator | null = null;

export function getTimeEstimator(): TimeEstimator {
  if (!estimatorInstance) {
    estimatorInstance = new TimeEstimator();
  }
  return estimatorInstance;
}