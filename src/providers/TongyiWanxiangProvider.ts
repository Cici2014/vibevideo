/**
 * 通义万相 Provider
 * 基于 DashScope HTTP API 实现
 */

import * as fs from 'fs';
import * as path from 'path';
import { VideoAIProvider, VideoOptions, ImageOptions, TaskStatus, TongyiConfig } from './types';
import { BailianAPIClient } from './BailianAPIClient';
import { imageToBase64 } from '../utils/imageEncoder';

export class TongyiWanxiangProvider implements VideoAIProvider {
  readonly name = '通义万相';
  public readonly client: BailianAPIClient;

  constructor(config: TongyiConfig) {
    this.client = new BailianAPIClient(config.apiKey, config.baseUrl);
  }

  /**
   * 文生图（生成初始帧）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2976416
   */
  async textToImage(prompt: string, options?: ImageOptions, n?: number): Promise<string> {
    console.log('[通义万相] 文生图请求:', { prompt, size: options?.size, n });

    const size = options?.size || '1280*720';
    const numOutputs = n !== undefined ? n : 1;
    return await this.client.textToImage(prompt, size, numOutputs);
  }

  /**
   * 图生视频（基于首帧）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2862677
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[通义万相] 图生视频请求:', { imagePath, prompt, duration: options?.duration, n });

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    // 将本地图片转换为 base64 data URL
    const imageBase64 = await imageToBase64(imagePath);
    console.log('[通义万相] 图片已转换为 base64，大小:', imageBase64.length, '字符');

    // 调用 API，使用 base64 格式的图片
    const resolution = options?.resolution || '1080P';
    const numOutputs = n !== undefined ? n : 1;
    const duration = options?.duration;
    return await this.client.imageToVideo(imageBase64, prompt, resolution, numOutputs, duration);
  }

  /**
   * 纯文生视频（无首帧）
   */
  async textToVideo(prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[通义万相] 文生视频请求:', { prompt, resolution: options?.resolution, duration: options?.duration, n });

    const size = options?.resolution || '832*480';
    const numOutputs = n !== undefined ? n : 1;
    const duration = options?.duration;
    return await this.client.textToVideo(prompt, size, numOutputs, duration);
  }

  /**
   * 查询任务状态
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const result = await this.client.getTaskStatus(taskId);
    
    return {
      status: result.status,
      progress: result.progress,
      url: result.url,
      urls: result.urls  // 传递多个 URL
    };
  }

  /**
   * 下载资源（图片或视频）
   * 如果返回多个资源，第一个使用原文件名，其余添加 .o-1, .o-2 后缀
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[通义万相] 下载资源:', { taskId, savePath });

    // 获取任务状态
    const status = await this.checkStatus(taskId);

    if (status.status !== 'completed') {
      throw new Error('资源尚未生成完成');
    }

    // 优先使用 urls 数组（多个资源），如果没有则使用单个 url
    const urls = status.urls && status.urls.length > 0 ? status.urls : (status.url ? [status.url] : []);

    if (urls.length === 0) {
      throw new Error('未找到资源 URL');
    }

    // 下载第一个文件（使用原文件名）
    await this.client.downloadResource(urls[0], savePath);
    console.log('[通义万相] 资源下载完成:', savePath);

    // 如果有多个资源（图片或视频），下载其余资源并添加后缀
    if (urls.length > 1) {
      const dir = path.dirname(savePath);
      const ext = path.extname(savePath);
      const baseName = path.basename(savePath, ext);

      for (let i = 1; i < urls.length; i++) {
        const alternativePath = path.join(dir, `${baseName}.o-${i}${ext}`);
        await this.client.downloadResource(urls[i], alternativePath);
        console.log('[通义万相] 备选资源下载完成:', alternativePath);
      }
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[通义万相] 测试连接...');
      
      // 尝试一个简单的文生图请求来测试
      await this.client.textToImage('测试', '512*512');
      
      return true;
    } catch (error) {
      console.error('[通义万相] 连接失败:', error);
      return false;
    }
  }
}

