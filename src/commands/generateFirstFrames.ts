/**
 * 生成初始帧命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { writeFile, readFile, fileExists, listFiles } from '../utils/fileSystem';
import { imagesToBase64 } from '../utils/imageEncoder';

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
    // 需要满足：有 firstFramePrompt 或 referenceImages，且还没有 firstFrame
    const needFirstFrame = storyboards.filter(sb => 
      !sb.firstFrame && (sb.firstFramePrompt || (sb.referenceImages && sb.referenceImages.length > 0))
    );

    if (needFirstFrame.length === 0) {
      vscode.window.showInformationMessage(
        '所有分镜都不需要生成首帧！\n\n提示：在分镜 Markdown 中添加 "生成首帧: 描述" 或 "参考图: ref-img/xxx.jpg" 来使用此功能。'
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
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 1. 优先检查是否有首帧描述Markdown文件
  const firstFrameMarkdown = await loadFirstFrameMarkdown(storyboard.id, workspaceRoot);
  let referenceImagePaths: string[] = [];
  let prompt: string | undefined;

  if (firstFrameMarkdown) {
    // 如果存在首帧描述Markdown文件，只使用其中的内容，不使用分镜脚本中的内容
    const relativeMdPath = path.relative(workspaceRoot, firstFrameMarkdown.filePath).replace(/\\/g, '/');
    console.log(`[生成首帧] ${storyboard.id}: 发现首帧描述Markdown: ${relativeMdPath}，将只使用首帧描述Markdown中的内容`);
    
    // 从首帧描述Markdown中提取参考图片
    const markdownRefImages = extractReferenceImagesFromFirstFrameMarkdown(
      firstFrameMarkdown.content,
      workspaceRoot
    );
    
    if (markdownRefImages && markdownRefImages.length > 0) {
      referenceImagePaths = markdownRefImages;
      console.log(`[生成首帧] 从首帧描述Markdown中提取到 ${referenceImagePaths.length} 张参考图`);
    }
    
    // 从首帧描述Markdown中提取提示词
    prompt = extractPromptFromFirstFrameMarkdown(firstFrameMarkdown.content);
    if (prompt) {
      console.log(`[生成首帧] 从首帧描述Markdown中提取到提示词`);
    } else {
      throw new Error('首帧描述Markdown文件中没有找到提示词（请添加"首帧提示"、"生成首帧"或"提示"字段，或提供正文内容）');
    }
  } else {
    // 如果没有首帧描述Markdown文件，才使用分镜脚本中的内容
    console.log(`[生成首帧] ${storyboard.id}: 未找到首帧描述Markdown文件，使用分镜脚本中的内容`);
    
    // 使用分镜脚本中的参考图
    if (storyboard.referenceImages && storyboard.referenceImages.length > 0) {
      // 将相对路径转换为绝对路径，并检查文件是否存在
      for (const refImage of storyboard.referenceImages) {
        let imagePath: string;
        if (path.isAbsolute(refImage)) {
          imagePath = refImage;
        } else {
          imagePath = path.join(workspaceRoot, refImage);
        }

        // 检查文件是否存在
        if (!fs.existsSync(imagePath)) {
          throw new Error(`参考图不存在: ${refImage}`);
        }
        referenceImagePaths.push(imagePath);
      }
      console.log(`[生成首帧] 从分镜脚本中提取到 ${referenceImagePaths.length} 张参考图`);
    }

    // 使用分镜脚本中的提示词
    prompt = storyboard.firstFramePrompt || storyboard.description;
  }

  let result: string; // taskId 或 imageUrl

  if (referenceImagePaths.length > 0) {
    // 使用参考图 + 提示词生成（多图合成）
    if (!prompt) {
      throw new Error('使用参考图时需要提供提示词（在首帧描述Markdown或分镜脚本中）');
    }

    console.log(`[参考图生成] ${storyboard.id}: 使用 ${referenceImagePaths.length} 张参考图`);
    const relativePaths = referenceImagePaths.map(p => 
      path.relative(workspaceRoot, p).replace(/\\/g, '/')
    );
    console.log(`[参考图生成] 参考图: ${relativePaths.join(', ')}`);
    console.log(`[参考图生成] 提示词: ${prompt.substring(0, 100)}...`);

    // 将多张参考图转换为 base64
    const referenceImageBase64Array = await imagesToBase64(referenceImagePaths);

    // 构建合成提示词（只使用首帧描述Markdown中的内容，不使用分镜脚本的description）
    const composePrompt = buildReferenceImagePrompt(prompt, undefined, referenceImagePaths.length);

    // 调用多图合成 API
    result = await provider.client.composeMultipleImages(referenceImageBase64Array, composePrompt);
  } else {
    // 纯文生图（原有逻辑）
    if (!prompt) {
      throw new Error('缺少提示词（请在首帧描述Markdown或分镜脚本中提供）');
    }

    console.log(`[文生图] ${storyboard.id}: ${prompt.substring(0, 100)}...`);
    result = await provider.textToImage(prompt, {
      size: '1280*720',  // 注意：DashScope 要求用 * 不是 x
      style: 'realistic'
    });
  }

  // 处理结果（可能是 taskId 或直接返回的 URL）
  const savePath = path.join(workspaceRoot, 'first-frames', `${storyboard.id}.png`);
  
  if (result.startsWith('http')) {
    // 同步模式：直接返回图片 URL，直接下载
    await provider.client.downloadResource(result, savePath);
  } else {
    // 异步模式：是 task_id，需要轮询后下载
    await pollTaskStatus(provider, result);
    await provider.downloadResource(result, savePath);
  }

  // 更新分镜 Markdown 文件
  await updateStoryboardWithFirstFrame(storyboard, savePath);

  console.log(`✓ 首帧生成完成: ${storyboard.id}`);
}

/**
 * 构建参考图合成提示词
 */
function buildReferenceImagePrompt(
  prompt: string,
  description?: string,
  imageCount: number = 1
): string {
  let composePrompt = `请参考提供的${imageCount > 1 ? '多张' : ''}参考图片，生成符合以下描述的图像：\n\n`;
  composePrompt += `描述：${prompt}\n`;

  composePrompt += `\n要求：\n`;
  if (imageCount > 1) {
    composePrompt += `1. 综合参考所有图片的风格、色调和整体氛围。\n`;
    composePrompt += `2. 根据描述调整场景、构图和细节，融合多张参考图的优点。\n`;
  } else {
    composePrompt += `1. 保持参考图的风格、色调和整体氛围。\n`;
    composePrompt += `2. 根据描述调整场景、构图和细节，但保持风格一致性。\n`;
  }
  composePrompt += `3. 画面中禁止出现任何文字、字幕、Logo 或水印。\n`;
  composePrompt += `4. 输出尺寸为 1280x720，适合视频首帧。`;

  return composePrompt;
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

/**
 * 首帧描述Markdown接口
 */
interface FirstFrameMarkdown {
  content: string;
  filePath: string;
}

const firstFrameMarkdownCache = new Map<string, FirstFrameMarkdown | null>();

/**
 * 加载首帧描述Markdown文件
 */
async function loadFirstFrameMarkdown(
  storyboardId: string,
  workspaceRoot?: string
): Promise<FirstFrameMarkdown | undefined> {
  if (firstFrameMarkdownCache.has(storyboardId)) {
    const cached = firstFrameMarkdownCache.get(storyboardId);
    return cached ?? undefined;
  }

  const root = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    firstFrameMarkdownCache.set(storyboardId, null);
    return undefined;
  }

  const firstFramesDir = path.join(root, 'first-frames');
  if (!(await fileExists(firstFramesDir))) {
    firstFrameMarkdownCache.set(storyboardId, null);
    return undefined;
  }

  const candidateFiles = [
    path.join(firstFramesDir, `${storyboardId}.md`),
    path.join(firstFramesDir, `${storyboardId}-first-frame.md`),
    path.join(firstFramesDir, `${storyboardId}_first_frame.md`),
    path.join(firstFramesDir, `${storyboardId}-首帧.md`)
  ];

  for (const candidate of candidateFiles) {
    if (await fileExists(candidate)) {
      const content = await readFile(candidate);
      const data = { content, filePath: candidate };
      firstFrameMarkdownCache.set(storyboardId, data);
      return data;
    }
  }

  const markdownFiles = await listFiles(firstFramesDir, '.md');
  const normalizedId = storyboardId.toLowerCase();
  const fallbackPath = markdownFiles.find(file => {
    const base = path.basename(file, '.md').toLowerCase();
    return (
      base === normalizedId ||
      base.startsWith(`${normalizedId}-`) ||
      base.endsWith(`-${normalizedId}`) ||
      base.includes(`${normalizedId}-first`) ||
      base.includes(`${normalizedId}_first`)
    );
  });

  if (fallbackPath) {
    const content = await readFile(fallbackPath);
    const data = { content, filePath: fallbackPath };
    firstFrameMarkdownCache.set(storyboardId, data);
    return data;
  }

  firstFrameMarkdownCache.set(storyboardId, null);
  return undefined;
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
      // 分割多个路径（支持逗号、中文逗号、空格分隔）
      const imagePaths = match[1]
        .split(/[,，\s]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(imagePath => {
          // 如果是绝对路径，直接返回
          if (path.isAbsolute(imagePath)) {
            return imagePath;
          }
          // 如果是相对路径，相对于工作区根目录解析
          return path.join(workspaceRoot, imagePath);
        });
      
      return imagePaths.length > 0 ? imagePaths : undefined;
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
  ];

  for (const pattern of promptPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // 如果没有找到明确的提示字段，尝试提取整个Markdown的正文内容作为提示词
  // 去掉frontmatter、标题、元数据行等
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

