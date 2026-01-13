// =================================================================================
// 错误消息管理器 (Error Message Manager)
// 提供友好、具体、可操作的错误提示
// =================================================================================

export interface ErrorContext {
  code: string;
  originalError?: Error;
  details?: Record<string, any>;
}

export interface ErrorMessage {
  userMessage: string;      // 用户友好的错误描述
  technicalMessage: string; // 技术细节（用于日志）
  suggestions: string[];    // 解决建议
  errorCode: string;        // 错误代码
}

/**
 * 错误消息管理器
 * 将技术错误转换为用户友好的消息
 */
export class ErrorMessageManager {
  /**
   * 生成友好的错误消息
   */
  generateErrorMessage(context: ErrorContext): ErrorMessage {
    const { code, originalError, details } = context;

    switch (code) {
      case 'IMAGE_UPLOAD_FAILED':
        return {
          userMessage: '图片上传失败，请检查图片格式和大小',
          technicalMessage: `Image upload failed: ${originalError?.message || 'Unknown error'}`,
          suggestions: [
            '确保图片格式为 JPG、PNG 或 JPEG',
            '检查图片大小是否超过 10MB',
            '尝试重新拍照或选择其他图片',
            '如果问题持续，请联系技术支持'
          ],
          errorCode: 'ERR_IMAGE_UPLOAD'
        };

      case 'IMAGE_TOO_LARGE':
        return {
          userMessage: `图片文件过大（${details?.size || '未知'}），请压缩后重试`,
          technicalMessage: `Image size ${details?.size} exceeds limit ${details?.limit}`,
          suggestions: [
            '使用手机相机的"标准"模式而非"高清"模式拍照',
            '使用图片压缩工具减小文件大小',
            '建议单张图片不超过 5MB'
          ],
          errorCode: 'ERR_IMAGE_TOO_LARGE'
        };

      case 'IMAGE_FORMAT_INVALID':
        return {
          userMessage: `不支持的图片格式（${details?.format || '未知'}）`,
          technicalMessage: `Invalid image format: ${details?.format}`,
          suggestions: [
            '请使用 JPG、PNG 或 JPEG 格式的图片',
            '如果是截图，请保存为 PNG 格式',
            '如果是照片，请保存为 JPG 格式'
          ],
          errorCode: 'ERR_IMAGE_FORMAT'
        };

      case 'NO_IMAGES_PROVIDED':
        return {
          userMessage: '未检测到图片，请至少上传一张试卷图片',
          technicalMessage: 'No images provided in request',
          suggestions: [
            '点击"上传图片"按钮选择试卷照片',
            '确保已成功选择图片文件',
            '如果使用拍照功能，请确保照片已保存'
          ],
          errorCode: 'ERR_NO_IMAGES'
        };

      case 'OCR_FAILED':
        return {
          userMessage: '图片识别失败，可能是图片不清晰或光线不足',
          technicalMessage: `OCR processing failed: ${originalError?.message || 'Unknown error'}`,
          suggestions: [
            '确保试卷图片清晰可见，文字可辨认',
            '避免强光反射或阴影遮挡',
            '尝试在光线充足的环境下重新拍照',
            '确保试卷平整，避免折叠或褶皱',
            '可以尝试调整拍照角度，保持垂直拍摄'
          ],
          errorCode: 'ERR_OCR_FAILED'
        };

      case 'LLM_TIMEOUT':
        return {
          userMessage: '分析超时，服务器处理时间过长',
          technicalMessage: `LLM request timeout after ${details?.timeout || 'unknown'}ms`,
          suggestions: [
            '请稍后重试，服务器可能正在处理大量请求',
            '如果图片数量较多，可以分批上传',
            '建议单次上传不超过 4 张图片',
            '如果问题持续，请联系技术支持'
          ],
          errorCode: 'ERR_LLM_TIMEOUT'
        };

      case 'LLM_API_ERROR':
        return {
          userMessage: 'AI分析服务暂时不可用，请稍后重试',
          technicalMessage: `LLM API error: ${originalError?.message || 'Unknown error'}`,
          suggestions: [
            '请等待 1-2 分钟后重试',
            '检查网络连接是否正常',
            '如果问题持续，可能是服务维护中',
            '请联系技术支持获取帮助'
          ],
          errorCode: 'ERR_LLM_API'
        };

      case 'JSON_PARSE_FAILED':
        return {
          userMessage: '分析结果格式异常，系统正在尝试修复',
          technicalMessage: `JSON parsing failed: ${originalError?.message || 'Unknown error'}`,
          suggestions: [
            '系统会自动重试，请稍候',
            '如果多次失败，请尝试重新上传图片',
            '确保上传的是完整的试卷图片'
          ],
          errorCode: 'ERR_JSON_PARSE'
        };

      case 'RATE_LIMIT_EXCEEDED':
        return {
          userMessage: '请求过于频繁，请稍后再试',
          technicalMessage: `Rate limit exceeded: ${details?.limit || 'unknown'} requests per ${details?.window || 'unknown'}`,
          suggestions: [
            `请等待 ${details?.retryAfter || '60'} 秒后重试`,
            '避免短时间内多次提交相同请求',
            '如需分析多份试卷，请分批处理'
          ],
          errorCode: 'ERR_RATE_LIMIT'
        };

      case 'DAILY_QUOTA_EXCEEDED':
        return {
          userMessage: '今日分析次数已达上限',
          technicalMessage: `Daily quota exceeded: ${details?.used || 'unknown'}/${details?.limit || 'unknown'}`,
          suggestions: [
            `配额将在 ${details?.resetTime || '明天'} 重置`,
            '如需更多分析次数，请联系管理员',
            '可以考虑升级到高级版本'
          ],
          errorCode: 'ERR_DAILY_QUOTA'
        };

      case 'INVALID_REQUEST':
        return {
          userMessage: '请求参数不正确，请检查输入',
          technicalMessage: `Invalid request: ${details?.reason || 'Unknown reason'}`,
          suggestions: [
            '检查所有必填字段是否已填写',
            '确保输入格式正确',
            '如果问题持续，请刷新页面重试'
          ],
          errorCode: 'ERR_INVALID_REQUEST'
        };

      case 'NETWORK_ERROR':
        return {
          userMessage: '网络连接失败，请检查网络设置',
          technicalMessage: `Network error: ${originalError?.message || 'Unknown error'}`,
          suggestions: [
            '检查设备是否连接到互联网',
            '尝试切换到更稳定的网络环境',
            '如果使用移动数据，确保信号良好',
            '尝试刷新页面后重试'
          ],
          errorCode: 'ERR_NETWORK'
        };

      case 'SERVER_ERROR':
        return {
          userMessage: '服务器内部错误，我们正在处理',
          technicalMessage: `Server error: ${originalError?.message || 'Unknown error'}`,
          suggestions: [
            '请稍后重试',
            '如果问题持续，请联系技术支持',
            '您可以尝试刷新页面'
          ],
          errorCode: 'ERR_SERVER'
        };

      case 'EVIDENCE_INCOMPLETE':
        return {
          userMessage: '分析结果不完整，缺少部分证据信息',
          technicalMessage: `Evidence validation failed: ${details?.missingFields?.join(', ') || 'unknown fields'}`,
          suggestions: [
            '系统正在重新分析，请稍候',
            '如果问题持续，可能是图片质量问题',
            '建议重新拍摄更清晰的试卷照片'
          ],
          errorCode: 'ERR_EVIDENCE_INCOMPLETE'
        };

      case 'LOW_CONFIDENCE':
        return {
          userMessage: '识别置信度较低，建议人工复核',
          technicalMessage: `Low confidence: ${details?.confidence || 'unknown'}`,
          suggestions: [
            '请仔细核对识别结果',
            '如有错误，可以手动修正',
            '建议重新拍摄更清晰的照片',
            '确保试卷文字清晰可见'
          ],
          errorCode: 'ERR_LOW_CONFIDENCE'
        };

      default:
        return {
          userMessage: '发生未知错误，请稍后重试',
          technicalMessage: `Unknown error: ${code} - ${originalError?.message || 'No details'}`,
          suggestions: [
            '请刷新页面后重试',
            '如果问题持续，请联系技术支持',
            `错误代码: ${code}`
          ],
          errorCode: 'ERR_UNKNOWN'
        };
    }
  }

  /**
   * 格式化错误消息为JSON响应
   */
  formatErrorResponse(errorMessage: ErrorMessage): any {
    return {
      success: false,
      errorCode: errorMessage.errorCode,
      errorMessage: errorMessage.userMessage,
      suggestions: errorMessage.suggestions,
      technicalDetails: errorMessage.technicalMessage
    };
  }

  /**
   * 从标准Error对象推断错误类型
   */
  inferErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return 'LLM_TIMEOUT';
    if (message.includes('network') || message.includes('econnrefused')) return 'NETWORK_ERROR';
    if (message.includes('json') || message.includes('parse')) return 'JSON_PARSE_FAILED';
    if (message.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
    if (message.includes('quota')) return 'DAILY_QUOTA_EXCEEDED';
    if (message.includes('image')) return 'IMAGE_UPLOAD_FAILED';
    if (message.includes('ocr')) return 'OCR_FAILED';

    return 'SERVER_ERROR';
  }

  /**
   * 处理错误并生成友好消息
   */
  handleError(error: Error, code?: string): ErrorMessage {
    const errorCode = code || this.inferErrorCode(error);
    return this.generateErrorMessage({
      code: errorCode,
      originalError: error
    });
  }
}

// 单例模式
let managerInstance: ErrorMessageManager | null = null;

export function getErrorMessageManager(): ErrorMessageManager {
  if (!managerInstance) {
    managerInstance = new ErrorMessageManager();
  }
  return managerInstance;
}
