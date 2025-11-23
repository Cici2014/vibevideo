/**
 * 从视频片段提取最后一帧为下一分镜首帧
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ResourceTreeProvider, ResourceTreeItem } from '../ui/ResourceTreeProvider';
import { FFmpegManager } from '../utils/ffmpeg';
import { getWorkspaceRoot, fileExists, ensureDir, renameFile } from '../utils/fileSystem';

const execAsync = promisify(exec);

/**
 * 从视频片段提取最后一帧为下一分镜首帧
 */
export async function extractLastFrameToNext(
  item: ResourceTreeItem,
  context: vscode.ExtensionContext,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  if (!item) {
    vscode.window.showErrorMessage('请选择视频片段');
    return;
  }

  const resourcePath = item.resourcePath;
  if (!resourcePath) {
    vscode.window.showErrorMessage('该资源项没有文件路径');
    return;
  }

  // 检查是否是视频片段类型
  if (item.resourceType !== 'clip') {
    vscode.window.showErrorMessage('只能对视频片段执行此操作');
    return;
  }

  try {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
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

    // 从视频片段路径获取对应的分镜脚本
    const storyboardPath = await treeProvider.getStoryboardPathFromClip(resourcePath);
    if (!storyboardPath) {
      const clipName = path.basename(resourcePath);
      vscode.window.showErrorMessage(
        `未找到对应的分镜脚本。视频片段文件名应为：${path.basename(resourcePath, '.mp4')}.mp4，对应的分镜脚本应为：storyboards/${path.basename(resourcePath, '.mp4')}.md`
      );
      return;
    }

    // 从分镜脚本路径提取分镜ID
    const storyboardId = path.basename(storyboardPath, path.extname(storyboardPath));

    // 获取所有分镜列表
    const storyboards = await treeProvider.getAllStoryboards();
    if (storyboards.length === 0) {
      vscode.window.showWarningMessage('没有找到分镜脚本');
      return;
    }

    // 找到当前分镜的索引
    const currentIndex = storyboards.findIndex(sb => sb.id === storyboardId);
    if (currentIndex === -1) {
      vscode.window.showWarningMessage(`未找到对应的分镜脚本: ${storyboardId}`);
      return;
    }

    // 检查是否是最后一个分镜
    if (currentIndex === storyboards.length - 1) {
      vscode.window.showWarningMessage('这是最后一个分镜，没有下一帧');
      return;
    }

    // 获取下一个分镜
    const nextStoryboard = storyboards[currentIndex + 1];
    const nextFrameFileName = `${nextStoryboard.id}-first-frame.png`;
    const nextFramePath = path.join(workspaceRoot, 'first-frames', nextFrameFileName);

    // 确保 first-frames 目录存在
    await ensureDir(path.dirname(nextFramePath));

    // 如果下一帧已有图片，将其重命名为 .o-n 格式
    if (await fileExists(nextFramePath)) {
      const nextFrameDir = path.dirname(nextFramePath);
      const nextFrameExt = path.extname(nextFrameFileName);
      const nextFrameBaseName = path.basename(nextFrameFileName, nextFrameExt);
      
      // 查找当前目录中已有的 .o-n 文件，找到最大的 n
      const files = await fs.promises.readdir(nextFrameDir);
      let maxN = 0;
      const escapedBaseName = nextFrameBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedExt = nextFrameExt.replace('.', '\\.');
      const alternativePattern = new RegExp(`^${escapedBaseName}\\.o-(\\d+)${escapedExt}$`);
      
      for (const file of files) {
        const match = file.match(alternativePattern);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxN) {
            maxN = n;
          }
        }
      }

      // 生成新的备选文件名（n 自增）
      let newN = maxN + 1;
      let alternativeFileName = `${nextFrameBaseName}.o-${newN}${nextFrameExt}`;
      let alternativePath = path.join(nextFrameDir, alternativeFileName);
      
      // 如果新文件名已存在，继续递增直到找到不存在的文件名
      while (await fileExists(alternativePath)) {
        newN++;
        alternativeFileName = `${nextFrameBaseName}.o-${newN}${nextFrameExt}`;
        alternativePath = path.join(nextFrameDir, alternativeFileName);
      }

      // 重命名现有图片为备选文件
      await renameFile(nextFramePath, alternativePath);
    }

    // 使用 FFmpeg 提取视频最后一帧
    // 方法：使用 -sseof -1 从文件末尾读取，配合 -update 1 只输出一帧
    // 这是提取视频最后一帧的常用方法
    const needsQuotes = ffmpegPath.includes(path.sep) || ffmpegPath.includes('/');
    const ffmpegCmd = needsQuotes ? `"${ffmpegPath}"` : ffmpegPath;
    
    // Windows 路径处理：需要转义特殊字符
    const escapedVideoPath = resourcePath.replace(/\\/g, '/');
    const escapedOutputPath = nextFramePath.replace(/\\/g, '/');

    // 使用 -sseof -1 从文件末尾偏移-1秒开始读取，-update 1 只更新一次（输出一帧）
    // -q:v 1 表示高质量输出
    const command = `${ffmpegCmd} -sseof -1 -i "${escapedVideoPath}" -update 1 -q:v 1 "${escapedOutputPath}" -y`;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '提取视频最后一帧',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: '正在提取最后一帧...', increment: 0 });

        try {
          await execAsync(command, { timeout: 30000 });
          
          // 检查输出文件是否生成
          if (!(await fileExists(nextFramePath))) {
            throw new Error('提取失败：未生成输出文件');
          }

          progress.report({ message: '提取完成', increment: 100 });

          // 刷新资源树
          treeProvider?.refresh();

          vscode.window.showInformationMessage(
            `已提取最后一帧为下一分镜首帧: ${nextFrameFileName}`
          );
        } catch (error: any) {
          console.error('FFmpeg 提取失败:', error);
          throw new Error(`提取失败: ${error.message || error}`);
        }
      }
    );
  } catch (error: any) {
    console.error('提取最后一帧失败:', error);
    vscode.window.showErrorMessage(`提取最后一帧失败: ${error.message || error}`);
  }
}

