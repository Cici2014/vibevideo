/**
 * 合成初始帧命令（使用主体）
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SubjectManager } from '../core/SubjectManager';
import { StoryboardParser } from '../core/StoryboardParser';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { imagesToBase64 } from '../utils/imageEncoder';
import { writeFile, readFile, listFiles, fileExists } from '../utils/fileSystem';

/**
 * 批量合成所有使用主体的分镜
 */
export async function composeAllFirstFrames(
  providerManager: ProviderManager,
  subjectManager: SubjectManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const parser = new StoryboardParser();
    
    // 获取所有分镜
    const storyboards = await treeProvider.getAllStoryboards();
    
    // 找出使用主体的分镜
    const storyboardsWithSubjects: Array<{ storyboard: Storyboard; subjects: string[] }> = [];
    
    for (const sb of storyboards) {
      const content = await readFile(sb.filePath);
      const subjects = parser.extractSubjects(content);
      
      if (subjects.length > 0) {
        storyboardsWithSubjects.push({ storyboard: sb, subjects });
      }
    }

    if (storyboardsWithSubjects.length === 0) {
      vscode.window.showInformationMessage(
        '没有分镜使用主体。\n\n提示：在分镜 Markdown 中添加 "- **主体**: 主体名称" 来使用此功能。'
      );
      return;
    }

    const confirm = await vscode.window.showInformationMessage(
      `将合成 ${storyboardsWithSubjects.length} 个初始帧，预计需要 ${Math.ceil(storyboardsWithSubjects.length * 0.5)} 分钟。是否继续？`,
      '继续',
      '取消'
    );

    if (confirm !== '继续') {
      return;
    }

    const MAX_CONCURRENT_COMPOSE = 3;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Vibe Video - 合成初始帧',
        cancellable: false
      },
      async (progress) => {
        let successCount = 0;
        let failCount = 0;
        let processedCount = 0;
        let currentIndex = 0;
        const total = storyboardsWithSubjects.length;
        const workerCount = Math.min(MAX_CONCURRENT_COMPOSE, total);

        const worker = async () => {
          while (true) {
            const index = currentIndex++;
            if (index >= total) {
              break;
            }

            const { storyboard, subjects } = storyboardsWithSubjects[index];
            progress.report({
              message: `正在合成 ${index + 1}/${total}: ${storyboard.title}`
            });

            try {
              await composeSingleFirstFrame(
                storyboard,
                subjects,
                provider,
                subjectManager,
                parser
              );
              successCount++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`合成初始帧失败: ${storyboard.id}`, errorMsg);
              vscode.window.showErrorMessage(`合成失败 [${storyboard.title}]: ${errorMsg}`);
              failCount++;
            } finally {
              processedCount++;
              progress.report({
                increment: 100 / total,
                message: `已完成 ${processedCount}/${total}`
              });
            }
          }
        };

        await Promise.all(Array.from({ length: workerCount }, () => worker()));

        const message = `
初始帧合成完成！
✓ 成功: ${successCount}
✗ 失败: ${failCount}
        `;

        if (failCount === 0) {
          vscode.window.showInformationMessage(message);
        } else {
          vscode.window.showWarningMessage(message);
        }

        treeProvider.refresh();
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`合成初始帧失败: ${error}`);
  }
}

/**
 * 为单个分镜脚本合成首帧（来自资源树右键）
 */
export async function composeFirstFrameForStoryboard(
  storyboardPath: string,
  providerManager: ProviderManager,
  subjectManager: SubjectManager,
  treeProvider: ResourceTreeProvider
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const parser = new StoryboardParser();
    const storyboard = await parser.parseMarkdown(storyboardPath);
    const content = await readFile(storyboard.filePath);
    const subjects = parser.extractSubjects(content);

    if (subjects.length === 0) {
      vscode.window.showWarningMessage(`分镜「${storyboard.title}」未配置主体，无法合成首帧。`);
      return;
    }

    const confirm = await vscode.window.showInformationMessage(
      `将为「${storyboard.title}」合成首帧，是否继续？`,
      '生成',
      '取消'
    );

    if (confirm !== '生成') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Vibe Video - 合成初始帧',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: `正在合成：${storyboard.title}` });
        await composeSingleFirstFrame(storyboard, subjects, provider, subjectManager, parser);
      }
    );

    vscode.window.showInformationMessage(`首帧已生成：${storyboard.title}`);
    treeProvider.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(`合成首帧失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 合成单个初始帧
 */
async function composeSingleFirstFrame(
  storyboard: Storyboard,
  subjectIds: string[],
  provider: any,
  subjectManager: SubjectManager,
  parser: StoryboardParser
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  console.log(`[合成] ${storyboard.id}: 使用主体 ${subjectIds.join(', ')}`);

  let effectiveSubjectIds = subjectIds;
  if (subjectIds.length > 3) {
    effectiveSubjectIds = subjectIds.slice(0, 3);
    const warningMessage = `分镜「${storyboard.title}」使用了 ${subjectIds.length} 个主体，当前暂时仅使用前 3 个主体：${effectiveSubjectIds.join(', ')}。`;
    console.warn(`[合成][限制] ${warningMessage}`);
    vscode.window.showWarningMessage(warningMessage);
  }

  // 1. 检查所有主体图片是否存在
  const missingSubjects: string[] = [];
  for (const subjectId of effectiveSubjectIds) {
    const exists = await subjectManager.subjectExists(subjectId);
    if (!exists) {
      missingSubjects.push(subjectId);
    }
  }

  if (missingSubjects.length > 0) {
    throw new Error(`主体图片不存在: ${missingSubjects.join(', ')}。请先生成这些主体。`);
  }

  // 2. 读取分镜信息
  const content = await readFile(storyboard.filePath);
  const description = storyboard.description;
  const firstFrameMarkdown = await loadFirstFrameMarkdown(storyboard.id, workspaceRoot);
  if (firstFrameMarkdown) {
    const relativeMdPath = path.relative(workspaceRoot, firstFrameMarkdown.filePath).replace(/\\/g, '/');
    console.log(`[合成] 发现首帧描述: ${relativeMdPath}`);
  }
  const initialMoment = deriveInitialMoment(
    firstFrameMarkdown?.content,
    storyboard.firstFramePrompt,
    description
  );

  // 3. 统一使用单次合成
  console.log(`[合成] 策略：直接合成（使用 ${effectiveSubjectIds.length} 个主体）`);

  const subjectImagePaths = effectiveSubjectIds.map(id =>
    subjectManager.getSubjectImagePath(id)
  );
  const imageBase64Array = await imagesToBase64(subjectImagePaths);

  const composePrompt = buildComposePrompt(effectiveSubjectIds, description, initialMoment);
  console.log(`[合成] 提示词: ${composePrompt.substring(0, 500)}...`);

  const result = await provider.client.composeMultipleImages(imageBase64Array, composePrompt);
  const imageUrl = await resolveComposeResult(result, provider);

  // 4. 下载合成后的图片
  const savePath = path.join(workspaceRoot, 'first-frames', `${storyboard.id}.png`);
  
  console.log(`[合成] 下载到: ${savePath}`);
  await provider.client.downloadResource(imageUrl, savePath);

  // 5. 更新分镜 Markdown
  await updateStoryboardWithFirstFrame(storyboard, savePath);

  console.log(`✓ 初始帧合成完成: ${storyboard.id}`);
}

/**
 * 构建合成提示词（第一批或单批）
 */
function buildComposePrompt(
  subjectIds: string[],
  description: string,
  initialMoment: string
): string {
  const subjectList = subjectIds.map((id, i) => `图${i + 1}：${id}`).join('，');

  let prompt = `请严格按照提供的主体图片构建画面：\n\n`;
  prompt += `重点角色：${subjectList}\n`;
  prompt += `\n描述：${initialMoment}\n`;
  prompt += `严格要求：\n`;
  prompt += `1. 保持主要角色的真实比例。\n`;
  prompt += `2. 只允许调整背景、姿势、表情和光线，不要改变主要角色的发型。\n`;
  prompt += `3. 保持统一的美术风格、光线方向和渲染质量。\n`;
  prompt += `4. 画面中禁止出现任何文字、字幕、Logo 或水印。\n`;
  prompt += `5. 镜头为单一画面，禁止多场景拼接、分屏或插画边框。`;

  return prompt;
}

/**
 * 构建第二批合成提示词
 */
function buildSecondBatchPrompt(
  additionalSubjectIds: string[],
  scene: string,
  layout: string,
  description: string,
  initialMoment: string
): string {
  const subjectList = additionalSubjectIds.map((id, i) => `图${i + 2}：${id}`).join('，');

  let prompt = `在图1（已有场景和角色）的基础上继续创作：保持图1中的角色、姿势、位置、比例和背景完全不变，只添加新的主体。\n\n`;
  prompt += `新增主体（需保持外观一致）：${subjectList}\n`;
  prompt += `场景：${scene}\n`;

  if (layout) {
    prompt += `构图：${layout}\n`;
  }

  prompt += `\n初始瞬间：${initialMoment || description}\n`;
  prompt += `动作和氛围：${description}\n\n`;
  prompt += `重要要求：\n`;
  prompt += `1. 图1中的主要角色、比例、位置、表情和背景维持一致，可自然加入其他配角。\n`;
  prompt += `2. 新增主体要与原有角色在风格、比例和光线上完全匹配。\n`;
  prompt += `3. 画面中禁止出现任何文字、字幕、Logo 或水印。\n`;
  prompt += `4. 整体风格、镜头语言、光线方向必须与图1完全一致。\n`;
  prompt += `5. 镜头保持单一画面，禁止多场景拼接或分屏。`;

  return prompt;
}

/**
 * 从首帧提示或描述中提取初始瞬间
 */
function deriveInitialMoment(
  firstFrameMarkdown: string | undefined,
  firstFramePrompt: string | undefined,
  description: string
): string {
  const normalizedMarkdown = normalizeFirstFrameMarkdown(firstFrameMarkdown);
  if (normalizedMarkdown) {
    return normalizedMarkdown;
  }

  if (firstFramePrompt && firstFramePrompt.trim().length >= 12) {
    return firstFramePrompt.trim();
  }

  if (!description) {
    return '';
  }

  const normalized = description
    .replace(/\s+/g, ' ')
    .replace(/["“”]/g, '')
    .trim();

  const sentences = normalized.split(/(?<=[。！？!?])/);
  const initial = sentences.slice(0, 2).join('').trim();

  return initial || normalized;
}

interface FirstFrameMarkdown {
  content: string;
  filePath: string;
}

const firstFrameMarkdownCache = new Map<string, FirstFrameMarkdown | null>();

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

function normalizeFirstFrameMarkdown(content?: string): string | undefined {
  if (!content) {
    return undefined;
  }

  const cleaned = content
    .replace(/\r/g, '')
    .replace(/^---[\s\S]*?---/gm, '')
    .split('\n')
    .map(line =>
      line
        .replace(/^[#>\s]*/g, '')
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*/g, '')
        .trim()
    )
    .filter(Boolean)
    .join(' ');

  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * 解析合成结果（处理同步/异步模式）
 */
async function resolveComposeResult(result: string, provider: any): Promise<string> {
  if (result.startsWith('http')) {
    // 同步模式：直接返回图片 URL
    return result;
  } else {
    // 异步模式：是 task_id，需要轮询
    await pollTaskStatus(provider, result);
    const status = await provider.checkStatus(result);
    if (!status.url) {
      throw new Error('合成完成但未返回图片 URL');
    }
    return status.url;
  }
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

  let content = await readFile(storyboard.filePath);
  const relativePath = path.relative(workspaceRoot, firstFramePath).replace(/\\/g, '/');

  // 移除旧的首帧行
  content = content.replace(/^[*-]\s*\*?\*?首帧\*?\*?[：:].*$/im, '');
  content = content.replace(/^[*-]\s*\*?\*?生成首帧\*?\*?[：:].*$/im, '');

  // 在第一个 # 标题后插入
  const lines = content.split('\n');
  const titleIndex = lines.findIndex(line => line.trim().startsWith('#'));
  
  if (titleIndex !== -1) {
    lines.splice(titleIndex + 1, 0, '', `- **首帧**: ${relativePath}`);
    content = lines.join('\n');
  } else {
    content = `- **首帧**: ${relativePath}\n\n${content}`;
  }

  await writeFile(storyboard.filePath, content);
}

/**
 * 轮询任务状态（用于异步模式）
 */
async function pollTaskStatus(provider: any, taskId: string): Promise<void> {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await provider.checkStatus(taskId);

    if (status.status === 'completed') {
      return;
    }

    if (status.status === 'failed') {
      throw new Error(`任务失败: ${status.error || '未知错误'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('合成超时');
}

