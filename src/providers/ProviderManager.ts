/**
 * Provider 管理器
 */

import * as vscode from 'vscode';
import { VideoAIProvider } from './types';
import { TongyiWanxiangProvider } from './TongyiWanxiangProvider';
import { ReplicateProvider } from './ReplicateProvider';
import { SiliconFlowProvider } from './SiliconFlowProvider';
import { GoogleProvider } from './GoogleProvider';
import { ConfigManager } from '../core/ConfigManager';

export class ProviderManager {
  private configManager: ConfigManager;
  private currentProvider: VideoAIProvider | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.configManager = new ConfigManager(context);
  }

  /**
   * 获取当前的 Provider
   */
  async getProvider(): Promise<VideoAIProvider> {
    if (this.currentProvider) {
      return this.currentProvider;
    }

    const config = await this.configManager.getProviderConfig();

    if (!config.configured) {
      throw new Error('请先配置视频 AI！运行命令: Vibe Video: Configure Video AI');
    }

    if (config.provider === 'tongyi-wanxiang') {
      const tongyiConfig = await this.configManager.getTongyiConfig();
      if (!tongyiConfig) {
        throw new Error('通义万相配置不完整');
      }
      this.currentProvider = new TongyiWanxiangProvider(tongyiConfig);
    } else if (config.provider === 'replicate') {
      const replicateConfig = await this.configManager.getReplicateConfig();
      if (!replicateConfig) {
        throw new Error('Replicate 配置不完整');
      }
      this.currentProvider = new ReplicateProvider(replicateConfig);
    } else if (config.provider === 'siliconflow') {
      const siliconFlowConfig = await this.configManager.getSiliconFlowConfig();
      if (!siliconFlowConfig) {
        throw new Error('硅基流动配置不完整');
      }
      this.currentProvider = new SiliconFlowProvider(siliconFlowConfig);
    } else if (config.provider === 'google') {
      const googleConfig = await this.configManager.getGoogleConfig();
      if (!googleConfig) {
        throw new Error('Google 配置不完整');
      }
      this.currentProvider = new GoogleProvider(googleConfig);
    } else {
      throw new Error(`不支持的 Provider: ${config.provider}`);
    }

    return this.currentProvider;
  }

  /**
   * 重置 Provider（配置更新后调用）
   */
  resetProvider(): void {
    this.currentProvider = undefined;
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }
}

