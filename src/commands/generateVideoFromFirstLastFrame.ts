/**
 * 根据首尾帧生成视频
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { StoryboardParser } from '../core/StoryboardParser';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { getWorkspaceRoot, fileExists, ensureDir } from '../utils/fileSystem';
import { imageToBase64 } from '../utils/imageEncoder';
import { TongyiWanxiangProvider } from '../providers/TongyiWanxiangProvider';

/**
 * 从视频片段根据首尾帧生成视频
 */
export async function generateVideoFromFirstLastFrame(
  clipPath: string,
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    const workspaceRoot = getWorkspaceRoot();
    
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 从视频片段路径找到对应的分镜脚本
    const storyboardPath = await treeProvider.getStoryboardPathFromClip(clipPath);
    if (!storyboardPath) {
      const clipName = path.basename(clipPath);
      vscode.window.showErrorMessage(
        `未找到对应的分镜脚本。视频片段文件名应为：${path.basename(clipPath, '.mp4')}.mp4，对应的分镜脚本应为：storyboards/${path.basename(clipPath, '.mp4')}.md`
      );
      return;
    }

    // 调用从分镜脚本生成的函数
    await generateVideoFromFirstLastFrameByStoryboard(storyboardPath, providerManager, treeProvider);
  } catch (error: any) {
    vscode.window.showErrorMessage(`生成视频失败: ${error.message || error}`);
  }
}

/**
 * 从分镜脚本根据首尾帧生成视频
 */
export async function generateVideoFromFirstLastFrameByStoryboard(
  storyboardPath: string,
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    // 解析分镜脚本
    const parser = new StoryboardParser();
    const storyboard = await parser.parseMarkdown(storyboardPath);

    // 调用内部函数生成视频
    await generateSingleVideoFromFirstLastFrame(storyboard, storyboardPath, providerManager, treeProvider);
  } catch (error: any) {
    vscode.window.showErrorMessage(`生成视频失败: ${error.message || error}`);
  }
}

/**
 * 根据首尾帧生成单个视频（内部函数，带 token）
 */
async function generateSingleVideoFromFirstLastFrameWithToken(
  storyboard: Storyboard,
  storyboardPath: string,
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider,
  token?: vscode.CancellationToken
): Promise<void> {
  await generateSingleVideoFromFirstLastFrame(storyboard, storyboardPath, providerManager, treeProvider, true, token);
}

/**
 * 根据首尾帧生成单个视频（内部函数）
 */
async function generateSingleVideoFromFirstLastFrame(
  storyboard: Storyboard,
  storyboardPath: string,
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider,
  skipConfirm: boolean = false,
  token?: vscode.CancellationToken
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const configManager = providerManager.getConfigManager();
    
    // 检查 provider 是否支持首尾帧生成视频（目前只有通义万相支持）
    if (!(provider instanceof TongyiWanxiangProvider)) {
      vscode.window.showErrorMessage('首尾帧生成视频功能目前仅支持通义万相 Provider');
      return;
    }
    
    const workspaceRoot = getWorkspaceRoot();
    
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 检查是否有首帧和尾帧
    if (!storyboard.firstFrame) {
      vscode.window.showErrorMessage(
        `分镜脚本中未找到首帧路径。请在 ${storyboardPath} 中添加首帧字段（- **首帧**: first-frames/xxx-first-frame.png）`
      );
      return;
    }

    if (!storyboard.lastFrame) {
      vscode.window.showWarningMessage(
        `分镜脚本中未找到尾帧路径。将仅使用首帧生成视频。如需使用首尾帧生成，请在 ${storyboardPath} 中添加尾帧字段（- **尾帧**: first-frames/xxx-last-frame.png）`
      );
    }

    // 构建首帧和尾帧的完整路径
    const firstFramePath = path.isAbsolute(storyboard.firstFrame)
      ? storyboard.firstFrame
      : path.join(workspaceRoot, storyboard.firstFrame);
    
    const lastFramePath = storyboard.lastFrame
      ? (path.isAbsolute(storyboard.lastFrame)
          ? storyboard.lastFrame
          : path.join(workspaceRoot, storyboard.lastFrame))
      : undefined;

    // 检查首帧文件是否存在
    if (!(await fileExists(firstFramePath))) {
      vscode.window.showErrorMessage(
        `首帧图片不存在: ${firstFramePath}`
      );
      return;
    }

    // 如果指定了尾帧，检查尾帧文件是否存在
    if (lastFramePath && !(await fileExists(lastFramePath))) {
      vscode.window.showErrorMessage(
        `尾帧图片不存在: ${lastFramePath}`
      );
      return;
    }

    // 检查视频提示词
    const prompt = storyboard.videoPrompt || storyboard.description;
    if (!prompt || prompt.trim().length < 10) {
      vscode.window.showErrorMessage(
        `分镜描述或视频提示词太短。请编辑 ${storyboardPath} 添加详细描述。`
      );
      return;
    }

    // 验证并获取时长（优先使用分镜描述中的时长，如果不符合要求则使用配置中的默认时长）
    let duration = storyboard.duration;
    if (!duration) {
      const defaultDuration = configManager.getDefaultDuration();
      console.warn(`[警告] 分镜 ${storyboard.id} 未指定时长，使用配置中的默认时长 ${defaultDuration}秒`);
      duration = defaultDuration;
    } else if (duration !== 5 && duration !== 10) {
      const defaultDuration = configManager.getDefaultDuration();
      console.warn(`[警告] 分镜 ${storyboard.id} 的时长 ${duration}秒 不符合规范（只能是5秒或10秒），使用配置中的默认时长 ${defaultDuration}秒`);
      duration = defaultDuration;
    }

    // 检查视频是否已存在
    const expectedClipPath = path.join(workspaceRoot, 'video-clip', `${storyboard.id}.mp4`);
    const clipExists = await fileExists(expectedClipPath);

    if (clipExists && !skipConfirm) {
      const result = await vscode.window.showWarningMessage(
        `视频片段「${storyboard.title || storyboard.id}」已存在，重新生成将覆盖现有视频。是否继续？`,
        '重新生成',
        '取消'
      );
      if (result !== '重新生成') {
        return;
      }
    }

    // 实际的生成逻辑
    const generateLogic = async (progress?: vscode.Progress<{ message?: string; increment?: number }>, token?: vscode.CancellationToken) => {
      if (progress) {
        progress.report({ message: '正在转换图片为 Base64...' });
      }

      // 转换首帧为 Base64
      const firstFrameBase64 = await imageToBase64(firstFramePath);
      
      // 转换尾帧为 Base64（如果有）
      let lastFrameBase64: string | undefined;
      if (lastFramePath) {
        lastFrameBase64 = await imageToBase64(lastFramePath);
      }

      if (token?.isCancellationRequested) {
        throw new Error('用户取消');
      }

      if (progress) {
        progress.report({ message: '正在调用 API 生成视频...' });
      }

      // 调用首尾帧生成视频接口
      // 从配置中获取分辨率
      const resolution = configManager.getResolution();
      console.log(`[首尾帧生成视频] ${storyboard.id}: 时长=${duration}秒, 分辨率=${resolution}`);
      let taskId: string;
      if (lastFrameBase64) {
        // 使用首尾帧生成
        console.log(`[首尾帧生成视频] ${storyboard.id}: 使用首帧和尾帧`);
        taskId = await provider.client.firstLastFrameToVideo(
          firstFrameBase64,
          lastFrameBase64,
          prompt,
          resolution
        );
      } else {
        // 如果没有尾帧，使用首帧生成（图生视频）
        if (!skipConfirm) {
          vscode.window.showWarningMessage('未找到尾帧，将使用首帧进行图生视频');
        }
        taskId = await provider.imageToVideo(firstFrameBase64, prompt, { 
          duration: duration,
          resolution: resolution 
        });
      }

      if (token?.isCancellationRequested) {
        throw new Error('用户取消');
      }

      if (progress) {
        progress.report({ message: '正在轮询任务状态...' });
      }

      // 轮询任务状态
      if (token) {
        await pollTaskStatus(provider, taskId, token);
      } else {
        // 如果没有 token，创建一个空的 CancellationToken
        const emptyToken = new vscode.CancellationTokenSource().token;
        await pollTaskStatus(provider, taskId, emptyToken);
      }

      if (token?.isCancellationRequested) {
        throw new Error('用户取消');
      }

      if (progress) {
        progress.report({ message: '正在下载视频...' });
      }

      // 确保目录存在
      await ensureDir(path.dirname(expectedClipPath));

      // 下载视频
      await provider.downloadResource(taskId, expectedClipPath);

      if (!skipConfirm) {
        const message = clipExists
          ? `✓ 视频重新生成完成: ${storyboard.title || storyboard.id}`
          : `✓ 视频生成完成: ${storyboard.title || storyboard.id}`;
        vscode.window.showInformationMessage(message);
      }
    };

    // 根据是否跳过确认来决定是否显示进度条
    if (skipConfirm) {
      // 批量生成时，不显示进度条，直接执行
      await generateLogic();
    } else {
      // 单个生成时，显示进度条
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: clipExists ? `重新生成视频: ${storyboard.title || storyboard.id}` : `生成视频: ${storyboard.title || storyboard.id}`,
          cancellable: true
        },
        async (progress, token) => {
          try {
            await generateLogic(progress, token);
          } catch (error: any) {
            if (error.message === '用户取消') {
              vscode.window.showWarningMessage('视频生成已取消');
            } else {
              throw error;
            }
          }
        }
      );
    }

    // 刷新资源树（仅在单个生成时刷新，批量生成时统一刷新）
    if (!skipConfirm) {
      treeProvider.refresh();
    }
  } catch (error: any) {
    throw error; // 重新抛出错误，让调用者处理
  }
}

/**
 * 批量根据首尾帧生成所有视频
 */
export async function generateAllVideosFromFirstLastFrame(
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    
    // 检查 provider 是否支持首尾帧生成视频（目前只有通义万相支持）
    if (!(provider instanceof TongyiWanxiangProvider)) {
      vscode.window.showErrorMessage('首尾帧生成视频功能目前仅支持通义万相 Provider');
      return;
    }

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 获取所有分镜脚本
    const storyboards = await treeProvider.getAllStoryboards();
    
    if (storyboards.length === 0) {
      vscode.window.showWarningMessage('暂无分镜脚本。请先使用 Cursor AI 生成分镜！');
      return;
    }

    // 检查每个分镜是否有首帧和尾帧
    const validStoryboards: Array<{ storyboard: Storyboard; storyboardPath: string }> = [];
    const invalidStoryboards: Array<{ storyboard: Storyboard; reason: string }> = [];

    const parser = new StoryboardParser();
    for (const sb of storyboards) {
      if (!sb.filePath) {
        invalidStoryboards.push({ storyboard: sb, reason: '缺少文件路径' });
        continue;
      }

      // 检查是否有首帧
      if (!sb.firstFrame) {
        invalidStoryboards.push({ storyboard: sb, reason: '缺少首帧' });
        continue;
      }

      // 检查首帧文件是否存在
      const firstFramePath = path.isAbsolute(sb.firstFrame)
        ? sb.firstFrame
        : path.join(workspaceRoot, sb.firstFrame);
      
      if (!(await fileExists(firstFramePath))) {
        invalidStoryboards.push({ storyboard: sb, reason: `首帧文件不存在: ${sb.firstFrame}` });
        continue;
      }

      // 检查视频提示词
      const prompt = sb.videoPrompt || sb.description;
      if (!prompt || prompt.trim().length < 10) {
        invalidStoryboards.push({ storyboard: sb, reason: '视频提示词太短' });
        continue;
      }

      validStoryboards.push({ storyboard: sb, storyboardPath: sb.filePath });
    }

    if (validStoryboards.length === 0) {
      vscode.window.showWarningMessage(
        `没有可用的分镜脚本。\n${invalidStoryboards.length > 0 ? `\n无效的分镜：\n${invalidStoryboards.map(item => `- ${item.storyboard.id}: ${item.reason}`).join('\n')}` : ''}`
      );
      return;
    }

    // 检查已存在的视频
    const videosToGenerate: Array<{ storyboard: Storyboard; storyboardPath: string; exists: boolean }> = [];
    for (const { storyboard, storyboardPath } of validStoryboards) {
      const videoPath = path.join(workspaceRoot, 'video-clip', `${storyboard.id}.mp4`);
      const exists = await fileExists(videoPath);
      videosToGenerate.push({ storyboard, storyboardPath, exists });
    }

    const existingVideos = videosToGenerate.filter(item => item.exists);
    const newVideos = videosToGenerate.filter(item => !item.exists);

    // 如果有无效的分镜，显示警告
    if (invalidStoryboards.length > 0) {
      const invalidList = invalidStoryboards.map(item => `- ${item.storyboard.id}: ${item.reason}`).join('\n');
      const continueAnyway = await vscode.window.showWarningMessage(
        `发现 ${invalidStoryboards.length} 个无效的分镜脚本，将跳过：\n\n${invalidList}\n\n是否继续生成其他视频？`,
        '继续',
        '取消'
      );
      if (continueAnyway !== '继续') {
        return;
      }
    }

    // 确认生成
    let confirmMessage: string;
    let confirmButton: string;
    
    if (existingVideos.length > 0 && newVideos.length > 0) {
      confirmMessage = `将根据首尾帧生成 ${videosToGenerate.length} 个视频（其中 ${existingVideos.length} 个将重新生成，${newVideos.length} 个为新生成），预计需要 ${Math.ceil(videosToGenerate.length * 2)} 分钟。\n\n⚠️ 重新生成将覆盖现有视频。是否继续？`;
      confirmButton = '继续生成';
    } else if (existingVideos.length > 0) {
      confirmMessage = `所有视频都已生成。将根据首尾帧重新生成 ${existingVideos.length} 个视频，预计需要 ${Math.ceil(existingVideos.length * 2)} 分钟。\n\n⚠️ 重新生成将覆盖现有视频。是否继续？`;
      confirmButton = '重新生成';
    } else {
      confirmMessage = `将根据首尾帧生成 ${newVideos.length} 个视频，预计需要 ${Math.ceil(newVideos.length * 2)} 分钟。是否继续？`;
      confirmButton = '继续';
    }

    const confirm = await vscode.window.showWarningMessage(
      confirmMessage,
      confirmButton,
      '取消'
    );

    if (confirm !== confirmButton) {
      return;
    }

    // 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: existingVideos.length > 0 ? 'Vibe Video - 根据首尾帧重新生成视频' : 'Vibe Video - 根据首尾帧生成视频',
        cancellable: true
      },
      async (progress, token) => {
        let successCount = 0;
        let failCount = 0;
        let cancelled = false;

        for (let i = 0; i < videosToGenerate.length; i++) {
          // 检查是否已取消
          if (token.isCancellationRequested) {
            cancelled = true;
            progress.report({ message: '正在取消...' });
            break;
          }

          const { storyboard, storyboardPath, exists } = videosToGenerate[i];
          const actionText = exists ? '重新生成' : '生成';
          
          progress.report({
            message: `正在${actionText} ${i + 1}/${videosToGenerate.length}: ${storyboard.title || storyboard.id}`,
            increment: (100 / videosToGenerate.length)
          });

          try {
            // 创建一个包装函数来传递 token
            await generateSingleVideoFromFirstLastFrameWithToken(
              storyboard,
              storyboardPath,
              providerManager,
              treeProvider,
              token
            );
            successCount++;
          } catch (error: any) {
            // 如果是取消错误，不记录为失败
            if (error.message === '用户取消' || token.isCancellationRequested) {
              cancelled = true;
              break;
            }
            console.error(`根据首尾帧生成视频失败: ${storyboard.id}`, error);
            failCount++;
          }
        }

        // 刷新资源树
        treeProvider.refresh();

        // 显示结果
        if (cancelled) {
          const actionText = existingVideos.length > 0 ? '重新生成' : '生成';
          const message = `根据首尾帧${actionText}视频已取消\n✓ 已完成: ${successCount}\n✗ 失败: ${failCount}`;
          vscode.window.showWarningMessage(message);
        } else {
          const actionText = existingVideos.length > 0 ? '重新生成' : '生成';
          const message = `根据首尾帧${actionText}视频完成！\n✓ 成功: ${successCount}\n✗ 失败: ${failCount}`;

          if (failCount === 0) {
            vscode.window.showInformationMessage(message);
          } else {
            vscode.window.showWarningMessage(message);
          }
        }
      }
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`批量生成视频失败: ${error.message || error}`);
  }
}

/**
 * 轮询任务状态
 */
async function pollTaskStatus(
  provider: any,
  taskId: string,
  token: vscode.CancellationToken
): Promise<void> {
  let attempts = 0;
  const maxAttempts = 180; // 最多轮询 30 分钟（每 10 秒一次）

  console.log(`[视频轮询] 开始轮询任务: ${taskId}`);

  while (attempts < maxAttempts) {
    if (token.isCancellationRequested) {
      throw new Error('用户取消');
    }

    const status = await provider.checkStatus(taskId);
    console.log(`[视频轮询] 第 ${attempts + 1} 次: ${status.status}`);

    if (status.status === 'completed') {
      console.log('[视频轮询] ✓ 完成');
      return;
    }

    if (status.status === 'failed') {
      const error = status.error || '任务失败，未返回详细原因';
      console.error('[视频轮询] ✗ 失败:', error);
      throw new Error(`生成失败: ${error}`);
    }

    // 等待 10 秒后重试
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
  }

  throw new Error('生成超时（超过 30 分钟）');
}

