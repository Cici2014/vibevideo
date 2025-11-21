/**
 * 配置管理器 - 从 VS Code 设置中读取配置
 */

import * as vscode from 'vscode';
import { ProviderConfig, TongyiConfig, ReplicateConfig, SiliconFlowConfig, GoogleConfig } from '../providers/types';

export class ConfigManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 获取配置对象
   */
  private getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('vibevideo');
  }

  /**
   * 获取 Provider 配置
   */
  async getProviderConfig(): Promise<ProviderConfig> {
    const config = this.getConfig();
    const provider = config.get<'tongyi-wanxiang' | 'replicate' | 'siliconflow' | 'google'>('provider', 'tongyi-wanxiang');
    const configured = await this.isProviderConfigured(provider);

    return {
      provider,
      configured
    };
  }

  /**
   * 检查 Provider 是否已配置
   */
  async isProviderConfigured(provider: string): Promise<boolean> {
    if (provider === 'tongyi-wanxiang') {
      const config = await this.getTongyiConfig();
      return !!(config?.apiKey);
    }
    if (provider === 'replicate') {
      const config = await this.getReplicateConfig();
      return !!(config?.apiKey);
    }
    if (provider === 'siliconflow') {
      const config = await this.getSiliconFlowConfig();
      return !!(config?.apiKey);
    }
    if (provider === 'google') {
      const config = await this.getGoogleConfig();
      return !!(config?.apiKey);
    }
    return false;
  }

  /**
   * 获取通义万相配置
   */
  async getTongyiConfig(): Promise<TongyiConfig | undefined> {
    const config = this.getConfig();
    
    const apiKey = config.get<string>('dashscope.apiKey', '');
    const baseUrl = config.get<string>('dashscope.baseUrl', '');

    if (!apiKey) {
      return undefined;
    }

    return {
      apiKey,
      baseUrl: baseUrl || undefined
    };
  }

  /**
   * 获取 Replicate 配置
   */
  async getReplicateConfig(): Promise<ReplicateConfig | undefined> {
    const config = this.getConfig();
    
    const apiKey = config.get<string>('replicate.apiKey', '');
    const imageModel = config.get<string>('replicate.imageModel', '');
    const videoModel = config.get<string>('replicate.videoModel', '');

    if (!apiKey) {
      return undefined;
    }

    return {
      apiKey,
      imageModel: imageModel || undefined,
      videoModel: videoModel || undefined
    };
  }

  /**
   * 获取硅基流动配置
   */
  async getSiliconFlowConfig(): Promise<SiliconFlowConfig | undefined> {
    const config = this.getConfig();
    
    const apiKey = config.get<string>('siliconflow.apiKey', '');
    const baseUrl = config.get<string>('siliconflow.baseUrl', '');
    const imageModel = config.get<string>('siliconflow.imageModel', '');
    const videoModel = config.get<string>('siliconflow.videoModel', '');

    if (!apiKey) {
      return undefined;
    }

    return {
      apiKey,
      baseUrl: baseUrl || undefined,
      imageModel: imageModel || undefined,
      videoModel: videoModel || undefined
    };
  }

  /**
   * 获取 Google 配置
   */
  async getGoogleConfig(): Promise<GoogleConfig | undefined> {
    const config = this.getConfig();
    
    const apiKey = config.get<string>('google.apiKey', '');
    const baseUrl = config.get<string>('google.baseUrl', '');
    const imageModel = config.get<string>('google.imageModel', '');
    const videoModel = config.get<string>('google.videoModel', '');
    const projectId = config.get<string>('google.projectId', '');
    const location = config.get<string>('google.location', '');

    if (!apiKey) {
      return undefined;
    }

    return {
      apiKey,
      baseUrl: baseUrl || undefined,
      imageModel: imageModel || undefined,
      videoModel: videoModel || undefined,
      projectId: projectId || undefined,
      location: location || undefined
    };
  }

  /**
   * 获取视频分辨率（返回 480P、720P、1080P 格式）
   */
  getResolution(): string {
    return this.getConfig().get<string>('video.resolution', '720P');
  }

  /**
   * 获取默认时长
   */
  getDefaultDuration(): number {
    return this.getConfig().get<number>('video.defaultDuration', 5);
  }

  /**
   * 获取主体图片尺寸
   */
  getSubjectImageSize(): string {
    return this.getConfig().get<string>('image.subjectSize', '1280*720');
  }

  /**
   * 获取场景图片尺寸
   */
  getSceneImageSize(): string {
    return this.getConfig().get<string>('image.sceneSize', '1280*720');
  }

  /**
   * 获取首帧图片尺寸
   */
  getFirstFrameImageSize(): string {
    return this.getConfig().get<string>('image.firstFrameSize', '1280*720');
  }

  /**
   * 获取图片生成数量（n 参数）
   */
  getImageNumOutputs(): number {
    return this.getConfig().get<number>('image.numOutputs', 1);
  }

  /**
   * 获取视频生成数量（n 参数）
   */
  getVideoNumOutputs(): number {
    return this.getConfig().get<number>('video.numOutputs', 1);
  }

  /**
   * 打开设置页面
   */
  openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'vibevideo');
  }
}

