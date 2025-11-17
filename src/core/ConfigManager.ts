/**
 * 配置管理器 - 从 VS Code 设置中读取配置
 */

import * as vscode from 'vscode';
import { ProviderConfig, TongyiConfig } from '../providers/types';

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
    const provider = config.get<'tongyi-wanxiang' | 'replicate'>('provider', 'tongyi-wanxiang');
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
   * 打开设置页面
   */
  openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'vibevideo');
  }
}

