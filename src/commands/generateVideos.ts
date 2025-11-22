/**
 * 生成视频命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { StoryboardParser } from '../core/StoryboardParser';
import { SubjectManager } from '../core/SubjectManager';
import { SceneManager } from '../core/SceneManager';
import { ConfigManager } from '../core/ConfigManager';
import { fileExists, readFile, ensureDir } from '../utils/fileSystem';
import { imagesToBase64 } from '../utils/imageEncoder';

/**
 * 批量生成所有视频
 */
export async function generateAllVideos(
  providerManager: ProviderManager,
  treeProvider: ResourceTreeProvider,
  subjectManager?: SubjectManager,
  sceneManager?: SceneManager
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

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 检查每个分镜对应的视频文件是否存在
    const videosToGenerate: Array<{ storyboard: Storyboard; exists: boolean }> = [];
    
    for (const sb of storyboards) {
      const videoPath = path.join(workspaceRoot, 'video-clip', `${sb.id}.mp4`);
      const exists = await fileExists(videoPath);
      videosToGenerate.push({ storyboard: sb, exists });
    }

    const existingVideos = videosToGenerate.filter(item => item.exists);
    const newVideos = videosToGenerate.filter(item => !item.exists);

    // 如果有已存在的视频，提醒用户这是重新生成
    let confirmMessage: string;
    let confirmButton: string;
    
    if (existingVideos.length > 0 && newVideos.length > 0) {
      // 部分已存在，部分需要生成
      confirmMessage = `将生成 ${videosToGenerate.length} 个视频（其中 ${existingVideos.length} 个将重新生成，${newVideos.length} 个为新生成），预计需要 ${Math.ceil(videosToGenerate.length * 2)} 分钟。\n\n⚠️ 重新生成将覆盖现有视频。是否继续？`;
      confirmButton = '继续生成';
    } else if (existingVideos.length > 0) {
      // 所有视频都已存在，这是重新生成
      confirmMessage = `所有视频都已生成。将重新生成 ${existingVideos.length} 个视频，预计需要 ${Math.ceil(existingVideos.length * 2)} 分钟。\n\n⚠️ 重新生成将覆盖现有视频。是否继续？`;
      confirmButton = '重新生成';
    } else {
      // 所有都是新生成
      confirmMessage = `将生成 ${newVideos.length} 个视频，预计需要 ${Math.ceil(newVideos.length * 2)} 分钟。是否继续？`;
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
        title: existingVideos.length > 0 ? 'Vibe Video - 重新生成视频' : 'Vibe Video - 生成视频',
        cancellable: true
      },
      async (progress, token) => {
        let successCount = 0;
        let failCount = 0;
        let imageToVideoCount = 0;
        let cancelled = false;

        for (let i = 0; i < videosToGenerate.length; i++) {
          // 检查是否已取消
          if (token.isCancellationRequested) {
            cancelled = true;
            progress.report({ message: '正在取消...' });
            break;
          }

          const { storyboard: sb, exists } = videosToGenerate[i];
          const actionText = exists ? '重新生成' : '生成';
          
          progress.report({
            message: `正在${actionText} ${i + 1}/${videosToGenerate.length}: ${sb.title}`,
            increment: (100 / videosToGenerate.length)
          });

          try {
            const parser = new StoryboardParser();
            const configManager = providerManager.getConfigManager();
            await generateSingleVideo(sb, provider, configManager, subjectManager, sceneManager, parser);
            successCount++;
            
            // 统计图生视频数量（包括参考图和首帧图片）
            if ((sb.referenceImages && sb.referenceImages.length > 0) || sb.firstFrame) {
              imageToVideoCount++;
            }
          } catch (error) {
            // 如果是取消错误，不记录为失败
            if (token.isCancellationRequested) {
              cancelled = true;
              break;
            }
            console.error(`生成视频失败: ${sb.id}`, error);
            failCount++;
          }
        }

        // 显示结果
        if (cancelled) {
          const actionText = existingVideos.length > 0 ? '重新生成' : '生成';
          const message = `
视频${actionText}已取消
✓ 已完成: ${successCount} (其中 ${imageToVideoCount} 个图生视频)
✗ 失败: ${failCount}
          `;
          vscode.window.showWarningMessage(message);
        } else {
          const actionText = existingVideos.length > 0 ? '重新生成' : '生成';
          const message = `
视频${actionText}完成！
✓ 成功: ${successCount} (其中 ${imageToVideoCount} 个图生视频)
✗ 失败: ${failCount}
          `;

          if (failCount === 0) {
            vscode.window.showInformationMessage(message);
          } else {
            vscode.window.showWarningMessage(message);
          }
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
 * 将分辨率从 P 格式转换为 width*height 格式（用于文生视频）
 */
function convertResolutionToSize(resolution: string): string {
  const resolutionMap: Record<string, string> = {
    '480P': '832*480',
    '720P': '1280*720',
    '1080P': '1920*1080'
  };
  return resolutionMap[resolution] || '832*480';
}

/**
 * 生成单个视频
 */
export async function generateSingleVideo(
  storyboard: Storyboard,
  provider: any,
  configManager: ConfigManager,
  subjectManager?: SubjectManager,
  sceneManager?: SceneManager,
  parser?: StoryboardParser
): Promise<void> {
  let taskId: string;

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 获取图片尺寸配置和生成数量配置（用于临时合成图片，使用首帧尺寸）
  const imageSize = configManager.getFirstFrameImageSize();
  const imageNumOutputs = configManager.getImageNumOutputs();

  // 判断使用哪种生成方式
  // 优先级：参考图 > 首帧图片 > 主体+场景 > 主体 > 场景 > 文生视频
  let imagePath: string | undefined;
  let imageSource: string | undefined;

  // 1. 优先使用参考图（用户提供的参考图，更可控）
  if (!imagePath && storyboard.referenceImages && storyboard.referenceImages.length > 0) {
    // 使用第一张参考图
    let refImagePath = storyboard.referenceImages[0];
    
    // 如果是相对路径，转换为绝对路径
    if (!path.isAbsolute(refImagePath)) {
      refImagePath = path.join(workspaceRoot, refImagePath);
    }
    
    // 检查文件是否存在
    if (await fileExists(refImagePath)) {
      imagePath = refImagePath;
      imageSource = '参考图';
      const relativePath = path.relative(workspaceRoot, imagePath).replace(/\\/g, '/');
      console.log(`[图生视频] ${storyboard.id}: 使用参考图 ${relativePath}`);
    } else {
      console.warn(`[图生视频] ${storyboard.id}: 参考图不存在，跳过: ${storyboard.referenceImages[0]}`);
    }
  }
  
  // 2. 如果没有参考图或参考图不存在，尝试使用首帧图片（生成的首帧）
  if (!imagePath && storyboard.firstFrame) {
    let firstFramePath = storyboard.firstFrame;
    
    // 如果是相对路径，转换为绝对路径
    if (!path.isAbsolute(firstFramePath)) {
      firstFramePath = path.join(workspaceRoot, firstFramePath);
    }
    
    // 检查文件是否存在
    if (await fileExists(firstFramePath)) {
      imagePath = firstFramePath;
      imageSource = '首帧图片';
      const relativePath = path.relative(workspaceRoot, imagePath).replace(/\\/g, '/');
      console.log(`[图生视频] ${storyboard.id}: 使用首帧图片 ${relativePath}`);
    } else {
      console.warn(`[图生视频] ${storyboard.id}: 首帧图片不存在，跳过: ${storyboard.firstFrame}`);
    }
  }
  
  // 3. 如果没有首帧，尝试使用主体和场景
  if (!imagePath && subjectManager && sceneManager && parser) {
    const content = await readFile(storyboard.filePath);
    const subjects = parser.extractSubjects(content);
    const scenes = parser.extractScenes(content);
    
    // 检查主体和场景图片是否存在
    if (subjects.length > 0 && scenes.length > 0) {
      const subjectIds = subjects.slice(0, 3);
      const sceneIds = scenes.slice(0, 2);
      
      let allSubjectsExist = true;
      let allScenesExist = true;
      
      for (const subjectId of subjectIds) {
        if (!(await subjectManager.subjectExists(subjectId))) {
          allSubjectsExist = false;
          break;
        }
      }
      
      for (const sceneId of sceneIds) {
        if (!(await sceneManager.sceneExists(sceneId))) {
          allScenesExist = false;
          break;
        }
      }
      
      if (allSubjectsExist && allScenesExist) {
        // 使用主体和场景合成一张图片作为视频输入
        const subjectImagePaths = subjectIds.map(id => subjectManager.getSubjectImagePath(id));
        const sceneImagePaths = sceneIds.map(id => sceneManager.getSceneImagePath(id));
        const allImagePaths = [...subjectImagePaths, ...sceneImagePaths];
        const imageBase64Array = await imagesToBase64(allImagePaths);
        
        // 使用合成API生成一张临时图片
        const composePrompt = `## 任务
使用提供的主体图片和场景图片构建画面，用于生成视频。

## 输入
- 主体：${subjectIds.join('，')}
- 场景：${sceneIds.join('，')}
- 描述：${storyboard.description.substring(0, 200)}

## 要求
1. 将主体放置在场景中，保持主体的真实比例和外观特征
2. 场景图片作为背景和环境参考
3. 保持统一的美术风格、光线方向和渲染质量`;

        const tempImageResult = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, imageSize, imageNumOutputs);
        
        // 下载临时图片
        const tempImagePath = path.join(workspaceRoot, '.temp', `${storyboard.id}-temp.png`);
        
        // 检查返回的是 URL 还是 task_id
        if (tempImageResult && (tempImageResult.startsWith('http://') || tempImageResult.startsWith('https://'))) {
          // 直接是 URL，直接下载
          await provider.client.downloadResource(tempImageResult, tempImagePath);
        } else {
          // 是 task_id，需要轮询任务状态
          await pollTaskStatus(provider, tempImageResult);
          await provider.downloadResource(tempImageResult, tempImagePath);
        }
        
        imagePath = tempImagePath;
        imageSource = `主体+场景合成`;
        console.log(`[图生视频] ${storyboard.id}: 使用主体+场景合成图片`);
      }
    }
    
    // 如果主体+场景不可用，尝试只用主体
    if (!imagePath && subjects.length > 0) {
      const subjectIds = subjects.slice(0, 3);
      let allSubjectsExist = true;
      
      for (const subjectId of subjectIds) {
        if (!(await subjectManager.subjectExists(subjectId))) {
          allSubjectsExist = false;
          break;
        }
      }
      
      if (allSubjectsExist) {
        const subjectImagePaths = subjectIds.map(id => subjectManager.getSubjectImagePath(id));
        const imageBase64Array = await imagesToBase64(subjectImagePaths);
        
        const composePrompt = `## 任务
使用提供的主体图片构建画面，用于生成视频。

## 输入
- 主体：${subjectIds.join('，')}
- 描述：${storyboard.description.substring(0, 200)}

## 要求
1. 保持主要角色的真实比例
2. 保持统一的美术风格、光线方向和渲染质量
3. 输出尺寸为 1280x720，适合视频生成`;

        const tempImageResult = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, imageSize, imageNumOutputs);
        const tempImagePath = path.join(workspaceRoot, '.temp', `${storyboard.id}-temp.png`);
        
        // 检查返回的是 URL 还是 task_id
        if (tempImageResult && (tempImageResult.startsWith('http://') || tempImageResult.startsWith('https://'))) {
          // 直接是 URL，直接下载
          await provider.client.downloadResource(tempImageResult, tempImagePath);
        } else {
          // 是 task_id，需要轮询任务状态
          await pollTaskStatus(provider, tempImageResult);
          await provider.downloadResource(tempImageResult, tempImagePath);
        }
        
        imagePath = tempImagePath;
        imageSource = `主体合成`;
        console.log(`[图生视频] ${storyboard.id}: 使用主体合成图片`);
      }
    }
    
    // 如果主体不可用，尝试只用场景
    if (!imagePath && scenes.length > 0) {
      const sceneIds = scenes.slice(0, 2);
      let allScenesExist = true;
      
      for (const sceneId of sceneIds) {
        if (!(await sceneManager.sceneExists(sceneId))) {
          allScenesExist = false;
          break;
        }
      }
      
      if (allScenesExist) {
        const sceneImagePaths = sceneIds.map(id => sceneManager.getSceneImagePath(id));
        const imageBase64Array = await imagesToBase64(sceneImagePaths);
        
        const composePrompt = `## 任务
使用提供的场景图片构建画面，用于生成视频。

## 输入
- 场景：${sceneIds.join('，')}
- 描述：${storyboard.description.substring(0, 200)}

## 要求
1. 参考场景图片的风格、色调和整体氛围
2. 保持统一的美术风格和渲染质量
3. 输出尺寸为 1280x720，适合视频生成`;

        const tempImageResult = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, imageSize, imageNumOutputs);
        const tempImagePath = path.join(workspaceRoot, '.temp', `${storyboard.id}-temp.png`);
        
        // 检查返回的是 URL 还是 task_id
        if (tempImageResult && (tempImageResult.startsWith('http://') || tempImageResult.startsWith('https://'))) {
          // 直接是 URL，直接下载
          await provider.client.downloadResource(tempImageResult, tempImagePath);
        } else {
          // 是 task_id，需要轮询任务状态
          await pollTaskStatus(provider, tempImageResult);
          await provider.downloadResource(tempImageResult, tempImagePath);
        }
        
        imagePath = tempImagePath;
        imageSource = `场景合成`;
        console.log(`[图生视频] ${storyboard.id}: 使用场景合成图片`);
      }
    }
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

  // 获取视频提示词（图生视频时使用）
  // 优先级：videoPrompt > description
  const videoPrompt = storyboard.videoPrompt || storyboard.description;
  
  if (!videoPrompt || videoPrompt.trim().length === 0) {
    throw new Error(`分镜 ${storyboard.id} 缺少视频提示词，无法生成视频`);
  }

  // 从配置中获取分辨率和视频生成数量
  const resolution = configManager.getResolution();
  const numOutputs = configManager.getVideoNumOutputs();
  
  console.log(`[视频生成] ${storyboard.id}: 时长=${duration}秒, 方式=${imagePath ? (imageSource || '图生视频') : '文生视频'}, 分辨率=${resolution}, 数量=${numOutputs}`);
  console.log(`[视频生成] ${storyboard.id}: 提示词=${videoPrompt.substring(0, 100)}...`);

  // 如果 n > 1，需要生成多个视频
  // 由于 DashScope API 可能不支持一次返回多个视频，我们循环调用
  const taskIds: string[] = [];
  
  for (let i = 0; i < numOutputs; i++) {
    let currentTaskId: string;
    
    if (imagePath) {
      // 图生视频：使用配置的分辨率（480P、720P、1080P 格式）
      currentTaskId = await provider.imageToVideo(
        imagePath,
        videoPrompt,
        { 
          duration: duration,
          resolution: resolution  // DashScope 图生视频用 1080P/720P/480P 格式
        },
        numOutputs === 1 ? undefined : 1  // 如果只生成一个，不传 n；否则每次生成一个
      );
    } else {
      // 纯文生视频：将 P 格式转换为 width*height 格式
      const size = convertResolutionToSize(resolution);
      if (i === 0) {
        console.log(`[文生视频] ${storyboard.id}`);
      }
      currentTaskId = await provider.textToVideo(
        videoPrompt,
        { 
          duration: duration,
          resolution: size  // DashScope 文生视频用 width*height 格式
        },
        numOutputs === 1 ? undefined : 1  // 如果只生成一个，不传 n；否则每次生成一个
      );
    }
    
    taskIds.push(currentTaskId);
    
    // 如果不是最后一个，等待一小段时间再调用下一个（避免 API 限流）
    if (i < numOutputs - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
    }
  }

  // 下载视频（workspaceRoot 已在上面获取）
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 下载所有视频
  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    
    // 轮询任务状态
    await pollTaskStatus(provider, taskId);
    
    // 确定保存路径
    let savePath: string;
    if (i === 0) {
      // 第一个视频使用原文件名
      savePath = path.join(workspaceRoot, 'video-clip', `${storyboard.id}.mp4`);
    } else {
      // 其余视频添加后缀
      savePath = path.join(workspaceRoot, 'video-clip', `${storyboard.id}.o-${i}.mp4`);
    }
    
    await provider.downloadResource(taskId, savePath);
    console.log(`✓ 视频 ${i + 1}/${numOutputs} 生成完成: ${path.basename(savePath)}`);
  }

  console.log(`✓ 所有视频生成完成: ${storyboard.id} (共 ${numOutputs} 个)`);
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
  treeProvider: ResourceTreeProvider,
  subjectManager?: SubjectManager,
  sceneManager?: SceneManager
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
    
    // 确保临时目录存在
    const tempDir = path.join(workspaceRoot, '.temp');
    await ensureDir(tempDir);
    const expectedClipPath = path.join(workspaceRoot, 'video-clip', `${storyboard.id}.mp4`);
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
        cancellable: true
      },
      async (progress, token) => {
        progress.report({ message: '正在生成...' });
        
        try {
          const configManager = providerManager.getConfigManager();
          await generateSingleVideo(storyboard, provider, configManager, subjectManager, sceneManager, parser);
          
          if (!token.isCancellationRequested) {
            const message = clipExists 
              ? `✓ 视频重新生成完成: ${storyboard.title || storyboard.id}`
              : `✓ 视频生成完成: ${storyboard.title || storyboard.id}`;
            vscode.window.showInformationMessage(message);
          } else {
            vscode.window.showWarningMessage('视频生成已取消');
          }
        } catch (error) {
          if (!token.isCancellationRequested) {
            throw error;
          } else {
            vscode.window.showWarningMessage('视频生成已取消');
          }
        }
        
        // 刷新资源树
        treeProvider.refresh();
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成视频失败: ${error}`);
  }
}

