// =================================================================================
// 大模型适配层定义 - 接口定义文件
// =================================================================================

// 1. LLM 服务商类型
export type LLMProvider = 'doubao' | 'aliyun' | 'zhipu';

// 2. 统一的 LLM 调用接口
export interface LLMService {
  /**
   * 调用大模型生成分析
   * @param prompt 完整的提示词字符串
   * @param modelProvider 选择的模型提供商
   */
  generateAnalysis(prompt: string, modelProvider: LLMProvider): Promise<string>;

  /**
   * 调用大模型进行图片分析 (多模态)
   * @param images 图片 Base64 数组
   * @param prompt 提示词
   * @param provider 使用的模型服务商
   */
  generateImageAnalysis(images: string[], prompt: string, provider: LLMProvider): Promise<string>;
}
