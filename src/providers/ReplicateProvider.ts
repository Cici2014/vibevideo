/**
 * Replicate Provider
 * 基于 Replicate API 实现
 */

import * as fs from 'fs';
import * as path from 'path';
import { VideoAIProvider, VideoOptions, ImageOptions, TaskStatus, ReplicateConfig } from './types';
import { imageToBase64 } from '../utils/imageEncoder';

// Replicate SDK 类型定义（如果未安装包，使用动态导入）
let Replicate: any;

/**
 * 动态加载 Replicate SDK
 */
async function loadReplicate(): Promise<any> {
  if (!Replicate) {
    try {
      // 使用动态导入加载 replicate 包
      const replicateModule = await import('replicate');
      Replicate = replicateModule.default || replicateModule;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('[Replicate] 加载失败:', errorMsg);
      throw new Error(
        `无法加载 Replicate SDK。\n` +
        `请在扩展目录运行: npm install\n` +
        `错误详情: ${errorMsg}`
      );
    }
  }
  return Replicate;
}

/**
 * Replicate 任务状态映射
 */
function mapReplicateStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
  if (status === 'starting' || status === 'processing') {
    return 'processing';
  }
  if (status === 'succeeded') {
    return 'completed';
  }
  if (status === 'failed' || status === 'canceled') {
    return 'failed';
  }
  return 'pending';
}

export class ReplicateProvider implements VideoAIProvider {
  readonly name = 'Replicate';
  private replicate: any;
  private apiKey: string;
  private imageModel: string;
  private videoModel: string;

  constructor(config: ReplicateConfig) {
    this.apiKey = config.apiKey;
    // 默认模型配置
    this.imageModel = config.imageModel || 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
    this.videoModel = config.videoModel || 'anotherjesse/zeroscope-v2-xl:9f1749f3b47d1c0b26555735804e7c15e53a0b7c29889a47e8b8c0b0e55e0c6c';
  }

  /**
   * 初始化 Replicate 客户端
   */
  private async getClient(): Promise<any> {
    if (!this.replicate) {
      const ReplicateClass = await loadReplicate();
      this.replicate = new ReplicateClass({
        auth: this.apiKey
      });
    }
    return this.replicate;
  }

  /**
   * 文生图（生成初始帧）
   */
  async textToImage(prompt: string, options?: ImageOptions): Promise<string> {
    console.log('[Replicate] 文生图请求:', { prompt, size: options?.size });

    try {
      const replicate = await this.getClient();
      
      // 解析尺寸
      const size = options?.size || '1280*720';
      const [width, height] = size.split('*').map(s => parseInt(s.trim()));

      // 调用 Replicate API
      const output = await replicate.run(this.imageModel, {
        input: {
          prompt: prompt,
          width: width || 1280,
          height: height || 720,
          num_outputs: 1,
          refine: 'expert_ensemble_refiner',
          scheduler: 'K_EULER',
          num_inference_steps: 25,
          guidance_scale: 7.5,
          apply_watermark: false
        }
      });

      // Replicate 返回的是数组，取第一个结果
      const imageUrl = Array.isArray(output) ? output[0] : output;
      
      if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        throw new Error('无效的图片 URL 返回');
      }

      // 返回 URL（需要调用者下载）
      return imageUrl;
    } catch (error: any) {
      console.error('[Replicate] 文生图失败:', error);
      throw new Error(`文生图失败: ${error.message || error}`);
    }
  }

  /**
   * 图生视频（基于首帧）
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions): Promise<string> {
    console.log('[Replicate] 图生视频请求:', { imagePath, prompt });

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    try {
      const replicate = await this.getClient();

      // Replicate 支持直接传入文件路径（Node.js 环境）
      // 或者使用 fs.createReadStream
      const imageFile = fs.createReadStream(imagePath);

      // 调用 Replicate API（使用 zeroscope 或其他图生视频模型）
      // 注意：zeroscope-v2-xl 的参数可能不同，需要根据实际模型调整
      const output = await replicate.run(this.videoModel, {
        input: {
          image: imageFile,
          prompt: prompt || '', // 某些模型可能需要 prompt
          num_frames: options?.duration ? Math.min(options.duration * 8, 127) : 40, // 默认 5 秒，8fps
          fps: 8
        }
      });

      // Replicate 返回的是数组或字符串 URL
      const videoUrl = Array.isArray(output) ? output[0] : output;
      
      if (typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
        throw new Error('无效的视频 URL 返回');
      }

      // 返回 URL（需要调用者下载）
      return videoUrl;
    } catch (error: any) {
      console.error('[Replicate] 图生视频失败:', error);
      throw new Error(`图生视频失败: ${error.message || error}`);
    }
  }

  /**
   * 纯文生视频（无首帧）
   */
  async textToVideo(prompt: string, options?: VideoOptions): Promise<string> {
    console.log('[Replicate] 文生视频请求:', { prompt, resolution: options?.resolution });

    try {
      const replicate = await this.getClient();

      // 使用文生视频模型（例如：animatediff）
      const output = await replicate.run(this.videoModel, {
        input: {
          prompt: prompt,
          num_frames: options?.duration ? Math.min(options.duration * 8, 127) : 40,
          fps: 8,
          width: 1024,
          height: 576
        }
      });

      // Replicate 返回的是数组或字符串 URL
      const videoUrl = Array.isArray(output) ? output[0] : output;
      
      if (typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
        throw new Error('无效的视频 URL 返回');
      }

      // 返回 URL（需要调用者下载）
      return videoUrl;
    } catch (error: any) {
      console.error('[Replicate] 文生视频失败:', error);
      throw new Error(`文生视频失败: ${error.message || error}`);
    }
  }

  /**
   * 查询任务状态
   * 注意：Replicate 的同步 API 直接返回结果，此方法主要用于兼容接口
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    // Replicate 的同步 API 直接返回结果，不需要查询状态
    // 如果 taskId 是 URL，直接返回完成状态
    if (taskId.startsWith('http')) {
      return {
        status: 'completed',
        progress: 100,
        url: taskId
      };
    }

    // 如果是预测 ID，可以查询状态（但通常不需要）
    try {
      const replicate = await this.getClient();
      const prediction = await replicate.predictions.get(taskId);
      
      return {
        status: mapReplicateStatus(prediction.status),
        progress: prediction.status === 'succeeded' ? 100 : undefined,
        url: prediction.output ? (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output) : undefined,
        error: prediction.error
      };
    } catch (error: any) {
      return {
        status: 'failed',
        error: error.message || '查询状态失败'
      };
    }
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[Replicate] 下载资源:', { taskId, savePath });

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

    console.log('[Replicate] 资源下载完成:', savePath);
  }
}

