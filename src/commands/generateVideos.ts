/**
 * 生成视频命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';

/**
 * 批量生成所有视频
 */
export async function generateAllVideos(
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    // 获取 Provider
    const provider = await providerManager.getProvider();

    // 获取所有分镜
    const storyboards = await treeProvider.getAllStoryboards();

    if (storyboards.length === 0) {
      vscode.window.showWarningMessage('暂无分镜脚本。请先使用 Cursor AI 生成分镜！');
      return;
    }

    // 询问用户
    const confirm = await vscode.window.showInformationMessage(
      `将生成 ${storyboards.length} 个视频，预计需要 ${Math.ceil(storyboards.length * 2)} 分钟。是否继续？`,
      '继续',
      '取消'
    );

    if (confirm !== '继续') {
      return;
    }

    // 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Vibe Video - 生成视频',
        cancellable: false
      },
      async (progress) => {
        let successCount = 0;
        let failCount = 0;
        let imageToVideoCount = 0;

        for (let i = 0; i < storyboards.length; i++) {
          const sb = storyboards[i];
          progress.report({
            message: `正在生成 ${i + 1}/${storyboards.length}: ${sb.title}`,
            increment: (100 / storyboards.length)
          });

          try {
            await generateSingleVideo(sb, provider);
            successCount++;
            
            if (sb.firstFrame) {
              imageToVideoCount++;
            }
          } catch (error) {
            console.error(`生成视频失败: ${sb.id}`, error);
            failCount++;
          }
        }

        // 显示结果
        const message = `
视频生成完成！
✓ 成功: ${successCount} (其中 ${imageToVideoCount} 个图生视频)
✗ 失败: ${failCount}
        `;

        if (failCount === 0) {
          vscode.window.showInformationMessage(message);
        } else {
          vscode.window.showWarningMessage(message);
        }

        // 刷新视图
        treeProvider.refresh();
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成视频失败: ${error}`);
  }
}

/**
 * 生成单个视频
 */
async function generateSingleVideo(
  storyboard: Storyboard,
  provider: any
): Promise<void> {
  let taskId: string;

  // 判断使用哪种生成方式
  if (storyboard.firstFrame) {
    // 图生视频
    console.log(`[图生视频] ${storyboard.id}`);
    taskId = await provider.imageToVideo(
      storyboard.firstFrame,
      storyboard.description,
      { 
        duration: storyboard.duration,
        resolution: '1080P'  // DashScope 图生视频用 1080P/720P 格式
      }
    );
  } else {
    // 纯文生视频
    console.log(`[文生视频] ${storyboard.id}`);
    taskId = await provider.textToVideo(
      storyboard.description,
      { 
        duration: storyboard.duration,
        resolution: '832*480'  // DashScope 文生视频用 width*height 格式
      }
    );
  }

  // 轮询任务状态
  await pollTaskStatus(provider, taskId);

  // 下载视频
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  const savePath = path.join(workspaceRoot, 'assets', 'clips', `${storyboard.id}.mp4`);
  await provider.downloadResource(taskId, savePath);

  console.log(`✓ 视频生成完成: ${storyboard.id}`);
}

/**
 * 轮询任务状态（等待完成）
 */
async function pollTaskStatus(provider: any, taskId: string): Promise<void> {
  const maxAttempts = 180; // 最多等待 180 次 * 10秒 = 30分钟
  let attempts = 0;

  console.log(`[视频轮询] 开始轮询任务: ${taskId}`);

  while (attempts < maxAttempts) {
    const status = await provider.checkStatus(taskId);

    console.log(`[视频轮询] 第 ${attempts + 1} 次: ${status.status}`);

    if (status.status === 'completed') {
      console.log(`[视频轮询] ✓ 完成`);
      return;
    }

    if (status.status === 'failed') {
      const errorMsg = status.error || '任务失败，未返回详细原因';
      console.error(`[视频轮询] ✗ 失败:`, errorMsg);
      throw new Error(`生成失败: ${errorMsg}`);
    }

    // 等待 10 秒后重试
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
  }

  throw new Error('生成超时（超过 30 分钟）');
}

