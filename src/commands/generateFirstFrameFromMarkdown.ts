/**
 * 从 Markdown 中提取参考图片和提示词，调用 RunningHub 工作流生成分镜首帧图片
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ResourceTreeItem } from '../ui/ResourceTreeProvider';
import { ConfigManager } from '../core/ConfigManager';
import { RunningHubClient } from '../providers/RunningHubClient';
import { RunningHubNodeInfo } from '../types';
import { getWorkspaceRoot, fileExists, ensureDir, readFile, renameFile } from '../utils/fileSystem';

/**
 * 工作流 ID
 */
const WORKFLOW_ID = '1994959996884594690';

/**
 * 生成随机 seed
 */
function generateSeed(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/**
 * 从首帧描述Markdown中提取参考图片路径（支持多张，逗号分隔）
 */
function extractReferenceImagesFromFirstFrameMarkdown(
  content: string | undefined,
  workspaceRoot: string
): string[] | undefined {
  if (!content) {
    return undefined;
  }

  const patterns = [
    /[*-]\s*\*?\*?参考图片\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?参考图\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?referenceImage\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?referenceImages\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?ref-img\*?\*?[：:]\s*(.+)$/im,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      // 分割多个路径（只使用逗号、中文逗号分隔，不使用空格，因为路径中可能包含空格）
      const rawValue = match[1].trim();
      // 如果包含逗号或中文逗号，才进行分割；否则作为单个路径处理
      const imagePaths = rawValue.includes(',') || rawValue.includes('，')
        ? rawValue.split(/[,，]+/).map(s => s.trim()).filter(s => s.length > 0)
        : [rawValue];
      
      const resolvedPaths = imagePaths
        .map(imagePath => {
          // 如果是绝对路径，直接返回
          if (path.isAbsolute(imagePath)) {
            return imagePath;
          }
          // 如果是相对路径，相对于工作区根目录解析
          return path.join(workspaceRoot, imagePath);
        });
      
      return resolvedPaths.length > 0 ? resolvedPaths : undefined;
    }
  }

  return undefined;
}

/**
 * 从首帧描述Markdown中提取提示词
 */
function extractPromptFromFirstFrameMarkdown(content: string | undefined): string | undefined {
  if (!content) {
    return undefined;
  }

  // 提取"首帧提示"字段
  const promptPatterns = [
    /[*-]\s*\*?\*?首帧提示\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?firstFramePrompt\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?生成首帧\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?提示\*?\*?[：:]\s*(.+)$/im,
    /[*-]\s*\*?\*?提示词\*?\*?[：:]\s*(.+)$/im,
  ];

  for (const pattern of promptPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // 如果没有找到明确的提示字段，尝试提取整个Markdown的正文内容作为提示词
  let normalized = content
    .replace(/^---[\s\S]*?---/gm, '') // 去掉frontmatter
    .replace(/^#.*$/m, '') // 去掉标题
    .replace(/^[*-]\s*\*\*.*\*\*[：:].*$/gm, '') // 去掉元数据行
    .trim();

  // 如果还有内容，返回前500字符作为提示词
  if (normalized.length > 0) {
    return normalized.substring(0, 500).trim();
  }

  return undefined;
}

/**
 * 从 Markdown 生成分镜首帧图片
 */
export async function generateFirstFrameFromMarkdown(
  item: ResourceTreeItem,
  configManager: ConfigManager,
  resourceTreeProvider?: any
): Promise<void> {
  try {
    // 1. 基本校验
    if (!item || item.resourceType !== 'firstFrameMarkdown' || !item.resourcePath) {
      vscode.window.showErrorMessage('只能对分镜首帧 Markdown 文件使用该命令');
      return;
    }

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 2. 读取 RunningHub 配置
    const runningHubConfig = await configManager.getRunningHubConfig();
    if (!runningHubConfig) {
      vscode.window.showErrorMessage(
        'RunningHub 配置不完整。请在设置中配置：\n' +
        '- vibevideo.runninghub.apiKey'
      );
      return;
    }

    // 3. 读取 Markdown 文件内容
    const markdownPath = item.resourcePath;
    if (!(await fileExists(markdownPath))) {
      vscode.window.showErrorMessage('Markdown 文件不存在');
      return;
    }

    const markdownContent = await readFile(markdownPath);

    // 4. 提取参考图片
    const referenceImages = extractReferenceImagesFromFirstFrameMarkdown(markdownContent, workspaceRoot);
    if (!referenceImages || referenceImages.length === 0) {
      vscode.window.showErrorMessage('Markdown 中未找到参考图片。请添加"参考图片"字段。');
      return;
    }

    // 使用第一张参考图片
    const referenceImagePath = referenceImages[0];
    if (!(await fileExists(referenceImagePath))) {
      vscode.window.showErrorMessage(`参考图片文件不存在: ${referenceImagePath}`);
      return;
    }

    // 5. 提取提示词
    let prompt = extractPromptFromFirstFrameMarkdown(markdownContent);
    if (!prompt) {
      vscode.window.showErrorMessage('Markdown 中未找到提示词。请添加"提示词"或"首帧提示"字段。');
      return;
    }

    // 在提示词前面加上 "Next Scene:"
    if (!prompt.startsWith('Next Scene:')) {
      prompt = `Next Scene: ${prompt}`;
    }

    // 6. 初始化 RunningHub 客户端
    const client = new RunningHubClient(
      runningHubConfig.apiKey,
      runningHubConfig.baseUrl || 'https://www.runninghub.cn'
    );

    // 7. 生成随机 seed
    const seed = generateSeed();

    // 8. 从 Markdown 文件路径推导首帧图片保存路径
    const markdownFileName = path.basename(markdownPath, path.extname(markdownPath));
    const firstFramesDir = path.join(workspaceRoot, 'first-frames');
    await ensureDir(firstFramesDir);
    const firstFrameImagePath = path.join(firstFramesDir, `${markdownFileName}.png`);

    // 9. 显示进度并执行
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Vibe Video - 正在生成分镜首帧图片',
        cancellable: false
      },
      async (progress) => {
        try {
          // 步骤 1: 上传参考图片
          progress.report({ message: '正在上传参考图片...', increment: 20 });
          const uploadedFileName = await client.uploadResource(referenceImagePath, 'input');
          console.log(`[RunningHub] 上传成功: ${uploadedFileName}`);

          // 步骤 2: 构造 nodeInfoList
          progress.report({ message: '正在准备工作流参数...', increment: 20 });
          const nodeInfoList: RunningHubNodeInfo[] = [
            {
              nodeId: '1',
              fieldName: 'image',
              fieldValue: uploadedFileName
            },
            {
              nodeId: '17',
              fieldName: 'prompt',
              fieldValue: prompt
            },
            {
              nodeId: '5',
              fieldName: 'seed',
              fieldValue: seed.toString()
            }
          ];

          // 步骤 3: 创建工作流任务
          progress.report({ message: '正在提交任务...', increment: 20 });
          const taskId = await client.createWorkflowTask({
            workflowId: WORKFLOW_ID,
            nodeInfoList
          });
          console.log(`[RunningHub] 任务已创建: ${taskId}, seed: ${seed}`);

          // 步骤 4: 轮询任务状态
          progress.report({ message: '正在生成中，请稍候...', increment: 20 });
          const maxAttempts = 120; // 最多等待 10 分钟（5秒 * 120）
          let attempts = 0;
          let outputs: any[] = [];

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 等待 5 秒
            
            try {
              outputs = await client.getTaskOutputs(taskId);
              if (outputs.length > 0) {
                // 有输出了，任务完成
                break;
              }
            } catch (error: any) {
              // 如果错误信息包含"任务失败"，直接抛出
              if (error.message && error.message.includes('任务失败')) {
                throw error;
              }
              // 否则继续等待（可能是任务还在运行中）
            }
            
            attempts++;
            progress.report({ 
              message: `正在生成中... (${attempts * 5}秒)`, 
              increment: 0 
            });
          }

          if (outputs.length === 0) {
            throw new Error('任务超时（超过 10 分钟）或未返回结果');
          }

          // 步骤 5: 下载结果图片
          progress.report({ message: '正在下载结果...', increment: 20 });
          
          // 如果目标文件已存在，将其重命名为 .o-n 格式
          if (await fileExists(firstFrameImagePath)) {
            const firstFrameDir = path.dirname(firstFrameImagePath);
            const firstFrameBaseName = path.basename(firstFrameImagePath, path.extname(firstFrameImagePath));
            const ext = path.extname(firstFrameImagePath);
            
            // 查找当前目录中已有的 .o-n 文件，找到最大的 n
            const fs = await import('fs');
            const files = await fs.promises.readdir(firstFrameDir);
            let maxN = 0;
            const escapedBaseName = firstFrameBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedExt = ext.replace('.', '\\.');
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
            let alternativeFileName = `${firstFrameBaseName}.o-${newN}${ext}`;
            let alternativePath = path.join(firstFrameDir, alternativeFileName);
            
            // 如果新文件名已存在，继续递增直到找到不存在的文件名
            while (await fileExists(alternativePath)) {
              newN++;
              alternativeFileName = `${firstFrameBaseName}.o-${newN}${ext}`;
              alternativePath = path.join(firstFrameDir, alternativeFileName);
            }

            // 重命名现有图片为备选文件
            await renameFile(firstFrameImagePath, alternativePath);
          }

          // 下载第一张图片（主图）
          if (outputs[0]?.fileUrl) {
            await client.downloadResource(outputs[0].fileUrl, firstFrameImagePath);
            console.log(`[RunningHub] 已下载主图: ${firstFrameImagePath}`);
          }

          // 下载其余图片（备选图，使用 .o-n 后缀）
          const firstFrameDir = path.dirname(firstFrameImagePath);
          const firstFrameBaseName = path.basename(firstFrameImagePath, path.extname(firstFrameImagePath));
          const ext = path.extname(firstFrameImagePath);
          
          for (let i = 1; i < outputs.length; i++) {
            if (outputs[i]?.fileUrl) {
              const alternativePath = path.join(firstFrameDir, `${firstFrameBaseName}.o-${i}${ext}`);
              await client.downloadResource(outputs[i].fileUrl, alternativePath);
              console.log(`[RunningHub] 已下载备选图: ${alternativePath}`);
            }
          }

          // 刷新资源树
          if (resourceTreeProvider) {
            resourceTreeProvider.refresh();
          }

          vscode.window.showInformationMessage(
            `✓ 分镜首帧图片生成完成！已保存 ${outputs.length} 张图片`
          );
        } catch (error: any) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[RunningHub] 生成失败:`, errorMsg);
          vscode.window.showErrorMessage(`生成分镜首帧图片失败: ${errorMsg}`);
          throw error;
        }
      }
    );
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`生成分镜首帧图片失败: ${errorMsg}`);
  }
}

