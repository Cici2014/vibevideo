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
  const config = await configManager.getProviderConfig();
  
  // 根据当前 provider 显示不同的提示信息
  let providerDisplayName = '';
  let message = '';
  let guideUrl = '';
  let guideText = '';
  
  if (config.provider === 'tongyi-wanxiang') {
    providerDisplayName = '通义万相 (Tongyi Wanxiang)';
    const tongyiConfig = await configManager.getTongyiConfig();
    if (tongyiConfig?.baseUrl) {
      message = `当前使用: ${providerDisplayName} - 本地部署\n\n请在设置面板中配置 API Key`;
    } else {
      message = `当前使用: ${providerDisplayName} - 在线服务\n\n请在设置面板中配置 DashScope API Key`;
    }
    guideUrl = 'https://bailian.console.aliyun.com/';
    guideText = '请在 DashScope 控制台获取 API Key，然后在设置中填入';
  } else if (config.provider === 'replicate') {
    providerDisplayName = 'Replicate';
    message = `当前使用: ${providerDisplayName}\n\n请在设置面板中配置 Replicate API Token`;
    guideUrl = 'https://replicate.com/account/api-tokens';
    guideText = '请在 Replicate 账户页面获取 API Token，然后在设置中填入';
  } else if (config.provider === 'siliconflow') {
    providerDisplayName = '硅基流动 (SiliconFlow)';
    message = `当前使用: ${providerDisplayName}\n\n请在设置面板中配置硅基流动 API Key`;
    guideUrl = 'https://cloud.siliconflow.cn/account/ak';
    guideText = '请在硅基流动控制台获取 API Key，然后在设置中填入';
  } else if (config.provider === 'google') {
    providerDisplayName = 'Google Gemini';
    message = `当前使用: ${providerDisplayName}\n\n请在设置面板中配置 Google API Key`;
    guideUrl = 'https://makersuite.google.com/app/apikey';
    guideText = '请在 Google AI Studio 获取 API Key，然后在设置中填入';
  } else {
    providerDisplayName = config.provider;
    message = `当前使用: ${providerDisplayName}\n\n请在设置面板中配置 API Key`;
  }
  
  const choice = await vscode.window.showInformationMessage(
    message,
    '打开设置',
    '查看获取指南',
    '取消'
  );

  if (choice === '打开设置') {
    // 打开设置页面，自动过滤到 vibevideo
    configManager.openSettings();
  } else if (choice === '查看获取指南' && guideUrl) {
    // 打开相应的控制台
    vscode.env.openExternal(vscode.Uri.parse(guideUrl));
    
    // 提示用户
    const openSettings = await vscode.window.showInformationMessage(
      guideText,
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

  // 构建更友好的显示信息
  let providerName = '';
  let serviceType = '';
  let details: string[] = [];
  
  if (config.provider === 'tongyi-wanxiang') {
    providerName = '通义万相 (Tongyi Wanxiang)';
    const tongyiConfig = await configManager.getTongyiConfig();
    if (tongyiConfig) {
      // 判断是在线服务还是本地部署
      if (tongyiConfig.baseUrl) {
        serviceType = '🔧 本地部署';
        details.push(`部署地址: ${tongyiConfig.baseUrl}`);
      } else {
        serviceType = '☁️ 在线服务 (DashScope)';
      }
      details.push(`API Key: ${tongyiConfig.apiKey.substring(0, 8)}...`);
    }
  } else if (config.provider === 'replicate') {
    providerName = 'Replicate';
    serviceType = '☁️ 在线服务';
    const replicateConfig = await configManager.getReplicateConfig();
    if (replicateConfig) {
      details.push(`API Token: ${replicateConfig.apiKey.substring(0, 8)}...`);
      
      // 显示使用的模型
      const imageModel = replicateConfig.imageModel || 'stability-ai/sdxl (默认)';
      const videoModel = replicateConfig.videoModel || 'anotherjesse/zeroscope-v2-xl (默认)';
      
      // 简化模型名称显示（只显示主要部分）
      const imageModelShort = imageModel.split(':')[0].split('/').pop() || imageModel;
      const videoModelShort = videoModel.split(':')[0].split('/').pop() || videoModel;
      
      details.push(`文生图模型: ${imageModelShort}`);
      details.push(`视频模型: ${videoModelShort}`);
    }
  } else if (config.provider === 'siliconflow') {
    providerName = '硅基流动 (SiliconFlow)';
    serviceType = '☁️ 在线服务';
    const siliconFlowConfig = await configManager.getSiliconFlowConfig();
    if (siliconFlowConfig) {
      details.push(`API Key: ${siliconFlowConfig.apiKey.substring(0, 8)}...`);
      
      if (siliconFlowConfig.baseUrl) {
        details.push(`API 地址: ${siliconFlowConfig.baseUrl}`);
      }
      
      // 显示使用的模型
      const imageModel = siliconFlowConfig.imageModel || 'Qwen/Qwen-Image (默认)';
      const videoModel = siliconFlowConfig.videoModel || 'Wan-AI/Wan2.1-I2V-14B-720P (默认)';
      
      details.push(`图像模型: ${imageModel}`);
      details.push(`视频模型: ${videoModel}`);
      details.push(`支持功能: 文生图、图生视频、文生视频`);
      details.push(`注意事项: 图像URL有效期1小时，视频需轮询状态获取链接`);
    }
  } else if (config.provider === 'google') {
    providerName = 'Google Gemini';
    serviceType = '☁️ 在线服务';
    const googleConfig = await configManager.getGoogleConfig();
    if (googleConfig) {
      details.push(`API Key: ${googleConfig.apiKey.substring(0, 8)}...`);
      
      if (googleConfig.baseUrl) {
        details.push(`API 地址: ${googleConfig.baseUrl}`);
      }
      
      if (googleConfig.projectId) {
        details.push(`Vertex AI 项目: ${googleConfig.projectId}`);
        details.push(`位置: ${googleConfig.location || 'us-central1'}`);
      }
      
      // 显示使用的模型
      const imageModel = googleConfig.imageModel || 'gemini-3-pro-image-preview (默认)';
      const videoModel = googleConfig.videoModel || 'veo-3 (默认)';
      
      details.push(`图像模型: ${imageModel}`);
      details.push(`视频模型: ${videoModel}`);
      details.push(`支持功能: 文生图、图生视频、文生视频`);
    }
  } else {
    providerName = config.provider;
    serviceType = '未知';
  }

  // 构建完整的消息
  let message = `当前 AI Provider 配置\n\n`;
  message += `服务商: ${providerName}\n`;
  message += `服务类型: ${serviceType}\n`;
  
  if (config.configured) {
    message += `状态: ✓ 已配置\n\n`;
    message += `配置详情:\n`;
    details.forEach(detail => {
      message += `  • ${detail}\n`;
    });
    
    message += `\n其他设置:\n`;
    message += `  • 分辨率: ${configManager.getResolution()}\n`;
    message += `  • 默认时长: ${configManager.getDefaultDuration()} 秒`;
  } else {
    message += `状态: ✗ 未配置\n\n`;
    if (config.provider === 'tongyi-wanxiang') {
      message += `请在设置中配置 DashScope API Key\n`;
      message += `(搜索 "vibevideo.dashscope.apiKey")`;
    } else if (config.provider === 'replicate') {
      message += `请在设置中配置 Replicate API Token\n`;
      message += `(搜索 "vibevideo.replicate.apiKey")`;
    } else if (config.provider === 'siliconflow') {
      message += `请在设置中配置硅基流动 API Key\n`;
      message += `(搜索 "vibevideo.siliconflow.apiKey")`;
    } else if (config.provider === 'google') {
      message += `请在设置中配置 Google API Key\n`;
      message += `(搜索 "vibevideo.google.apiKey")`;
    } else {
      message += `请在设置中配置 API Key\n`;
      message += `(搜索 "vibevideo" 即可找到所有配置项)`;
    }
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

