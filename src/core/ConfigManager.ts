/**
 * 配置管理器 - 从 VS Code 设置中读取配置
 */

import * as vscode from 'vscode';
import { ProviderConfig, TongyiConfig, ReplicateConfig, GoogleConfig, SoraConfig } from '../providers/types';

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
    const provider = config.get<'tongyi-wanxiang' | 'replicate' | 'google' | 'sora'>('provider', 'tongyi-wanxiang');
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
    if (provider === 'google') {
      const config = await this.getGoogleConfig();
      return !!(config?.apiKey);
    }
    if (provider === 'sora') {
      const config = this.getConfig();
      const apiKey = config.get<string>('sora.apiKey', '');
      const baseUrl = config.get<string>('sora.baseUrl', '');
      // 对于本地部署（设置了 baseUrl），允许 apiKey 为空
      // 对于在线服务（未设置 baseUrl），必须有 apiKey
      if (baseUrl && baseUrl.trim()) {
        return true; // 本地部署只要有 baseUrl 即可
      }
      return !!(apiKey && apiKey.trim()); // 在线服务必须有 apiKey
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
   * 获取 Sora 配置
   */
  async getSoraConfig(): Promise<SoraConfig | undefined> {
    const config = this.getConfig();
    
    const apiKey = config.get<string>('sora.apiKey', '');
    const baseUrl = config.get<string>('sora.baseUrl', '');
    const videoModel = config.get<string>('sora.videoModel', '');
    const imageModel = config.get<string>('sora.imageModel', '');

    // 对于本地部署（设置了 baseUrl），允许 apiKey 为空，使用占位符
    // 对于在线服务（未设置 baseUrl），必须有 apiKey
    if (baseUrl && baseUrl.trim()) {
      // 本地部署：即使 apiKey 为空也返回配置，使用占位符
      return {
        apiKey: apiKey || 'local-deployment-placeholder', // 本地部署可以使用占位符
        baseUrl: baseUrl,
        videoModel: videoModel || undefined,
        imageModel: imageModel || undefined
      };
    } else {
      // 在线服务：必须有 apiKey
      if (!apiKey || !apiKey.trim()) {
        return undefined;
      }
      return {
        apiKey,
        baseUrl: undefined,
        videoModel: videoModel || undefined,
        imageModel: imageModel || undefined
      };
    }
  }

  /**
   * 获取视频分辨率（返回 480P、720P、1080P 格式）
   */
  getResolution(): string {
    return this.getConfig().get<string>('video.resolution', '720P');
  }

  /**
   * 获取视频长宽比（返回 16:9、4:3、1:1、3:4、9:16 格式）
   */
  getAspectRatio(): string {
    return this.getConfig().get<string>('video.aspectRatio', '16:9');
  }

  /**
   * 获取默认时长
   */
  getDefaultDuration(): number {
    return this.getConfig().get<number>('video.defaultDuration', 5);
  }

  /**
   * 获取统一图片尺寸（优先级最高）
   */
  getImageSize(): string {
    return this.getConfig().get<string>('image.size', '1280*720');
  }

  /**
   * 获取主体图片尺寸
   * 优先使用统一配置，如果统一配置未设置或为空则使用独立配置
   */
  getSubjectImageSize(): string {
    const config = this.getConfig();
    // 优先使用统一配置（有默认值 1280*720）
    const unifiedSize = config.get<string>('image.size', '1280*720');
    if (unifiedSize && unifiedSize.trim()) {
      return unifiedSize;
    }
    // 如果统一配置为空，检查是否设置了独立配置
    const specificSize = config.get<string>('image.subjectSize', '');
    return (specificSize && specificSize.trim()) ? specificSize : '1280*720';
  }

  /**
   * 获取场景图片尺寸
   * 优先使用统一配置，如果统一配置未设置或为空则使用独立配置
   */
  getSceneImageSize(): string {
    const config = this.getConfig();
    // 优先使用统一配置（有默认值 1280*720）
    const unifiedSize = config.get<string>('image.size', '1280*720');
    if (unifiedSize && unifiedSize.trim()) {
      return unifiedSize;
    }
    // 如果统一配置为空，检查是否设置了独立配置
    const specificSize = config.get<string>('image.sceneSize', '');
    return (specificSize && specificSize.trim()) ? specificSize : '1280*720';
  }

  /**
   * 获取首帧图片尺寸
   * 优先使用统一配置，如果统一配置未设置或为空则使用独立配置
   */
  getFirstFrameImageSize(): string {
    const config = this.getConfig();
    // 优先使用统一配置（有默认值 1280*720）
    const unifiedSize = config.get<string>('image.size', '1280*720');
    if (unifiedSize && unifiedSize.trim()) {
      return unifiedSize;
    }
    // 如果统一配置为空，检查是否设置了独立配置
    const specificSize = config.get<string>('image.firstFrameSize', '');
    return (specificSize && specificSize.trim()) ? specificSize : '1280*720';
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

