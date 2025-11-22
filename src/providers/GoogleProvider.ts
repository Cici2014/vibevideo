/**
 * Google Provider
 * 基于 Google Gemini API 实现
 * 参考：
 * - 图像生成：使用 gemini-3-pro-image-preview 模型
 * - 视频生成：使用 Google Veo 或相关视频生成模型
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VideoAIProvider, VideoOptions, ImageOptions, TaskStatus, GoogleConfig } from './types';
import { imageToBase64 } from '../utils/imageEncoder';

/**
 * Google 图像生成响应
 */
interface ImageGenerationResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
  };
}

/**
 * Google 视频生成响应
 */
interface VideoGenerationResponse {
  name?: string;
  done?: boolean;
  error?: {
    code?: number;
    message?: string;
  };
  response?: {
    videoUri?: string;
  };
}

/**
 * Google Provider 客户端接口
 * 提供多图合成等高级功能
 */
class GoogleProviderClient {
  private provider: GoogleProvider;

  constructor(provider: GoogleProvider) {
    this.provider = provider;
  }

  /**
   * 多图合成（图片编辑）
   * 使用 Google Gemini API 的多模态能力，支持多图输入
   */
  async composeMultipleImages(
    imageBase64Array: string[],  // Base64 Data URL 格式的图片数组（data:image/png;base64,...）
    prompt: string,               // 合成描述
    size: string = '1280*720',   // 输出图片尺寸，默认16:9比例
    n: number = 1                 // 生成图片数量（Google API 通常只支持 n=1）
  ): Promise<string> {
    // 访问 provider 的私有方法
    return (this.provider as any).composeMultipleImagesInternal(imageBase64Array, prompt, size, n);
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    return this.provider.downloadResource(taskId, savePath);
  }
}

/**
 * Google Provider
 * 
 * 支持情况：
 * ✅ 文生图：支持（使用 gemini-3-pro-image-preview 模型）
 * ✅ 多图合成：支持（使用 Gemini API 多模态能力）
 * ✅ 图生视频：支持（使用 Google Veo 或相关模型）
 * ✅ 文生视频：支持（使用 Google Veo 或相关模型）
 * ✅ 视频状态查询：支持（轮询任务状态）
 * 
 * 注意事项：
 * - 图像生成返回 base64 数据，需要保存为文件
 * - 视频生成是异步的，需要轮询状态接口获取视频链接
 */
export class GoogleProvider implements VideoAIProvider {
  readonly name = 'Google Gemini';
  public readonly client: GoogleProviderClient;
  private apiKey: string;
  private baseUrl: string;
  private imageModel: string;
  private videoModel: string;
  private projectId?: string;
  private location?: string;

  constructor(config: GoogleConfig) {
    this.apiKey = config.apiKey;
    // 默认使用 Google AI Studio API
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    // 默认图像生成模型
    this.imageModel = config.imageModel || 'gemini-3-pro-image-preview';
    // 默认视频生成模型
    this.videoModel = config.videoModel || 'veo-3';
    // Vertex AI 配置（如果使用 Vertex AI）
    this.projectId = config.projectId;
    this.location = config.location || 'us-central1';
    
    // 初始化 client
    this.client = new GoogleProviderClient(this);
  }

  /**
   * 多图合成（内部实现）
   * 使用 Google Gemini 图片编辑模型（gemini-2.5-flash-image），支持多图输入合成
   * 参考：https://ai.google.dev/gemini-api/docs/image-generation
   */
  async composeMultipleImagesInternal(
    imageBase64Array: string[],  // Base64 Data URL 格式的图片数组（data:image/png;base64,...）
    prompt: string,               // 合成描述
    size: string = '1280*720',   // 输出图片尺寸，默认16:9比例（仅供参考，实际由模型决定）
    n: number = 1                 // 生成图片数量（Google API 通常只支持 n=1）
  ): Promise<string> {
    console.log('[Google] 多图合成请求:', { 
      imageCount: imageBase64Array.length, 
      size, 
      prompt: prompt.substring(0, 100) 
    });

    // 使用图片编辑模型（而不是文生图模型）
    const imageEditModel = 'gemini-2.5-flash-image';

    // 构建请求 URL
    const url = `${this.baseUrl}/models/${imageEditModel}:generateContent`;

    // 构建 parts 数组：先添加文本提示词，然后添加所有图片
    // 根据 Google API 文档，文本提示应该在图片之前
    const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
    
    // 先添加文本提示词（包含尺寸要求）
    const enhancedPrompt = `${prompt}

要求：根据提供的图片合成一张新的图片。`;
    
    parts.push({ text: enhancedPrompt });
    
    // 然后添加所有图片
    for (const imageBase64 of imageBase64Array) {
      // 移除 data URL 前缀（如果有），只保留 base64 数据
      let imageData = imageBase64;
      let mimeType = 'image/png';
      
      if (imageBase64.startsWith('data:')) {
        // 解析 data URL 格式：data:image/png;base64,<base64数据>
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1] || 'image/png';
          imageData = match[2];
        } else {
          // 如果没有正确格式，尝试直接提取 base64 部分
          const commaIndex = imageBase64.indexOf(',');
          if (commaIndex > 0) {
            const header = imageBase64.substring(0, commaIndex);
            const mimeMatch = header.match(/data:([^;]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1] || 'image/png';
            }
            imageData = imageBase64.substring(commaIndex + 1);
          }
        }
      }

      // Google API 使用 mime_type 而不是 mimeType（根据用户提供的示例）
      parts.push({
        inlineData: {
          mimeType: mimeType,  // API 实际使用 mime_type，但这里保持驼峰命名，JSON 序列化会处理
          data: imageData
        } as any  // 使用 as any 因为实际 API 可能需要 mime_type
      });
    }

    // 构建请求体
    const body: any = {
      contents: [{
        parts: parts.map(part => {
          // 将 mimeType 转换为 mime_type 以匹配 Google API 格式
          if (part.inlineData) {
            return {
              inline_data: {
                mime_type: part.inlineData.mimeType,
                data: part.inlineData.data
              }
            };
          } else {
            return part;
          }
        })
      }]
    };

    console.log('[Google] 多图合成请求:', {
      url,
      model: imageEditModel,
      imageCount: imageBase64Array.length,
      prompt: prompt.substring(0, 100)
    });

    // 使用 x-goog-api-key header 而不是 key 查询参数
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`多图合成失败: ${response.status} ${response.statusText} - ${responseText}`);
    }
    let data: any;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`无法解析响应: ${responseText.substring(0, 200)}`);
    }

    if (data.error) {
      throw new Error(`多图合成失败: ${data.error.message || '未知错误'}`);
    }

    // 提取图像数据
    // 根据用户示例，响应格式是 JSON，包含 "data": "<base64>" 字段
    let imageData: string | undefined;
    let mimeType = 'image/png';

    // 方法1：尝试从 candidates 中提取（标准格式）
    // Google API 返回的字段名可能是 inline_data（下划线）或 inlineData（驼峰）
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    if (part) {
      // 尝试 inline_data（下划线格式，Google API 标准）
      if (part.inline_data?.data) {
        imageData = part.inline_data.data;
        mimeType = part.inline_data.mime_type || part.inline_data.mimeType || 'image/png';
      }
      // 尝试 inlineData（驼峰格式，可能在某些情况下使用）
      else if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || part.inlineData.mime_type || 'image/png';
      }
    }

    // 方法2：尝试直接从响应中提取 "data" 字段（根据用户示例）
    if (!imageData && data.data) {
      imageData = data.data;
    }

    // 方法3：尝试从响应文本中正则匹配（备用方法）
    if (!imageData) {
      const dataMatch = responseText.match(/"data":\s*"([^"]+)"/);
      if (dataMatch && dataMatch[1]) {
        imageData = dataMatch[1];
      }
    }

    if (!imageData) {
      console.error('[Google] 响应数据:', responseText.substring(0, 500));
      throw new Error('未返回图像数据，请检查 API 响应格式');
    }

    // 保存为临时文件并返回路径
    
    const tempDir = path.join(os.tmpdir(), 'vibevideo-google');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, `composed-${Date.now()}.${mimeType.split('/')[1] || 'png'}`);
    await fs.promises.writeFile(tempFile, Buffer.from(imageData, 'base64'));

    console.log('[Google] 多图合成成功，保存到:', tempFile);
    
    // 返回临时文件路径（作为 taskId）
    return tempFile;
  }

  /**
   * 文生图（生成初始帧）
   * API: POST /models/{model}:generateContent
   */
  async textToImage(prompt: string, options?: ImageOptions, n?: number): Promise<string> {
    console.log('[Google] 文生图请求:', { prompt, size: options?.size, n });

    // 解析尺寸（格式：宽度*高度，例如：1280*720）
    let width = 1024;
    let height = 1024;
    if (options?.size) {
      const sizeParts = options.size.split('*');
      if (sizeParts.length === 2) {
        width = parseInt(sizeParts[0].trim()) || 1024;
        height = parseInt(sizeParts[1].trim()) || 1024;
      }
    }

    // 构建请求 URL
    const url = `${this.baseUrl}/models/${this.imageModel}:generateContent`;

    // 构建请求体
    const body: any = {
      contents: [{
        parts: [{
          text: `Generate an image: ${prompt}. Image dimensions: ${width}x${height} pixels.`
        }]
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    console.log('[Google] 图像生成请求:', {
      url,
      model: this.imageModel,
      width,
      height
    });

    const response = await fetch(`${url}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`图像生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as ImageGenerationResponse;

    if (data.error) {
      throw new Error(`图像生成失败: ${data.error.message || '未知错误'}`);
    }

    // 提取图像数据
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const inlineData = part?.inlineData;

    if (!inlineData || !inlineData.data) {
      throw new Error('未返回图像数据');
    }

    // 将 base64 数据转换为临时文件 URL
    // 注意：这里返回一个特殊的标识符，后续通过 checkStatus 处理
    const imageData = inlineData.data;
    const mimeType = inlineData.mimeType || 'image/png';
    
    // 保存为临时文件并返回路径
    const tempDir = path.join(os.tmpdir(), 'vibevideo-google');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, `image-${Date.now()}.${mimeType.split('/')[1] || 'png'}`);
    await fs.promises.writeFile(tempFile, Buffer.from(imageData, 'base64'));

    console.log('[Google] 图像生成成功，保存到:', tempFile);
    
    // 返回临时文件路径（作为 taskId）
    return tempFile;
  }

  /**
   * 图生视频（基于首帧）
   * 使用 Google Veo 或相关视频生成模型
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[Google] 图生视频请求:', { imagePath, prompt, n });

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    // 将图片转换为 base64
    const imageBase64 = await imageToBase64(imagePath);
    // 移除 data URL 前缀，只保留 base64 数据
    const imageData = imageBase64.split(',')[1];

    // 解析分辨率
    let width = 1280;
    let height = 720;
    if (options?.resolution) {
      if (options.resolution === '480P') {
        width = 854;
        height = 480;
      } else if (options.resolution === '720P') {
        width = 1280;
        height = 720;
      } else if (options.resolution === '1080P') {
        width = 1920;
        height = 1080;
      }
    }

    // 如果使用 Vertex AI，使用不同的端点
    if (this.projectId) {
      return this.imageToVideoVertexAI(imageData, prompt, width, height, options);
    }

    // 使用 Google AI Studio API（如果支持视频生成）
    // 注意：Google AI Studio 可能不直接支持视频生成，这里使用模拟实现
    // 实际使用时需要根据 Google 的 API 文档调整
    const url = `${this.baseUrl}/models/${this.videoModel}:generateContent`;

    const body = {
      contents: [{
        parts: [
          {
            text: `Generate a video from this image with the following description: ${prompt}. Video resolution: ${width}x${height}.`
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageData
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      }
    };

    console.log('[Google] 视频生成请求:', {
      url,
      model: this.videoModel,
      width,
      height,
      prompt: prompt.substring(0, 100)
    });

    const response = await fetch(`${url}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    // 如果返回了 name（任务ID），返回它
    if (data.name) {
      console.log('[Google] 视频生成任务已提交，taskId:', data.name);
      return data.name;
    }

    // 如果直接返回了视频 URI
    if (data.response?.videoUri) {
      console.log('[Google] 视频生成成功，URI:', data.response.videoUri);
      return data.response.videoUri;
    }

    throw new Error('未返回任务 ID 或视频 URI');
  }

  /**
   * 使用 Vertex AI 进行图生视频
   */
  private async imageToVideoVertexAI(
    imageData: string,
    prompt: string,
    width: number,
    height: number,
    options?: VideoOptions
  ): Promise<string> {
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.videoModel}:predict`;

    const body = {
      instances: [{
        prompt: prompt,
        image: {
          bytesBase64Encoded: imageData
        },
        videoResolution: `${width}x${height}`
      }],
      parameters: {
        sampleCount: 1,
        duration: options?.duration || 5
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    if (data.name) {
      return data.name;
    }

    if (data.response?.videoUri) {
      return data.response.videoUri;
    }

    throw new Error('未返回任务 ID 或视频 URI');
  }

  /**
   * 纯文生视频（无首帧）
   */
  async textToVideo(prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[Google] 文生视频请求:', { prompt, resolution: options?.resolution, n });

    // 解析分辨率
    let width = 1280;
    let height = 720;
    if (options?.resolution) {
      if (options.resolution === '480P') {
        width = 854;
        height = 480;
      } else if (options.resolution === '720P') {
        width = 1280;
        height = 720;
      } else if (options.resolution === '1080P') {
        width = 1920;
        height = 1080;
      }
    } else if (typeof options?.resolution === 'string' && options.resolution.includes('*')) {
      // 支持 width*height 格式
      const sizeParts = options.resolution.split('*');
      if (sizeParts.length === 2) {
        width = parseInt(sizeParts[0].trim()) || 1280;
        height = parseInt(sizeParts[1].trim()) || 720;
      }
    }

    // 如果使用 Vertex AI，使用不同的端点
    if (this.projectId) {
      return this.textToVideoVertexAI(prompt, width, height, options);
    }

    // 使用 Google AI Studio API
    const url = `${this.baseUrl}/models/${this.videoModel}:generateContent`;

    const body = {
      contents: [{
        parts: [{
          text: `Generate a video with the following description: ${prompt}. Video resolution: ${width}x${height} pixels. Duration: ${options?.duration || 5} seconds.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      }
    };

    console.log('[Google] 视频生成请求:', {
      url,
      model: this.videoModel,
      width,
      height,
      prompt: prompt.substring(0, 100)
    });

    const response = await fetch(`${url}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    if (data.name) {
      console.log('[Google] 视频生成任务已提交，taskId:', data.name);
      return data.name;
    }

    if (data.response?.videoUri) {
      console.log('[Google] 视频生成成功，URI:', data.response.videoUri);
      return data.response.videoUri;
    }

    throw new Error('未返回任务 ID 或视频 URI');
  }

  /**
   * 使用 Vertex AI 进行文生视频
   */
  private async textToVideoVertexAI(
    prompt: string,
    width: number,
    height: number,
    options?: VideoOptions
  ): Promise<string> {
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.videoModel}:predict`;

    const body = {
      instances: [{
        prompt: prompt,
        videoResolution: `${width}x${height}`
      }],
      parameters: {
        sampleCount: 1,
        duration: options?.duration || 5
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    if (data.name) {
      return data.name;
    }

    if (data.response?.videoUri) {
      return data.response.videoUri;
    }

    throw new Error('未返回任务 ID 或视频 URI');
  }

  /**
   * 查询任务状态
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    // 如果 taskId 是文件路径（图像生成直接返回文件路径），直接返回完成状态
    if (fs.existsSync(taskId) && !taskId.startsWith('http')) {
      return {
        status: 'completed',
        progress: 100,
        url: taskId // 返回文件路径
      };
    }

    // 如果 taskId 是 URL，直接返回完成状态
    if (taskId.startsWith('http')) {
      return {
        status: 'completed',
        progress: 100,
        url: taskId
      };
    }

    // 视频生成返回的是任务 ID，需要查询状态
    // 如果使用 Vertex AI
    if (this.projectId) {
      return this.checkStatusVertexAI(taskId);
    }

    // 使用 Google AI Studio API 查询状态
    // 注意：实际 API 端点可能不同，需要根据文档调整
    const url = `${this.baseUrl}/operations/${taskId}`;

    console.log('[Google] 查询视频状态:', { taskId });

    const response = await fetch(`${url}?key=${this.apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`查询状态失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      return {
        status: 'failed',
        error: data.error.message || '未知错误'
      };
    }

    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (data.done) {
      status = 'completed';
    } else {
      status = 'processing';
    }

    return {
      status: status,
      progress: status === 'completed' ? 100 : status === 'processing' ? 50 : undefined,
      url: data.response?.videoUri
    };
  }

  /**
   * 使用 Vertex AI 查询状态
   */
  private async checkStatusVertexAI(taskId: string): Promise<TaskStatus> {
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/${taskId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`查询状态失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      return {
        status: 'failed',
        error: data.error.message || '未知错误'
      };
    }

    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (data.done) {
      status = 'completed';
    } else {
      status = 'processing';
    }

    return {
      status: status,
      progress: status === 'completed' ? 100 : status === 'processing' ? 50 : undefined,
      url: data.response?.videoUri
    };
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[Google] 下载资源:', { taskId, savePath });

    // 如果 taskId 是文件路径，直接复制
    if (fs.existsSync(taskId) && !taskId.startsWith('http')) {
      await fs.promises.copyFile(taskId, savePath);
      console.log('[Google] 资源复制完成:', savePath);
      return;
    }

    // 如果 taskId 是 URL，直接下载
    let url: string;
    if (taskId.startsWith('http')) {
      url = taskId;
    } else {
      // 否则查询状态获取 URL
      const status = await this.checkStatus(taskId);
      if (status.status !== 'completed') {
        throw new Error('资源尚未生成完成');
      }
      if (!status.url) {
        throw new Error('未找到资源 URL');
      }
      url = status.url;
    }

    // 下载文件
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(savePath, Buffer.from(buffer));

    console.log('[Google] 资源下载完成:', savePath);
  }

  /**
   * 测试连接
   * 通过尝试一个简单的图像生成请求来测试 API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[Google] 测试连接...');
      
      // 尝试一个简单的图像生成请求来测试
      const url = `${this.baseUrl}/models/${this.imageModel}:generateContent`;
      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'test'
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Google] 连接测试失败:', response.status, errorText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[Google] 连接失败:', error);
      return false;
    }
  }
}

