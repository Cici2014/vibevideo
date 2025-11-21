/**
 * 硅基流动 Provider
 * 基于 SiliconFlow API 实现
 * 参考：
 * - 图像生成：https://docs.siliconflow.cn/cn/api-reference/images/images-generations
 * - 视频生成：https://docs.siliconflow.cn/cn/api-reference/videos/videos_submit
 * - 视频状态：https://docs.siliconflow.cn/cn/api-reference/videos/get_videos_status
 */

import * as fs from 'fs';
import * as path from 'path';
import { VideoAIProvider, VideoOptions, ImageOptions, TaskStatus, SiliconFlowConfig } from './types';
import { imageToBase64 } from '../utils/imageEncoder';

/**
 * 硅基流动图像生成响应
 */
interface ImageGenerationResponse {
  images: Array<{
    url: string;
  }>;
  timings?: {
    inference: number;
  };
  seed?: number;
}

/**
 * 硅基流动视频提交响应
 */
interface VideoSubmitResponse {
  requestId: string;
}

/**
 * 硅基流动视频状态响应
 */
interface VideoStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
}

/**
 * 硅基流动 Provider
 * 
 * 支持情况：
 * ✅ 文生图：支持（使用 /images/generations API）
 * ✅ 图生视频：支持（使用 /video/submit API，需要 image 参数）
 * ✅ 文生视频：支持（使用 /video/submit API）
 * ✅ 视频状态查询：支持（使用 /video/status API）
 * 
 * 注意事项：
 * - 图像生成返回的 URL 有效期为 1 小时，请及时下载
 * - 视频生成返回 requestId，需要通过轮询状态接口获取视频链接
 * - 视频生成结果有效期为 10 分钟，请及时获取
 * - 视频链接有效期为 1 小时，请及时下载
 */
export class SiliconFlowProvider implements VideoAIProvider {
  readonly name = '硅基流动';
  private apiKey: string;
  private baseUrl: string;
  private imageModel: string;
  private videoModel: string;

  constructor(config: SiliconFlowConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.siliconflow.cn/v1';
    // 默认图像生成模型
    this.imageModel = config.imageModel || 'Qwen/Qwen-Image';
    // 默认视频生成模型（图生视频）
    this.videoModel = config.videoModel || 'Wan-AI/Wan2.1-I2V-14B-720P';
  }

  /**
   * 文生图（生成初始帧）
   * API: POST /images/generations
   * 参考：https://docs.siliconflow.cn/cn/api-reference/images/images-generations
   */
  async textToImage(prompt: string, options?: ImageOptions, n?: number): Promise<string> {
    console.log('[硅基流动] 文生图请求:', { prompt, size: options?.size, n });

    const url = `${this.baseUrl}/images/generations`;

    // 解析尺寸（格式：宽度*高度，例如：1280*720）
    let imageSize = '1328x1328'; // 默认尺寸
    if (options?.size) {
      const sizeParts = options.size.split('*');
      if (sizeParts.length === 2) {
        const width = parseInt(sizeParts[0].trim());
        const height = parseInt(sizeParts[1].trim());
        if (width && height) {
          imageSize = `${width}x${height}`;
        }
      }
    }

    // 支持的模型：Qwen/Qwen-Image, Kwai-Kolors/Kolors 等
    // batch_size 仅适用于 Kwai-Kolors/Kolors 模型
    const batchSize = n !== undefined ? Math.min(Math.max(n, 1), 4) : 1;
    const useKolors = this.imageModel.includes('Kolors');

    const body: any = {
      model: this.imageModel,
      prompt: prompt,
      image_size: imageSize
    };

    // 仅 Kolors 模型支持 batch_size
    if (useKolors && batchSize > 1) {
      body.batch_size = batchSize;
    }

    console.log('[硅基流动] 图像生成请求:', {
      url,
      model: this.imageModel,
      image_size: imageSize,
      batch_size: useKolors ? batchSize : undefined
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

    const data = await response.json() as ImageGenerationResponse;

    if (!data.images || data.images.length === 0) {
      throw new Error('未返回图像 URL');
    }

    // 返回第一个图像的 URL
    // 注意：URL 有效期为 1 小时，需要及时下载
    const imageUrl = data.images[0].url;
    console.log('[硅基流动] 图像生成成功，URL:', imageUrl);

    // 如果 n > 1 且使用 Kolors 模型，返回多个 URL（用逗号分隔）
    // 但根据接口设计，这里只返回第一个，调用者需要处理多个图片的情况
    return imageUrl;
  }

  /**
   * 图生视频（基于首帧）
   * API: POST /video/submit
   * 参考：https://docs.siliconflow.cn/cn/api-reference/videos/videos_submit
   * 
   * 支持的模型：
   * - Wan-AI/Wan2.1-I2V-14B-720P（图生视频）
   * - Wan-AI/Wan2.1-I2V-14B-720P-Turbo（图生视频，快速版）
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[硅基流动] 图生视频请求:', { imagePath, prompt, n });

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    const url = `${this.baseUrl}/video/submit`;

    // 将图片转换为 base64
    const imageBase64 = await imageToBase64(imagePath);

    // 解析分辨率（格式：480P、720P、1080P）
    let imageSize = '1280x720'; // 默认 720P
    if (options?.resolution) {
      if (options.resolution === '480P') {
        imageSize = '720x1280'; // 竖屏或横屏，根据需求调整
      } else if (options.resolution === '720P') {
        imageSize = '1280x720';
      } else if (options.resolution === '1080P') {
        imageSize = '1280x720'; // 注意：某些模型可能只支持 720P
      }
    }

    // 使用图生视频模型
    const model = this.videoModel.includes('I2V') 
      ? this.videoModel 
      : 'Wan-AI/Wan2.1-I2V-14B-720P'; // 默认使用图生视频模型

    const body = {
      model: model,
      prompt: prompt || '',
      image_size: imageSize,
      image: imageBase64
    };

    console.log('[硅基流动] 视频生成请求:', {
      url,
      model: model,
      image_size: imageSize,
      prompt: prompt.substring(0, 100)
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
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoSubmitResponse;

    if (!data.requestId) {
      throw new Error('未返回 requestId');
    }

    console.log('[硅基流动] 视频生成任务已提交，requestId:', data.requestId);
    
    // 返回 requestId（需要轮询状态接口获取视频链接）
    return data.requestId;
  }

  /**
   * 纯文生视频（无首帧）
   * API: POST /video/submit
   * 参考：https://docs.siliconflow.cn/cn/api-reference/videos/videos_submit
   * 
   * 支持的模型：
   * - Wan-AI/Wan2.2-T2V-A14B（文生视频）
   * - Wan-AI/Wan2.1-T2V-14B（文生视频）
   * - Wan-AI/Wan2.1-T2V-14B-Turbo（文生视频，快速版）
   */
  async textToVideo(prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[硅基流动] 文生视频请求:', { prompt, resolution: options?.resolution, n });

    const url = `${this.baseUrl}/video/submit`;

    // 解析分辨率
    let imageSize = '1280x720'; // 默认 720P
    if (options?.resolution) {
      if (options.resolution === '480P') {
        imageSize = '720x1280';
      } else if (options.resolution === '720P') {
        imageSize = '1280x720';
      } else if (options.resolution === '1080P') {
        imageSize = '1280x720'; // 注意：某些模型可能只支持 720P
      }
    }

    // 使用文生视频模型（T2V = Text to Video）
    const model = this.videoModel.includes('T2V') 
      ? this.videoModel 
      : 'Wan-AI/Wan2.2-T2V-A14B'; // 默认使用文生视频模型

    const body = {
      model: model,
      prompt: prompt,
      image_size: imageSize
    };

    console.log('[硅基流动] 视频生成请求:', {
      url,
      model: model,
      image_size: imageSize,
      prompt: prompt.substring(0, 100)
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
      throw new Error(`视频生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoSubmitResponse;

    if (!data.requestId) {
      throw new Error('未返回 requestId');
    }

    console.log('[硅基流动] 视频生成任务已提交，requestId:', data.requestId);
    
    // 返回 requestId（需要轮询状态接口获取视频链接）
    return data.requestId;
  }

  /**
   * 查询任务状态
   * API: POST /video/status
   * 参考：https://docs.siliconflow.cn/cn/api-reference/videos/get_videos_status
   * 
   * 注意：图像生成是同步的，直接返回 URL，不需要查询状态
   * 视频生成是异步的，需要轮询此接口获取视频链接
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    // 如果 taskId 是 URL（图像生成直接返回 URL），直接返回完成状态
    if (taskId.startsWith('http')) {
      return {
        status: 'completed',
        progress: 100,
        url: taskId
      };
    }

    // 视频生成返回的是 requestId，需要查询状态
    const url = `${this.baseUrl}/video/status`;

    const body = {
      requestId: taskId
    };

    console.log('[硅基流动] 查询视频状态:', { requestId: taskId });

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
      throw new Error(`查询状态失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoStatusResponse;

    // 映射状态
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (data.status === 'completed') {
      status = 'completed';
    } else if (data.status === 'processing') {
      status = 'processing';
    } else if (data.status === 'failed') {
      status = 'failed';
    } else {
      status = 'pending';
    }

    return {
      status: status,
      progress: status === 'completed' ? 100 : status === 'processing' ? 50 : undefined,
      url: data.video_url,
      error: data.error
    };
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[硅基流动] 下载资源:', { taskId, savePath });

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

    console.log('[硅基流动] 资源下载完成:', savePath);
  }

  /**
   * 测试连接
   * 通过尝试一个简单的图像生成请求来测试 API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[硅基流动] 测试连接...');
      
      // 尝试一个简单的图像生成请求来测试
      // 使用最小的参数，避免消耗过多额度
      const url = `${this.baseUrl}/images/generations`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.imageModel,
          prompt: 'test',
          image_size: '1024x1024'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[硅基流动] 连接测试失败:', response.status, errorText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[硅基流动] 连接失败:', error);
      return false;
    }
  }
}

