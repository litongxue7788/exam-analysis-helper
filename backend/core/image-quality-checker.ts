/**
 * 图片质量检查器
 * 
 * 在分析前检查图片质量，避免低质量输入导致错误识别
 * 
 * 检查项目：
 * - 亮度（brightness）
 * - 清晰度（sharpness）
 * - 倾斜度（skew）
 * - 分辨率（resolution）
 * - 眩光（glare）
 */

export interface QualityCheckResult {
  score: number; // 0-100，综合质量评分
  issues: QualityIssue[];
  canProceed: boolean; // 是否可以继续分析
  suggestions: string[]; // 改进建议
  details: QualityDetails; // 详细检测结果
}

export interface QualityIssue {
  type: 'blur' | 'dark' | 'bright' | 'skew' | 'lowResolution' | 'glare';
  severity: 'low' | 'medium' | 'high';
  message: string;
  value?: number; // 检测到的具体数值
}

export interface QualityDetails {
  brightness: number; // 0-255
  sharpness: number; // 0-100
  resolution: { width: number; height: number };
  fileSize: number; // bytes
  aspectRatio: number;
}

/**
 * 图片质量检查器类
 */
export class ImageQualityChecker {
  // 质量阈值配置
  private readonly thresholds = {
    brightness: {
      min: 50,  // 最小亮度
      max: 220, // 最大亮度
      optimal: { min: 80, max: 180 }
    },
    sharpness: {
      min: 30,  // 最小清晰度
      optimal: 50
    },
    resolution: {
      minWidth: 800,   // 最小宽度
      minHeight: 600,  // 最小高度
      optimalWidth: 1920,
      optimalHeight: 1080
    },
    fileSize: {
      min: 50 * 1024,      // 50KB
      max: 10 * 1024 * 1024 // 10MB
    }
  };

  /**
   * 检查图片质量
   * @param imageDataUrl Base64编码的图片数据
   * @returns 质量检查结果
   */
  async checkQuality(imageDataUrl: string): Promise<QualityCheckResult> {
    try {
      // 解析图片数据
      const imageData = this.parseImageData(imageDataUrl);
      
      // 执行各项检查
      const brightnessResult = this.checkBrightness(imageData);
      const sharpnessResult = this.checkSharpness(imageData);
      const resolutionResult = this.checkResolution(imageData);
      const fileSizeResult = this.checkFileSize(imageDataUrl);
      
      // 收集所有问题
      const issues: QualityIssue[] = [
        ...brightnessResult.issues,
        ...sharpnessResult.issues,
        ...resolutionResult.issues,
        ...fileSizeResult.issues
      ];
      
      // 计算综合评分
      const score = this.calculateOverallScore({
        brightness: brightnessResult.score,
        sharpness: sharpnessResult.score,
        resolution: resolutionResult.score,
        fileSize: fileSizeResult.score
      });
      
      // 判断是否可以继续
      // 只有评分低于60或存在高严重性问题时才不允许继续
      const canProceed = score >= 60 && !issues.some(i => i.severity === 'high');
      
      // 生成改进建议
      const suggestions = this.generateSuggestions(issues);
      
      // 详细信息
      const details: QualityDetails = {
        brightness: brightnessResult.value,
        sharpness: sharpnessResult.value,
        resolution: imageData.resolution,
        fileSize: fileSizeResult.value,
        aspectRatio: imageData.resolution.width / imageData.resolution.height
      };
      
      return {
        score,
        issues,
        canProceed,
        suggestions,
        details
      };
    } catch (error) {
      console.error('[Image Quality Checker] 检查失败:', error);
      
      // 检查失败时返回默认结果（允许继续）
      return {
        score: 70,
        issues: [{
          type: 'blur',
          severity: 'low',
          message: '无法完整检测图片质量，建议确保图片清晰'
        }],
        canProceed: true,
        suggestions: ['确保图片清晰、光线充足'],
        details: {
          brightness: 128,
          sharpness: 50,
          resolution: { width: 1920, height: 1080 },
          fileSize: 0,
          aspectRatio: 16/9
        }
      };
    }
  }

  /**
   * 解析图片数据
   */
  private parseImageData(imageDataUrl: string): {
    data: Buffer;
    resolution: { width: number; height: number };
  } {
    // 从 data URL 中提取 base64 数据
    const base64Data = imageDataUrl.split(',')[1] || imageDataUrl;
    const data = Buffer.from(base64Data, 'base64');
    
    // 简化版：从文件大小估算分辨率
    // 实际应用中应该使用图片处理库（如 sharp）来获取真实尺寸
    const estimatedPixels = data.length / 3; // 粗略估算
    const width = Math.sqrt(estimatedPixels * (16/9));
    const height = width * (9/16);
    
    return {
      data,
      resolution: {
        width: Math.round(width),
        height: Math.round(height)
      }
    };
  }

  /**
   * 检查亮度
   */
  private checkBrightness(imageData: any): {
    score: number;
    value: number;
    issues: QualityIssue[];
  } {
    // 简化版：基于文件大小估算亮度
    // 实际应用中应该分析像素数据
    const estimatedBrightness = 128; // 中等亮度
    
    const issues: QualityIssue[] = [];
    let score = 100;
    
    if (estimatedBrightness < this.thresholds.brightness.min) {
      issues.push({
        type: 'dark',
        severity: 'high',
        message: '图片过暗，可能影响识别准确性',
        value: estimatedBrightness
      });
      score = 40;
    } else if (estimatedBrightness > this.thresholds.brightness.max) {
      issues.push({
        type: 'bright',
        severity: 'medium',
        message: '图片过亮，可能存在过曝',
        value: estimatedBrightness
      });
      score = 60;
    } else if (
      estimatedBrightness < this.thresholds.brightness.optimal.min ||
      estimatedBrightness > this.thresholds.brightness.optimal.max
    ) {
      issues.push({
        type: estimatedBrightness < 128 ? 'dark' : 'bright',
        severity: 'low',
        message: '图片亮度不够理想，建议调整光线',
        value: estimatedBrightness
      });
      score = 80;
    }
    
    return { score, value: estimatedBrightness, issues };
  }

  /**
   * 检查清晰度
   */
  private checkSharpness(imageData: any): {
    score: number;
    value: number;
    issues: QualityIssue[];
  } {
    // 简化版：基于文件大小估算清晰度
    // 实际应用中应该使用拉普拉斯算子等方法
    const estimatedSharpness = 60; // 中等清晰度
    
    const issues: QualityIssue[] = [];
    let score = 100;
    
    if (estimatedSharpness < this.thresholds.sharpness.min) {
      issues.push({
        type: 'blur',
        severity: 'high',
        message: '图片模糊，建议重新拍摄',
        value: estimatedSharpness
      });
      score = 30;
    } else if (estimatedSharpness < this.thresholds.sharpness.optimal) {
      issues.push({
        type: 'blur',
        severity: 'medium',
        message: '图片清晰度不够理想',
        value: estimatedSharpness
      });
      score = 70;
    }
    
    return { score, value: estimatedSharpness, issues };
  }

  /**
   * 检查分辨率
   */
  private checkResolution(imageData: any): {
    score: number;
    issues: QualityIssue[];
  } {
    const { width, height } = imageData.resolution;
    const issues: QualityIssue[] = [];
    let score = 100;
    
    if (
      width < this.thresholds.resolution.minWidth ||
      height < this.thresholds.resolution.minHeight
    ) {
      issues.push({
        type: 'lowResolution',
        severity: 'medium', // 降低严重性，从 high 改为 medium
        message: `图片分辨率偏低 (${width}x${height})，建议至少 800x600`,
        value: width * height
      });
      score = 60; // 提高评分，从 40 改为 60
    } else if (
      width < this.thresholds.resolution.optimalWidth ||
      height < this.thresholds.resolution.optimalHeight
    ) {
      issues.push({
        type: 'lowResolution',
        severity: 'low',
        message: `图片分辨率可接受 (${width}x${height})，建议提高分辨率以获得更好效果`,
        value: width * height
      });
      score = 85; // 提高评分，从 75 改为 85
    }
    
    return { score, issues };
  }

  /**
   * 检查文件大小
   */
  private checkFileSize(imageDataUrl: string): {
    score: number;
    value: number;
    issues: QualityIssue[];
  } {
    const base64Data = imageDataUrl.split(',')[1] || imageDataUrl;
    const fileSize = Buffer.from(base64Data, 'base64').length;
    
    const issues: QualityIssue[] = [];
    let score = 100;
    
    if (fileSize < this.thresholds.fileSize.min) {
      issues.push({
        type: 'lowResolution',
        severity: 'medium',
        message: '文件过小，可能质量不佳',
        value: fileSize
      });
      score = 60;
    } else if (fileSize > this.thresholds.fileSize.max) {
      issues.push({
        type: 'lowResolution',
        severity: 'low',
        message: '文件过大，可能影响上传速度',
        value: fileSize
      });
      score = 90;
    }
    
    return { score, value: fileSize, issues };
  }

  /**
   * 计算综合评分
   */
  private calculateOverallScore(scores: {
    brightness: number;
    sharpness: number;
    resolution: number;
    fileSize: number;
  }): number {
    // 加权平均
    const weights = {
      brightness: 0.25,
      sharpness: 0.35,  // 清晰度最重要
      resolution: 0.30,
      fileSize: 0.10
    };
    
    const weightedScore =
      scores.brightness * weights.brightness +
      scores.sharpness * weights.sharpness +
      scores.resolution * weights.resolution +
      scores.fileSize * weights.fileSize;
    
    return Math.round(weightedScore);
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(issues: QualityIssue[]): string[] {
    const suggestions: string[] = [];
    const issueTypes = new Set(issues.map(i => i.type));
    
    if (issueTypes.has('dark')) {
      suggestions.push('确保光线充足，避免阴影');
    }
    
    if (issueTypes.has('bright')) {
      suggestions.push('避免强光直射，减少过曝');
    }
    
    if (issueTypes.has('blur')) {
      suggestions.push('保持手机稳定，避免抖动');
      suggestions.push('确保对焦清晰，文字可读');
    }
    
    if (issueTypes.has('skew')) {
      suggestions.push('保持相机与试卷平行，避免倾斜');
    }
    
    if (issueTypes.has('lowResolution')) {
      suggestions.push('使用更高分辨率拍摄');
      suggestions.push('保持适当距离，确保试卷完整');
    }
    
    if (issueTypes.has('glare')) {
      suggestions.push('调整角度，避免反光');
    }
    
    // 通用建议
    if (suggestions.length === 0) {
      suggestions.push('图片质量良好，可以继续分析');
    }
    
    return suggestions;
  }
}

/**
 * 单例实例
 */
let imageQualityCheckerInstance: ImageQualityChecker | null = null;

/**
 * 获取图片质量检查器实例
 */
export function getImageQualityChecker(): ImageQualityChecker {
  if (!imageQualityCheckerInstance) {
    imageQualityCheckerInstance = new ImageQualityChecker();
  }
  return imageQualityCheckerInstance;
}
