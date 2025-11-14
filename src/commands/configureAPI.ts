/**
 * 配置视频 AI 命令
 */

import * as vscode from 'vscode';
import { ConfigManager } from '../core/ConfigManager';
import { ProviderManager } from '../providers/ProviderManager';

/**
 * 配置视频 AI - 打开设置页面
 */
export async function configureVideoAI(
  configManager: ConfigManager,
  providerManager: ProviderManager
): Promise<void> {
  // 显示提示信息
  const choice = await vscode.window.showInformationMessage(
    '请在设置面板中配置 DashScope API Key',
    '打开设置',
    '查看获取指南',
    '取消'
  );

  if (choice === '打开设置') {
    // 打开设置页面，自动过滤到 vibevideo
    configManager.openSettings();
  } else if (choice === '查看获取指南') {
    // 打开 DashScope 控制台
    vscode.env.openExternal(vscode.Uri.parse('https://bailian.console.aliyun.com/'));
    
    // 提示用户
    const openSettings = await vscode.window.showInformationMessage(
      '请在 DashScope 控制台获取 API Key，然后在设置中填入',
      '打开设置'
    );
    
    if (openSettings === '打开设置') {
      configManager.openSettings();
    }
  }
}

/**
 * 显示当前配置
 */
export async function showCurrentConfig(configManager: ConfigManager): Promise<void> {
  const config = await configManager.getProviderConfig();

  let message = `当前 Provider: ${config.provider}\n`;
  
  if (config.configured) {
    message += '状态: ✓ 已配置\n';
    
    if (config.provider === 'tongyi-wanxiang') {
      const tongyiConfig = await configManager.getTongyiConfig();
      if (tongyiConfig) {
        message += `API Key: ${tongyiConfig.apiKey.substring(0, 8)}...\n`;
      }
    }
    
    message += `\n分辨率: ${configManager.getResolution()}`;
    message += `\n默认时长: ${configManager.getDefaultDuration()} 秒`;
  } else {
    message += '状态: ✗ 未配置\n\n';
    message += '请在设置中配置 DashScope API Key\n';
    message += '(搜索 "vibevideo" 即可找到配置项)';
  }

  const choice = await vscode.window.showInformationMessage(
    message,
    '打开设置',
    '关闭'
  );

  if (choice === '打开设置') {
    configManager.openSettings();
  }
}

