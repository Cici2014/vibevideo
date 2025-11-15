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
  private client: BailianAPIClient;

  constructor(config: TongyiConfig) {
    this.client = new BailianAPIClient(config.apiKey);
  }

  /**
   * 文生图（生成初始帧）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2976416
   */
  async textToImage(prompt: string, options?: ImageOptions): Promise<string> {
    console.log('[通义万相] 文生图请求:', { prompt, size: options?.size });

    const size = options?.size || '1280*720';
    return await this.client.textToImage(prompt, size);
  }

  /**
   * 图生视频（基于首帧）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2862677
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions): Promise<string> {
    console.log('[通义万相] 图生视频请求:', { imagePath, prompt });

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    // 将本地图片转换为 base64 data URL
    const imageBase64 = await imageToBase64(imagePath);
    console.log('[通义万相] 图片已转换为 base64，大小:', imageBase64.length, '字符');

    // 调用 API，使用 base64 格式的图片
    // 注意：API 不支持自定义 duration 参数，使用默认时长
    const resolution = options?.resolution || '1080P';
    return await this.client.imageToVideo(imageBase64, prompt, resolution);
  }

  /**
   * 纯文生视频（无首帧）
   * 注意：API 不支持自定义 duration 参数，使用默认时长
   */
  async textToVideo(prompt: string, options?: VideoOptions): Promise<string> {
    console.log('[通义万相] 文生视频请求:', { prompt, resolution: options?.resolution });

    const size = options?.resolution || '832*480';
    return await this.client.textToVideo(prompt, size);
  }

  /**
   * 查询任务状态
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const result = await this.client.getTaskStatus(taskId);
    
    return {
      status: result.status,
      progress: result.progress,
      url: result.url
    };
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[通义万相] 下载资源:', { taskId, savePath });

    // 获取任务状态
    const status = await this.checkStatus(taskId);

    if (status.status !== 'completed') {
      throw new Error('资源尚未生成完成');
    }

    if (!status.url) {
      throw new Error('未找到资源 URL');
    }

    // 下载文件
    await this.client.downloadResource(status.url, savePath);

    console.log('[通义万相] 资源下载完成:', savePath);
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

