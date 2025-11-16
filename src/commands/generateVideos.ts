/**
 * 生成视频命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { StoryboardParser } from '../core/StoryboardParser';
import { fileExists } from '../utils/fileSystem';

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
    
    // 将相对路径转换为绝对路径
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('无法获取工作区路径');
    }
    
    let firstFramePath = storyboard.firstFrame;
    // 如果是相对路径，转换为绝对路径
    if (!path.isAbsolute(firstFramePath)) {
      firstFramePath = path.join(workspaceRoot, firstFramePath);
    }
    
    console.log(`[图生视频] 使用首帧图片: ${firstFramePath}`);
    
    taskId = await provider.imageToVideo(
      firstFramePath,
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

/**
 * 从视频片段生成单个视频（由右键菜单触发）
 */
export async function generateSingleVideoFromClip(
  clipPath: string,
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    
    // 从视频片段路径找到对应的分镜脚本
    const storyboardPath = await treeProvider.getStoryboardPathFromClip(clipPath);
    if (!storyboardPath) {
      const clipName = path.basename(clipPath);
      vscode.window.showErrorMessage(
        `未找到对应的分镜脚本。视频片段文件名应为：${path.basename(clipPath, '.mp4')}.mp4，对应的分镜脚本应为：storyboards/${path.basename(clipPath, '.mp4')}.md`
      );
      return;
    }

    // 解析分镜脚本
    const parser = new StoryboardParser();
    const storyboard = await parser.parseMarkdown(storyboardPath);

    if (!storyboard.description || storyboard.description.length < 20) {
      vscode.window.showErrorMessage(
        `分镜描述太短或为空。请编辑 ${storyboardPath} 添加详细描述。`
      );
      return;
    }

    // 检查视频是否已存在
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('无法获取工作区路径');
    }
    const expectedClipPath = path.join(workspaceRoot, 'assets', 'clips', `${storyboard.id}.mp4`);
    const clipExists = await fileExists(expectedClipPath);

    // 如果视频已存在，提示用户这是重新生成
    if (clipExists) {
      const confirm = await vscode.window.showWarningMessage(
        `视频片段「${storyboard.title || storyboard.id}」已存在，重新生成将覆盖现有视频。是否继续？`,
        '重新生成',
        '取消'
      );

      if (confirm !== '重新生成') {
        return;
      }
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: clipExists ? `重新生成视频: ${storyboard.title || storyboard.id}` : `生成视频: ${storyboard.title || storyboard.id}`,
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: '正在生成...' });
        await generateSingleVideo(storyboard, provider);
        const message = clipExists 
          ? `✓ 视频重新生成完成: ${storyboard.title || storyboard.id}`
          : `✓ 视频生成完成: ${storyboard.title || storyboard.id}`;
        vscode.window.showInformationMessage(message);
        
        // 刷新资源树
        treeProvider.refresh();
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成视频失败: ${error}`);
  }
}

