import OpenAI from 'openai';
import dotenv from 'dotenv';
import { LLMProvider, LLMService } from './interface'; // 引用类型定义
import { SYSTEM_PROMPT } from './prompts';

// 加载 .env 环境变量
dotenv.config();

// 定义一个简单的接口来承载不同厂商的 Client
interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export class LLMServiceImpl implements LLMService {
  private configs: Record<LLMProvider, ProviderConfig>;

  constructor() {
    // 初始化配置，从环境变量读取
    this.configs = {
      doubao: {
        apiKey: process.env.DOUBAO_API_KEY || '',
        baseURL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        model: process.env.DOUBAO_MODEL_ID || '', // 豆包必须指定 Endpoint ID
      },
      aliyun: {
        apiKey: process.env.ALIYUN_API_KEY || '',
        baseURL: process.env.ALIYUN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: process.env.ALIYUN_MODEL_ID || 'qwen-plus',
      },
      zhipu: {
        apiKey: process.env.ZHIPU_API_KEY || '',
        baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        model: process.env.ZHIPU_MODEL_ID || 'glm-4',
      }
    };
  }

  /**
   * 核心生成方法
   */
  async generateAnalysis(prompt: string, provider: LLMProvider): Promise<string> {
    const config = this.configs[provider];

    // 检查配置是否完整
    if (!config.apiKey) {
      throw new Error(`未配置 ${provider} 的 API Key，请检查 .env 文件`);
    }
    if (provider === 'doubao' && !config.model) {
      throw new Error(`未配置豆包的 Model ID (推理接入点)，请检查 .env 文件`);
    }

    console.log(`🚀 [LLM] 正在调用: ${provider} | Model: ${config.model}`);

    // 初始化 OpenAI 兼容客户端
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7, // 稍微有点创造力，但不要太发散
      });

      const content = response.choices[0]?.message?.content || '';
      return content;

    } catch (error: any) {
      console.error(`❌ [LLM] 调用失败:`, error.message);
      // 抛出更友好的错误
      throw new Error(`${provider} 调用失败: ${error.message}`);
    }
  }

  /**
   * 多模态图片分析
   */
  async generateImageAnalysis(images: string[], prompt: string, config: { apiKey: string, modelId: string, provider: string }): Promise<string> {
    // 1. 确定 BaseURL
    let baseURL = '';
    if (config.provider === 'doubao') {
      baseURL = 'https://ark.cn-beijing.volces.com/api/v3';
    } else if (config.provider === 'aliyun') {
       baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    } else {
        // 兜底使用默认配置中的 URL
        baseURL = this.configs[config.provider as LLMProvider]?.baseURL || '';
    }

    if (!config.apiKey || !config.modelId) {
        throw new Error('未提供有效的 API Key 或 Model ID');
    }

    console.log(`🚀 [LLM Vision] 正在调用: ${config.provider} | Model: ${config.modelId}`);

    // 2. 初始化客户端
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: baseURL,
    });

    // 3. 构造多模态消息
    const contentParts: any[] = [
        { type: "text", text: prompt }
    ];

    images.forEach(img => {
        contentParts.push({
            type: "image_url",
            image_url: {
                url: img // 假设前端传过来的是完整的 Data URI (data:image/...)
            }
        });
    });

    try {
      const response = await client.chat.completions.create({
        model: config.modelId,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contentParts }
        ],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      return content;

    } catch (error: any) {
      console.error(`❌ [LLM Vision] 调用失败:`, error.message);
      throw new Error(`${config.provider} Vision 调用失败: ${error.message}`);
    }
  }
}

// 导出单例
export const llmService = new LLMServiceImpl();
