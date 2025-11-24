/**
 * Sora Provider
 * 基于 OpenAI Sora API 实现
 * 参考：https://platform.openai.com/docs/api-reference/videos
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VideoAIProvider, VideoOptions, ImageOptions, TaskStatus, SoraConfig } from './types';
import { imageToBase64 } from '../utils/imageEncoder';

/**
 * OpenAI API 响应类型
 */
interface OpenAIResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * OpenAI 视频生成响应
 * 参考：https://platform.openai.com/docs/api-reference/videos
 */
interface VideoGenerationResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * Sora Provider
 * 
 * 支持情况：
 * ✅ 文生图：支持（使用 gpt-image-1 或 DALL-E 3 模型）
 * ✅ 图片编辑：支持（使用 gpt-image-1 模型，支持多图合成）
 * ✅ 图生视频：支持（使用 Sora 模型）
 * ✅ 文生视频：支持（使用 Sora 模型）
 * ✅ 视频状态查询：支持（轮询任务状态）
 * 
 * API 参考：
 * - 图片生成：https://platform.openai.com/docs/api-reference/images/create
 * - 图片编辑：https://platform.openai.com/docs/api-reference/images/edits
 * - 视频生成：https://platform.openai.com/docs/api-reference/videos
 */
export class SoraProvider implements VideoAIProvider {
  readonly name = 'OpenAI Sora';
  private apiKey: string;
  private baseUrl: string;
  private videoModel: string;
  private imageModel: string;

  constructor(config: SoraConfig) {
    this.apiKey = config.apiKey;
    // 默认使用 OpenAI API
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    // 默认视频生成模型
    this.videoModel = config.videoModel || 'sora';
    // 默认图像生成模型（支持 gpt-image-1 和 dall-e-3）
    // 参考：https://platform.openai.com/docs/api-reference/images/create
    this.imageModel = config.imageModel || 'gpt-image-1';
  }

  /**
   * 文生图（生成初始帧）
   * 支持 gpt-image-1 和 dall-e-3 模型
   */
  async textToImage(prompt: string, options?: ImageOptions, n?: number): Promise<string> {
    console.log('[Sora] 文生图请求:', { prompt, size: options?.size, n });

    // 解析尺寸（格式：宽度*高度，例如：1280*720）
    let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
    if (options?.size) {
      const sizeParts = options.size.split('*');
      if (sizeParts.length === 2) {
        const width = parseInt(sizeParts[0].trim());
        const height = parseInt(sizeParts[1].trim());
        
        // gpt-image-1 和 DALL-E 3 支持的尺寸
        if (width === 1024 && height === 1024) {
          size = '1024x1024';
        } else if (width === 1792 && height === 1024) {
          size = '1792x1024';
        } else if (width === 1024 && height === 1792) {
          size = '1024x1792';
        } else {
          // 如果不匹配，使用最接近的尺寸
          const aspectRatio = width / height;
          if (aspectRatio > 1.5) {
            size = '1792x1024';
          } else if (aspectRatio < 0.7) {
            size = '1024x1792';
          } else {
            size = '1024x1024';
          }
        }
      }
    }

    // gpt-image-1 和 DALL-E 3 通常只支持 n=1
    const numOutputs = n !== undefined ? Math.min(n, 1) : 1;

    // 构建请求 URL
    const url = `${this.baseUrl}/images/generations`;

    // 构建请求体
    // 根据官方 API 文档：https://platform.openai.com/docs/api-reference/images/create
    const body: any = {
      model: this.imageModel,
      prompt: prompt,
      n: numOutputs,
      size: size
    };

    // 可选参数（仅在对模型支持时添加）
    // quality 参数仅适用于某些模型（如 dall-e-3）
    if (this.imageModel === 'dall-e-3') {
      body.quality = 'standard';
    }
    // response_format 默认为 'url'，如果需要可以添加
    // body.response_format = 'url';

    console.log('[Sora] 图像生成请求:', {
      url,
      model: this.imageModel,
      size
    });

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
      throw new Error(`图像生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;

    if (data.error) {
      throw new Error(`图像生成失败: ${data.error.message || '未知错误'}`);
    }

    // 提取图像 URL
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('未返回图像 URL');
    }

    console.log('[Sora] 图像生成成功，URL:', imageUrl);
    
    // 返回 URL（需要调用者下载）
    return imageUrl;
  }

  /**
   * 图片编辑（多图合成）
   * 支持多张图片合成到一张图片中
   * 参考：https://platform.openai.com/docs/api-reference/images/edits
   */
  async editImage(
    imageBase64: string,          // Base64 Data URL 格式的图片（data:image/png;base64,...）
    prompt: string,               // 编辑描述
    additionalImages?: string[]   // 可选的额外参考图片（用于多图合成场景）
  ): Promise<string> {
    console.log('[Sora] 图片编辑请求:', { prompt, hasAdditionalImages: !!additionalImages });

    // 构建请求 URL
    // API 参考：https://platform.openai.com/docs/api-reference/images/edits
    const url = `${this.baseUrl}/images/edits`;

    // 构建请求体 - 使用 form-data 格式（根据官方 API 示例）
    const formData = new FormData();
    formData.append('model', this.imageModel);
    formData.append('prompt', prompt);

    // 解析主图片 base64（移除 data URL 前缀）
    let mainImageData = imageBase64;
    if (imageBase64.startsWith('data:')) {
      const commaIndex = imageBase64.indexOf(',');
      if (commaIndex > 0) {
        mainImageData = imageBase64.substring(commaIndex + 1);
      }
    }

    // 将 base64 转换为 Blob 并上传
    const mainImageBlob = new Blob([Buffer.from(mainImageData, 'base64')], { type: 'image/png' });
    formData.append('image[]', mainImageBlob, 'image.png');

    // 添加额外的参考图片（如果有）- 使用 image[] 数组格式
    if (additionalImages && additionalImages.length > 0) {
      for (let i = 0; i < additionalImages.length; i++) {
        let imageData = additionalImages[i];
        // 移除 data URL 前缀（如果有）
        if (imageData.startsWith('data:')) {
          const commaIndex = imageData.indexOf(',');
          if (commaIndex > 0) {
            imageData = imageData.substring(commaIndex + 1);
          }
        }
        
        const imageBlob = new Blob([Buffer.from(imageData, 'base64')], { type: 'image/png' });
        formData.append('image[]', imageBlob, `image-${i + 1}.png`);
      }
    }

    console.log('[Sora] 图片编辑请求:', {
      url,
      model: this.imageModel,
      imageCount: 1 + (additionalImages?.length || 0),
      prompt: prompt.substring(0, 100)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
        // 注意：使用 FormData 时不要手动设置 Content-Type，浏览器会自动设置正确的 boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`图片编辑失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;

    if (data.error) {
      throw new Error(`图片编辑失败: ${data.error.message || '未知错误'}`);
    }

    // 根据官方示例，返回的可能是 b64_json（base64 编码的图片）
    // 参考：官方示例使用 jq -r '.data[0].b64_json' | base64 --decode
    const b64Json = data.data?.[0]?.b64_json;
    if (b64Json) {
      // 将 base64 数据保存到临时文件并返回文件路径
      // 这样调用者可以像处理普通文件一样处理
      const tempDir = path.join(os.tmpdir(), 'vibevideo-openai');
      await fs.promises.mkdir(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, `edited-image-${Date.now()}.png`);
      await fs.promises.writeFile(tempFile, Buffer.from(b64Json, 'base64'));
      
      console.log('[Sora] 图片编辑成功（base64），保存到:', tempFile);
      
      // 返回临时文件路径（注意：调用者需要知道这是本地文件路径）
      // 为了兼容性，返回 file:// URL 格式
      return `file://${tempFile}`;
    }

    // 如果返回的是 URL
    const imageUrl = data.data?.[0]?.url;
    if (imageUrl) {
      console.log('[Sora] 图片编辑成功，URL:', imageUrl);
      return imageUrl;
    }

    throw new Error('未返回图片 URL 或 base64 数据');
  }

  /**
   * 图生视频（基于首帧）
   * 使用 Sora 模型
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[Sora] 图生视频请求:', { imagePath, prompt, n });

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
      } else if (typeof options.resolution === 'string' && options.resolution.includes('*')) {
        // 支持 width*height 格式
        const sizeParts = options.resolution.split('*');
        if (sizeParts.length === 2) {
          width = parseInt(sizeParts[0].trim()) || 1280;
          height = parseInt(sizeParts[1].trim()) || 720;
        }
      }
    }

    // Sora API 可能只支持 n=1，如果需要多个视频，需要多次调用
    const numOutputs = n !== undefined ? Math.min(n, 1) : 1;

    // 构建请求 URL
    // API 参考：https://platform.openai.com/docs/api-reference/videos
    const url = `${this.baseUrl}/videos`;

    // 构建请求体 - 使用 form-data 格式（根据官方 API 示例）
    const formData = new FormData();
    formData.append('model', this.videoModel);
    formData.append('prompt', prompt);
    
    // 添加图片（如果存在）- 根据 API 文档，可能需要将图片作为文件上传
    if (imageData) {
      // 将 base64 转换为 Blob 并上传
      const imageBlob = new Blob([Buffer.from(imageData, 'base64')], { type: 'image/png' });
      formData.append('image', imageBlob, 'image.png');
    }

    // 可选参数
    if (options?.duration) {
      formData.append('duration', options.duration.toString());
    }
    if (width && height) {
      formData.append('size', `${width}x${height}`);
    }

    console.log('[Sora] 视频生成请求:', {
      url,
      model: this.videoModel,
      width,
      height,
      duration: options?.duration || 5,
      prompt: prompt.substring(0, 100),
      hasImage: !!imageData
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
        // 注意：使用 FormData 时不要手动设置 Content-Type，浏览器会自动设置正确的 boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    // 如果返回了任务 ID，返回它（需要轮询状态）
    if (data.id) {
      console.log('[Sora] 视频生成任务已提交，taskId:', data.id);
      return data.id;
    }

    // 如果直接返回了视频 URL
    if (data.video_url) {
      console.log('[Sora] 视频生成成功，URL:', data.video_url);
      return data.video_url;
    }

    throw new Error('未返回任务 ID 或视频 URL');
  }

  /**
   * 纯文生视频（无首帧）
   * 使用 Sora 模型
   */
  async textToVideo(prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[Sora] 文生视频请求:', { prompt, resolution: options?.resolution, n });

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
      } else if (typeof options.resolution === 'string' && options.resolution.includes('*')) {
        // 支持 width*height 格式
        const sizeParts = options.resolution.split('*');
        if (sizeParts.length === 2) {
          width = parseInt(sizeParts[0].trim()) || 1280;
          height = parseInt(sizeParts[1].trim()) || 720;
        }
      }
    }

    // Sora API 可能只支持 n=1，如果需要多个视频，需要多次调用
    const numOutputs = n !== undefined ? Math.min(n, 1) : 1;

    // 构建请求 URL
    // API 参考：https://platform.openai.com/docs/api-reference/videos
    const url = `${this.baseUrl}/videos`;

    // 构建请求体 - 使用 form-data 格式（根据官方 API 示例）
    const formData = new FormData();
    formData.append('model', this.videoModel);
    formData.append('prompt', prompt);
    
    // 可选参数
    if (options?.duration) {
      formData.append('duration', options.duration.toString());
    }
    if (width && height) {
      formData.append('size', `${width}x${height}`);
    }

    console.log('[Sora] 视频生成请求:', {
      url,
      model: this.videoModel,
      width,
      height,
      duration: options?.duration || 5,
      prompt: prompt.substring(0, 100)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
        // 注意：使用 FormData 时不要手动设置 Content-Type，浏览器会自动设置正确的 boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoGenerationResponse;

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    // 根据 OpenAI API 文档，响应可能直接包含 video_url 或返回任务 ID
    if (data.video_url) {
      console.log('[Sora] 视频生成成功，URL:', data.video_url);
      return data.video_url;
    }

    // 如果返回了任务 ID，返回它（需要轮询状态）
    if (data.id) {
      console.log('[Sora] 视频生成任务已提交，taskId:', data.id);
      return data.id;
    }

    throw new Error('未返回任务 ID 或视频 URL');
  }

  /**
   * 查询任务状态
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    // 如果 taskId 是 URL，直接返回完成状态
    if (taskId.startsWith('http')) {
      return {
        status: 'completed',
        progress: 100,
        url: taskId
      };
    }

    // 查询视频生成任务状态
    // API 参考：https://platform.openai.com/docs/api-reference/videos
    const url = `${this.baseUrl}/videos/${taskId}`;

    console.log('[Sora] 查询视频状态:', { taskId });

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

    // 根据状态字段判断
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (data.status) {
      status = data.status;
    } else if (data.video_url) {
      status = 'completed';
    }

    return {
      status: status,
      progress: status === 'completed' ? 100 : status === 'processing' ? 50 : undefined,
      url: data.video_url
    };
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[Sora] 下载资源:', { taskId, savePath });

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

    console.log('[Sora] 资源下载完成:', savePath);
  }

  /**
   * 测试连接
   * 通过尝试一个简单的 API 请求来测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[Sora] 测试连接...');
      
      // 尝试列出模型来测试 API 连接
      const url = `${this.baseUrl}/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Sora] 连接测试失败:', response.status, errorText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[Sora] 连接失败:', error);
      return false;
    }
  }
}

