/**
 * 生成初始帧命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { writeFile, readFile } from '../utils/fileSystem';

/**
 * 批量生成所有需要的初始帧
 */
export async function generateAllFirstFrames(
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    // 获取 Provider
    const provider = await providerManager.getProvider();

    // 获取所有分镜
    const storyboards = await treeProvider.getAllStoryboards();

    // 找出需要生成首帧的分镜
    const needFirstFrame = storyboards.filter(sb => sb.firstFramePrompt && !sb.firstFrame);

    if (needFirstFrame.length === 0) {
      vscode.window.showInformationMessage(
        '所有分镜都不需要生成首帧！\n\n提示：在分镜 Markdown 中添加 "生成首帧: 描述" 来使用此功能。'
      );
      return;
    }

    // 询问用户
    const confirm = await vscode.window.showInformationMessage(
      `将生成 ${needFirstFrame.length} 个初始帧，预计需要 ${Math.ceil(needFirstFrame.length * 0.5)} 分钟。是否继续？`,
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
        title: 'Vibe Video - 生成初始帧',
        cancellable: false
      },
      async (progress) => {
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < needFirstFrame.length; i++) {
          const sb = needFirstFrame[i];
          progress.report({
            message: `正在生成 ${i + 1}/${needFirstFrame.length}: ${sb.title}`,
            increment: (100 / needFirstFrame.length)
          });

          try {
            await generateSingleFirstFrame(sb, provider);
            successCount++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`生成首帧失败: ${sb.id}`, errorMsg);
            vscode.window.showErrorMessage(`生成失败 [${sb.id}]: ${errorMsg}`);
            failCount++;
          }
        }

        // 显示结果
        const message = `
初始帧生成完成！
✓ 成功: ${successCount}
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
    vscode.window.showErrorMessage(`生成初始帧失败: ${error}`);
  }
}

/**
 * 生成单个首帧
 */
async function generateSingleFirstFrame(
  storyboard: Storyboard,
  provider: any
): Promise<void> {
  if (!storyboard.firstFramePrompt) {
    throw new Error('缺少 firstFramePrompt');
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 调用文生图 API
  console.log(`[文生图] ${storyboard.id}: ${storyboard.firstFramePrompt}`);
  const taskId = await provider.textToImage(storyboard.firstFramePrompt, {
    size: '1280*720',  // 注意：DashScope 要求用 * 不是 x
    style: 'realistic'
  });

  // 轮询任务状态
  await pollTaskStatus(provider, taskId);

  // 下载图片
  const savePath = path.join(workspaceRoot, 'first-frames', `${storyboard.id}.png`);
  await provider.downloadResource(taskId, savePath);

  // 更新分镜 Markdown 文件
  await updateStoryboardWithFirstFrame(storyboard, savePath);

  console.log(`✓ 首帧生成完成: ${storyboard.id}`);
}

/**
 * 更新分镜 Markdown，添加首帧路径
 */
async function updateStoryboardWithFirstFrame(
  storyboard: Storyboard,
  firstFramePath: string
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // 读取原文件
  let content = await readFile(storyboard.filePath);

  // 计算相对路径
  const relativePath = path.relative(workspaceRoot, firstFramePath).replace(/\\/g, '/');

  // 移除原来的 "生成首帧" 行
  content = content.replace(/^[*-]\s*\*?\*?生成首帧\*?\*?[：:].*$/im, '');

  // 添加 "首帧" 行
  // 在第一个 # 标题后插入
  const lines = content.split('\n');
  const titleIndex = lines.findIndex(line => line.trim().startsWith('#'));
  
  if (titleIndex !== -1) {
    lines.splice(titleIndex + 1, 0, '', `- **首帧**: ${relativePath}`);
    content = lines.join('\n');
  } else {
    // 如果没有标题，在开头添加
    content = `- **首帧**: ${relativePath}\n\n${content}`;
  }

  // 保存文件
  await writeFile(storyboard.filePath, content);
}

/**
 * 轮询任务状态
 */
async function pollTaskStatus(provider: any, taskId: string): Promise<void> {
  const maxAttempts = 60; // 最多等待 60 次 * 5秒 = 5分钟
  let attempts = 0;

  console.log(`[轮询] 开始轮询任务: ${taskId}`);

  while (attempts < maxAttempts) {
    const status = await provider.checkStatus(taskId);

    console.log(`[轮询] 第 ${attempts + 1} 次查询: ${status.status}`);

    if (status.status === 'completed') {
      console.log(`[轮询] ✓ 任务完成`);
      return;
    }

    if (status.status === 'failed') {
      const errorMsg = status.error || '任务失败，未返回详细原因';
      console.error(`[轮询] ✗ 任务失败:`, errorMsg);
      throw new Error(`生成失败: ${errorMsg}`);
    }

    // 等待 5 秒后重试
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('生成超时（超过 5 分钟）');
}

