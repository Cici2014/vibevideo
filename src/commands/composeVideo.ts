/**
 * 视频合成命令
 * 将所有视频片段合成为一个长视频
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { FFmpegManager } from '../utils/ffmpeg';
import { fileExists, listFiles, ensureDir, getWorkspaceRoot } from '../utils/fileSystem';

const execAsync = promisify(exec);

/**
 * 合成所有视频片段为一个长视频
 */
export async function composeAllVideos(
  context: vscode.ExtensionContext,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('请先打开一个工作区文件夹');
    return;
  }

  // 确保 FFmpeg 已安装
  let ffmpegPath: string;
  try {
    ffmpegPath = await FFmpegManager.ensureFFmpegInstalled(context);
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message || 'FFmpeg 未安装');
    return;
  }

  // 验证 FFmpeg 是否可用
  const isValid = await FFmpegManager.verifyFFmpeg(ffmpegPath);
  if (!isValid) {
    vscode.window.showErrorMessage('FFmpeg 验证失败，请检查安装是否正确');
    return;
  }

  // 获取所有分镜（按ID排序）
  const storyboards = await treeProvider.getAllStoryboards();
  if (storyboards.length === 0) {
    vscode.window.showWarningMessage('暂无分镜脚本');
    return;
  }

  // 获取所有视频片段
  const clipsDir = path.join(workspaceRoot, 'video-clip');
  const allClips = await listFiles(clipsDir, '.mp4');

  // 按分镜顺序收集视频片段
  const videoClips: string[] = [];
  const missingClips: string[] = [];

  for (const storyboard of storyboards) {
    const expectedClipPath = path.join(clipsDir, `${storyboard.id}.mp4`);
    if (await fileExists(expectedClipPath)) {
      videoClips.push(expectedClipPath);
    } else {
      missingClips.push(storyboard.id);
    }
  }

  if (videoClips.length === 0) {
    vscode.window.showWarningMessage('没有找到可用的视频片段');
    return;
  }

  // 如果有缺失的视频片段，提示用户
  if (missingClips.length > 0) {
    const message = `有 ${missingClips.length} 个分镜缺少视频片段：${missingClips.slice(0, 5).join(', ')}${missingClips.length > 5 ? '...' : ''}\n\n是否继续合成已有视频片段？`;
    const result = await vscode.window.showWarningMessage(
      message,
      '继续合成',
      '取消'
    );
    if (result !== '继续合成') {
      return;
    }
  }

  // 确认合成
  const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 5), 0);
  const confirmMessage = `将合成 ${videoClips.length} 个视频片段为一个长视频（总时长约 ${totalDuration} 秒）。是否继续？`;
  const confirm = await vscode.window.showInformationMessage(
    confirmMessage,
    '开始合成',
    '取消'
  );

  if (confirm !== '开始合成') {
    return;
  }

  // 显示进度
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Vibe Video - 视频合成',
      cancellable: true
    },
    async (progress, token) => {
      try {
        progress.report({ message: '正在准备视频文件列表...', increment: 0 });

        // 创建临时文件列表
        const tempDir = path.join(workspaceRoot, '.temp');
        await ensureDir(tempDir);
        const fileListPath = path.join(tempDir, 'video-list.txt');

        // 生成文件列表（FFmpeg concat demuxer 格式）
        // 注意：Windows路径需要转换为正斜杠或使用转义的反斜杠
        const fileListContent = videoClips
          .map(clip => {
            // 将Windows路径转换为正斜杠，并转义单引号
            const normalizedPath = clip.replace(/\\/g, '/').replace(/'/g, "'\\''");
            return `file '${normalizedPath}'`;
          })
          .join('\n');
        
        await fs.promises.writeFile(fileListPath, fileListContent, 'utf-8');

        // 确保 output 文件夹存在
        const outputDir = path.join(workspaceRoot, 'output');
        await ensureDir(outputDir);

        // 输出文件路径
        const outputPath = path.join(outputDir, 'final.mp4');
        
        // 如果输出文件已存在，询问是否覆盖
        if (await fileExists(outputPath)) {
          const overwrite = await vscode.window.showWarningMessage(
            `输出文件 ${path.basename(outputPath)} 已存在，是否覆盖？`,
            '覆盖',
            '取消'
          );
          if (overwrite !== '覆盖') {
            return;
          }
        }

        progress.report({ message: '正在合成视频...', increment: 30 });

        // 构建 FFmpeg 命令
        // 使用 concat demuxer 来合并视频（保持原始质量）
        // 如果 ffmpegPath 是系统命令（不包含路径分隔符），不需要加引号
        const needsQuotes = ffmpegPath.includes(path.sep) || ffmpegPath.includes('/');
        const ffmpegCmd = needsQuotes ? `"${ffmpegPath}"` : ffmpegPath;
        const ffmpegCommand = `${ffmpegCmd} -f concat -safe 0 -i "${fileListPath}" -c copy "${outputPath}"`;

        // 执行 FFmpeg 命令
        const { stdout, stderr } = await execAsync(ffmpegCommand, {
          timeout: 600000, // 10分钟超时
          maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区
        });

        // 检查是否已取消
        if (token.isCancellationRequested) {
          // 清理临时文件
          try {
            await fs.promises.unlink(fileListPath);
          } catch (error) {
            // 忽略清理错误
          }
          vscode.window.showWarningMessage('视频合成已取消');
          return;
        }

        // 验证输出文件是否存在
        if (await fileExists(outputPath)) {
          progress.report({ message: '合成完成！', increment: 100 });
          
          // 清理临时文件
          try {
            await fs.promises.unlink(fileListPath);
          } catch (error) {
            // 忽略清理错误
          }

          const result = await vscode.window.showInformationMessage(
            `视频合成完成！输出文件：${path.basename(outputPath)}`,
            '打开文件',
            '在资源管理器中打开'
          );

          if (result === '打开文件') {
            const uri = vscode.Uri.file(outputPath);
            await vscode.commands.executeCommand('vscode.open', uri);
          } else if (result === '在资源管理器中打开') {
            const uri = vscode.Uri.file(outputPath);
            await vscode.commands.executeCommand('revealFileInOS', uri);
          }
        } else {
          throw new Error('输出文件未生成，请检查 FFmpeg 输出');
        }
      } catch (error: any) {
        if (token.isCancellationRequested) {
          vscode.window.showWarningMessage('视频合成已取消');
          return;
        }

        console.error('[视频合成] 错误:', error);
        const errorMessage = error.message || String(error);
        
        // 如果错误信息包含 FFmpeg 相关错误，提供更友好的提示
        if (errorMessage.includes('ffmpeg') || errorMessage.includes('FFmpeg')) {
          vscode.window.showErrorMessage(
            `视频合成失败：${errorMessage}\n\n` +
            `如果问题持续，请使用您的 AI 编程助手帮助诊断问题。`
          );
        } else {
          vscode.window.showErrorMessage(`视频合成失败：${errorMessage}`);
        }
      }
    }
  );
}

