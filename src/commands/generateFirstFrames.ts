/**
 * 统一的首帧生成命令
 * 智能选择策略：主体 > 参考图 > 提示词
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProviderManager } from '../providers/ProviderManager';
import { SubjectManager } from '../core/SubjectManager';
import { SceneManager } from '../core/SceneManager';
import { StoryboardParser } from '../core/StoryboardParser';
import { ResourceTreeProvider } from '../ui/ResourceTreeProvider';
import { Storyboard } from '../types';
import { writeFile, readFile, fileExists, listFiles } from '../utils/fileSystem';
import { imagesToBase64 } from '../utils/imageEncoder';

/**
 * 首帧生成策略
 */
enum FirstFrameStrategy {
  SUBJECTS_AND_SCENES = 'subjects_and_scenes', // 使用主体和场景图片合成
  SUBJECTS = 'subjects',        // 使用主体图片合成
  SCENES = 'scenes',            // 使用场景图片合成
  REFERENCE_IMAGES = 'reference', // 使用参考图片合成
  TEXT_TO_IMAGE = 'text'         // 使用提示词文生图
}

/**
 * 批量生成所有首帧（统一入口）
 */
export async function generateAllFirstFrames(
  providerManager: ProviderManager,
  subjectManager: SubjectManager,
  treeProvider: ResourceTreeProvider,
  sceneManager?: SceneManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const parser = new StoryboardParser();
    
    // 获取所有分镜
    const storyboards = await treeProvider.getAllStoryboards();

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 找出可以生成首帧的分镜并确定策略
    // 策略选择逻辑：只使用首帧描述中明确指定的参考图和主体，不自动匹配
    const canGenerateFirstFrame: Array<{ 
      storyboard: Storyboard; 
      exists: boolean;
      strategy: FirstFrameStrategy;
      subjects?: string[];
      scenes?: string[];
    }> = [];
    
    for (const sb of storyboards) {
      // 加载首帧描述Markdown
      const firstFrameMarkdown = await loadFirstFrameMarkdown(sb.id, workspaceRoot);
      
      // 确定生成策略（优先级：首帧描述中的参考图 > 首帧描述中的主体 > 提示词）
      let strategy: FirstFrameStrategy | undefined;
      let effectiveSubjects: string[] | undefined;
      let effectiveScenes: string[] | undefined;
      
      // 1. 优先检查首帧描述中明确指定的参考图
      const referenceImages = extractReferenceImagesFromFirstFrameMarkdown(
        firstFrameMarkdown?.content,
        workspaceRoot
      );
      
      if (referenceImages && referenceImages.length > 0) {
        // 检查参考图文件是否存在
        let allRefImagesExist = true;
        for (const refImage of referenceImages) {
          if (!(await fileExists(refImage))) {
            allRefImagesExist = false;
            break;
          }
        }
        
        if (allRefImagesExist) {
          strategy = FirstFrameStrategy.REFERENCE_IMAGES;
        }
      }
      
      // 2. 如果没有参考图，检查首帧描述中明确指定的主体和场景
      if (!strategy && firstFrameMarkdown?.content) {
        const { subjects: firstFrameSubjects, scenes: firstFrameScenes } = 
          extractSubjectsAndScenesFromFirstFrameMarkdown(firstFrameMarkdown.content, workspaceRoot);
        
        // 检查主体和场景图片是否存在
        if (firstFrameSubjects.length > 0 && firstFrameScenes.length > 0 && sceneManager) {
          let allSubjectsExist = true;
          let allScenesExist = true;
          
          for (const subjectId of firstFrameSubjects) {
            if (!(await subjectManager.subjectExists(subjectId))) {
              allSubjectsExist = false;
              break;
            }
          }
          
          for (const sceneId of firstFrameScenes) {
            if (!(await sceneManager.sceneExists(sceneId))) {
              allScenesExist = false;
              break;
            }
          }
          
          if (allSubjectsExist && allScenesExist) {
            strategy = FirstFrameStrategy.SUBJECTS_AND_SCENES;
            effectiveSubjects = firstFrameSubjects;
            effectiveScenes = firstFrameScenes;
          }
        }
        
        // 如果主体+场景不可用，检查是否有主体
        if (!strategy && firstFrameSubjects.length > 0) {
          let allSubjectsExist = true;
          for (const subjectId of firstFrameSubjects) {
            if (!(await subjectManager.subjectExists(subjectId))) {
              allSubjectsExist = false;
              break;
            }
          }
          
          if (allSubjectsExist) {
            strategy = FirstFrameStrategy.SUBJECTS;
            effectiveSubjects = firstFrameSubjects;
          }
        }
        
        // 如果主体不可用，检查是否有场景
        if (!strategy && firstFrameScenes.length > 0 && sceneManager) {
          let allScenesExist = true;
          for (const sceneId of firstFrameScenes) {
            if (!(await sceneManager.sceneExists(sceneId))) {
              allScenesExist = false;
              break;
            }
          }
          
          if (allScenesExist) {
            strategy = FirstFrameStrategy.SCENES;
            effectiveScenes = firstFrameScenes;
          }
        }
      }
      
      // 3. 如果都没有明确指定，使用文生图（仅使用首帧描述中的提示词）
      if (!strategy) {
        const prompt = extractPromptFromFirstFrameMarkdown(firstFrameMarkdown?.content);
        
        if (prompt && prompt.trim().length > 0) {
          strategy = FirstFrameStrategy.TEXT_TO_IMAGE;
        }
      }
      
      // 如果找到了策略，添加到列表
      if (strategy) {
        // 使用与首帧描述文件相同的命名规则：${storyboardId}-first-frame.png
        const firstFramePath = path.join(workspaceRoot, 'first-frames', `${sb.id}-first-frame.png`);
        const exists = await fileExists(firstFramePath);
        canGenerateFirstFrame.push({ 
          storyboard: sb, 
          exists,
          strategy,
          subjects: effectiveSubjects,
          scenes: effectiveScenes
        });
      }
    }

    if (canGenerateFirstFrame.length === 0) {
      vscode.window.showInformationMessage(
        '没有可生成首帧的分镜！\n\n提示：\n' +
        '1. 在首帧描述中添加参考图（"- **参考图片**: 路径"）\n' +
        '2. 在首帧描述的参考图片中指定主体和场景（如：subjects/角色名.png, scenes/场景名.png）\n' +
        '3. 在首帧描述中添加提示词（"- **首帧提示**: 描述"）'
      );
      return;
    }

    const existingFirstFrames = canGenerateFirstFrame.filter(item => item.exists);
    const newFirstFrames = canGenerateFirstFrame.filter(item => !item.exists);

    // 如果有已存在的首帧，提醒用户这是重新生成
    let confirmMessage: string;
    let confirmButton: string;
    
    if (existingFirstFrames.length > 0 && newFirstFrames.length > 0) {
      confirmMessage = `将生成 ${canGenerateFirstFrame.length} 个首帧（其中 ${existingFirstFrames.length} 个将重新生成，${newFirstFrames.length} 个为新生成），预计需要 ${Math.ceil(canGenerateFirstFrame.length * 0.5)} 分钟。\n\n⚠️ 重新生成将覆盖现有图片。是否继续？`;
      confirmButton = '继续生成';
    } else if (existingFirstFrames.length > 0) {
      confirmMessage = `所有首帧都已生成。将重新生成 ${existingFirstFrames.length} 个首帧，预计需要 ${Math.ceil(existingFirstFrames.length * 0.5)} 分钟。\n\n⚠️ 重新生成将覆盖现有图片。是否继续？`;
      confirmButton = '重新生成';
    } else {
      confirmMessage = `将生成 ${newFirstFrames.length} 个首帧，预计需要 ${Math.ceil(newFirstFrames.length * 0.5)} 分钟。是否继续？`;
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
        title: existingFirstFrames.length > 0 ? 'Vibe Video - 重新生成首帧' : 'Vibe Video - 生成首帧',
        cancellable: true
      },
      async (progress, token) => {
        let successCount = 0;
        let failCount = 0;
        let cancelled = false;

        // 并发控制：最多3个并发请求
        const MAX_CONCURRENT = 3;
        const runningTasks = new Set<Promise<void>>();
        let currentIndex = 0;

        const worker = async () => {
          while (true) {
            // 检查是否已取消
            if (token.isCancellationRequested) {
              cancelled = true;
              break;
            }

            const index = currentIndex++;
            if (index >= canGenerateFirstFrame.length) {
              break;
            }

            const item = canGenerateFirstFrame[index];
            const { storyboard: sb, exists, strategy, subjects } = item;
            
            // 再次检查取消状态
            if (token.isCancellationRequested) {
              cancelled = true;
              break;
            }

            const actionText = exists ? '重新生成' : '生成';
            const strategyText = strategy === FirstFrameStrategy.SUBJECTS ? '主体合成' 
              : strategy === FirstFrameStrategy.REFERENCE_IMAGES ? '参考图合成'
              : '文生图';
            
            progress.report({
              message: `正在${actionText} ${index + 1}/${canGenerateFirstFrame.length}: ${sb.title} (${strategyText})`,
              increment: 0
            });

            try {
              await generateSingleFirstFrame(sb, provider, subjectManager, parser, strategy, item.subjects, sceneManager, item.scenes);
              successCount++;
            } catch (error) {
              // 如果是取消错误，不记录为失败
              if (token.isCancellationRequested) {
                cancelled = true;
                break;
              }
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`生成首帧失败: ${sb.id}`, errorMsg);
              vscode.window.showErrorMessage(`生成失败 [${sb.title}]: ${errorMsg}`);
              failCount++;
            } finally {
              progress.report({
                message: `已完成 ${index + 1}/${canGenerateFirstFrame.length} (成功: ${successCount}, 失败: ${failCount})`,
                increment: (100 / canGenerateFirstFrame.length)
              });
            }
          }
        };

        // 启动并发工作线程
        const workerCount = Math.min(MAX_CONCURRENT, canGenerateFirstFrame.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));

        // 显示结果
        if (cancelled) {
          const actionText = existingFirstFrames.length > 0 ? '重新生成' : '生成';
          const message = `
首帧${actionText}已取消
✓ 已完成: ${successCount}
✗ 失败: ${failCount}
          `;
          vscode.window.showWarningMessage(message);
        } else {
          const actionText = existingFirstFrames.length > 0 ? '重新生成' : '生成';
          const message = `
首帧${actionText}完成！
✓ 成功: ${successCount}
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
    vscode.window.showErrorMessage(`生成首帧失败: ${error}`);
  }
}

/**
 * 为单个分镜生成首帧（来自资源树右键）
 */
export async function generateFirstFrameForStoryboard(
  storyboardPath: string,
  providerManager: ProviderManager,
  subjectManager: SubjectManager,
  treeProvider: ResourceTreeProvider,
  sceneManager?: SceneManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const parser = new StoryboardParser();
    const storyboard = await parser.parseMarkdown(storyboardPath);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 加载首帧描述Markdown
    const firstFrameMarkdown = await loadFirstFrameMarkdown(storyboard.id, workspaceRoot);

    // 确定生成策略（只使用首帧描述中明确指定的参考图和主体）
    let strategy: FirstFrameStrategy | undefined;
    let effectiveSubjects: string[] | undefined;
    let effectiveScenes: string[] | undefined;

    // 1. 优先检查首帧描述中明确指定的参考图
    const referenceImages = extractReferenceImagesFromFirstFrameMarkdown(
      firstFrameMarkdown?.content,
      workspaceRoot
    );
    
    if (referenceImages && referenceImages.length > 0) {
      // 检查参考图文件是否存在
      let allRefImagesExist = true;
      for (const refImage of referenceImages) {
        if (!(await fileExists(refImage))) {
          allRefImagesExist = false;
          break;
        }
      }
      
      if (allRefImagesExist) {
        strategy = FirstFrameStrategy.REFERENCE_IMAGES;
      }
    }
    
    // 2. 如果没有参考图，检查首帧描述中明确指定的主体和场景
    if (!strategy && firstFrameMarkdown?.content) {
      const { subjects: firstFrameSubjects, scenes: firstFrameScenes } = 
        extractSubjectsAndScenesFromFirstFrameMarkdown(firstFrameMarkdown.content, workspaceRoot);
      
      // 检查主体和场景图片是否存在
      if (firstFrameSubjects.length > 0 && firstFrameScenes.length > 0 && sceneManager) {
        let allSubjectsExist = true;
        let allScenesExist = true;
        
        for (const subjectId of firstFrameSubjects) {
          if (!(await subjectManager.subjectExists(subjectId))) {
            allSubjectsExist = false;
            break;
          }
        }
        
        for (const sceneId of firstFrameScenes) {
          if (!(await sceneManager.sceneExists(sceneId))) {
            allScenesExist = false;
            break;
          }
        }
        
        if (allSubjectsExist && allScenesExist) {
          strategy = FirstFrameStrategy.SUBJECTS_AND_SCENES;
          effectiveSubjects = firstFrameSubjects;
          effectiveScenes = firstFrameScenes;
        }
      }
      
      // 如果主体+场景不可用，检查是否有主体
      if (!strategy && firstFrameSubjects.length > 0) {
        let allSubjectsExist = true;
        for (const subjectId of firstFrameSubjects) {
          if (!(await subjectManager.subjectExists(subjectId))) {
            allSubjectsExist = false;
            break;
          }
        }
        
        if (allSubjectsExist) {
          strategy = FirstFrameStrategy.SUBJECTS;
          effectiveSubjects = firstFrameSubjects;
        }
      }
      
      // 如果主体不可用，检查是否有场景
      if (!strategy && firstFrameScenes.length > 0 && sceneManager) {
        let allScenesExist = true;
        for (const sceneId of firstFrameScenes) {
          if (!(await sceneManager.sceneExists(sceneId))) {
            allScenesExist = false;
            break;
          }
        }
        
        if (allScenesExist) {
          strategy = FirstFrameStrategy.SCENES;
          effectiveScenes = firstFrameScenes;
        }
      }
    }

    // 3. 如果都没有明确指定，使用文生图（仅使用首帧描述中的提示词）
    if (!strategy) {
      const prompt = extractPromptFromFirstFrameMarkdown(firstFrameMarkdown?.content);
      
      if (prompt && prompt.trim().length > 0) {
        strategy = FirstFrameStrategy.TEXT_TO_IMAGE;
      }
    }

    if (!strategy) {
      vscode.window.showWarningMessage(
        `分镜「${storyboard.title}」无法生成首帧。\n\n提示：\n` +
        '1. 在首帧描述中添加参考图（"- **参考图片**: 路径"）\n' +
        '2. 在首帧描述的参考图片中指定主体和场景（如：subjects/角色名.png, scenes/场景名.png）\n' +
        '3. 在首帧描述中添加提示词（"- **首帧提示**: 描述"）'
      );
      return;
    }

    // 检查首帧是否已存在
    // 使用与首帧描述文件相同的命名规则：${storyboardId}-first-frame.png
    const firstFramePath = path.join(workspaceRoot, 'first-frames', `${storyboard.id}-first-frame.png`);
    const exists = await fileExists(firstFramePath);

    if (exists) {
      const confirm = await vscode.window.showWarningMessage(
        `首帧「${storyboard.title}」已存在，重新生成将覆盖现有图片。是否继续？`,
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
        title: exists ? `重新生成首帧: ${storyboard.title}` : `生成首帧: ${storyboard.title}`,
        cancellable: true
      },
      async (progress, token) => {
        progress.report({ message: '正在生成...' });
        
        try {
          await generateSingleFirstFrame(storyboard, provider, subjectManager, parser, strategy, effectiveSubjects, sceneManager, effectiveScenes);
          
          if (!token.isCancellationRequested) {
            const message = exists 
              ? `✓ 首帧重新生成完成: ${storyboard.title}`
              : `✓ 首帧生成完成: ${storyboard.title}`;
            vscode.window.showInformationMessage(message);
          } else {
            vscode.window.showWarningMessage('首帧生成已取消');
          }
        } catch (error) {
          if (!token.isCancellationRequested) {
            throw error;
          } else {
            vscode.window.showWarningMessage('首帧生成已取消');
          }
        }
        
        // 刷新资源树
        treeProvider.refresh();
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成首帧失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成单个首帧（统一实现）
 */
async function generateSingleFirstFrame(
  storyboard: Storyboard,
  provider: any,
  subjectManager: SubjectManager,
  parser: StoryboardParser,
  strategy: FirstFrameStrategy,
  subjects?: string[],
  sceneManager?: SceneManager,
  scenes?: string[]
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 加载首帧描述Markdown
  const firstFrameMarkdown = await loadFirstFrameMarkdown(storyboard.id, workspaceRoot);

  let result: string; // taskId 或 imageUrl
  let imageSourceType: string;

  if (strategy === FirstFrameStrategy.SUBJECTS_AND_SCENES) {
    // 策略1：使用主体和场景图片合成
    if (!subjects || subjects.length === 0 || !scenes || scenes.length === 0 || !sceneManager) {
      throw new Error('未提供主体或场景列表');
    }

    const effectiveSubjectIds = subjects.slice(0, 3); // 最多3个主体
    const effectiveSceneIds = scenes.slice(0, 2); // 最多2个场景

    // 检查主体和场景图片是否存在
    const missingSubjects: string[] = [];
    const missingScenes: string[] = [];
    
    for (const subjectId of effectiveSubjectIds) {
      if (!(await subjectManager.subjectExists(subjectId))) {
        missingSubjects.push(subjectId);
      }
    }
    
    for (const sceneId of effectiveSceneIds) {
      if (!(await sceneManager.sceneExists(sceneId))) {
        missingScenes.push(sceneId);
      }
    }

    if (missingSubjects.length > 0 || missingScenes.length > 0) {
      const missing = [
        ...(missingSubjects.length > 0 ? [`主体: ${missingSubjects.join(', ')}`] : []),
        ...(missingScenes.length > 0 ? [`场景: ${missingScenes.join(', ')}`] : [])
      ];
      throw new Error(`图片不存在: ${missing.join('; ')}`);
    }

    const subjectImagePaths = effectiveSubjectIds.map(id =>
      subjectManager.getSubjectImagePath(id)
    );
    const sceneImagePaths = effectiveSceneIds.map(id =>
      sceneManager.getSceneImagePath(id)
    );
    const allImagePaths = [...subjectImagePaths, ...sceneImagePaths];
    const imageBase64Array = await imagesToBase64(allImagePaths);
    imageSourceType = `${effectiveSubjectIds.length} 个主体 + ${effectiveSceneIds.length} 个场景`;

    const initialMoment = deriveInitialMoment(firstFrameMarkdown?.content);
    // 使用首帧描述作为场景描述
    const sceneDescription = initialMoment || '';

    const composePrompt = buildComposePromptWithSubjectsAndScenes(
      effectiveSubjectIds, 
      effectiveSceneIds, 
      sceneDescription, 
      initialMoment
    );
    console.log(`[首帧生成] ${storyboard.id}: 使用主体+场景合成`);
    console.log(`[首帧生成] 主体: ${effectiveSubjectIds.join(', ')}`);
    console.log(`[首帧生成] 场景: ${effectiveSceneIds.join(', ')}`);
    console.log(`[首帧生成] 提示词: ${composePrompt.substring(0, 100)}...`);

    result = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, '1280*720');
    
  } else if (strategy === FirstFrameStrategy.SUBJECTS) {
    // 策略1：使用主体图片合成
    if (!subjects || subjects.length === 0) {
      throw new Error('未提供主体列表');
    }

    const effectiveSubjectIds = subjects.slice(0, 3); // 最多3个主体
    if (subjects.length > 3) {
      console.warn(`[首帧生成] ${storyboard.id}: 使用了 ${subjects.length} 个主体，仅使用前 3 个`);
    }

    // 检查主体图片是否存在
    const missingSubjects: string[] = [];
    for (const subjectId of effectiveSubjectIds) {
      if (!(await subjectManager.subjectExists(subjectId))) {
        missingSubjects.push(subjectId);
      }
    }

    if (missingSubjects.length > 0) {
      throw new Error(`主体图片不存在: ${missingSubjects.join(', ')}`);
    }

    const subjectImagePaths = effectiveSubjectIds.map(id =>
      subjectManager.getSubjectImagePath(id)
    );
    const imageBase64Array = await imagesToBase64(subjectImagePaths);
    imageSourceType = `${effectiveSubjectIds.length} 个主体`;

    const initialMoment = deriveInitialMoment(firstFrameMarkdown?.content);
    // 使用首帧描述作为场景描述
    const sceneDescription = initialMoment || '';

    const composePrompt = buildComposePromptWithSubjects(effectiveSubjectIds, sceneDescription, initialMoment);
    console.log(`[首帧生成] ${storyboard.id}: 使用主体合成`);
    console.log(`[首帧生成] 主体: ${effectiveSubjectIds.join(', ')}`);
    console.log(`[首帧生成] 提示词: ${composePrompt.substring(0, 100)}...`);

    result = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, '1280*720');
    
  } else if (strategy === FirstFrameStrategy.SCENES) {
    // 策略2：使用场景图片合成
    if (!scenes || scenes.length === 0 || !sceneManager) {
      throw new Error('未提供场景列表');
    }

    const effectiveSceneIds = scenes.slice(0, 2); // 最多2个场景
    if (scenes.length > 2) {
      console.warn(`[首帧生成] ${storyboard.id}: 使用了 ${scenes.length} 个场景，仅使用前 2 个`);
    }

    // 检查场景图片是否存在
    const missingScenes: string[] = [];
    for (const sceneId of effectiveSceneIds) {
      if (!(await sceneManager.sceneExists(sceneId))) {
        missingScenes.push(sceneId);
      }
    }

    if (missingScenes.length > 0) {
      throw new Error(`场景图片不存在: ${missingScenes.join(', ')}`);
    }

    const sceneImagePaths = effectiveSceneIds.map(id =>
      sceneManager.getSceneImagePath(id)
    );
    const imageBase64Array = await imagesToBase64(sceneImagePaths);
    imageSourceType = `${effectiveSceneIds.length} 个场景`;

    const initialMoment = deriveInitialMoment(firstFrameMarkdown?.content);
    // 使用首帧描述作为场景描述
    const sceneDescription = initialMoment || '';

    const composePrompt = buildComposePromptWithScenes(effectiveSceneIds, sceneDescription, initialMoment);
    console.log(`[首帧生成] ${storyboard.id}: 使用场景合成`);
    console.log(`[首帧生成] 场景: ${effectiveSceneIds.join(', ')}`);
    console.log(`[首帧生成] 提示词: ${composePrompt.substring(0, 100)}...`);

    result = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, '1280*720');
    
  } else if (strategy === FirstFrameStrategy.REFERENCE_IMAGES) {
    // 策略2：使用参考图片合成（仅使用首帧描述中的内容）
    const referenceImagePaths = extractReferenceImagesFromFirstFrameMarkdown(
      firstFrameMarkdown?.content,
      workspaceRoot
    );

    if (!referenceImagePaths || referenceImagePaths.length === 0) {
      throw new Error('未找到参考图片');
    }

    // 提取提示词（仅使用首帧描述中的提示词）
    const prompt = extractPromptFromFirstFrameMarkdown(firstFrameMarkdown?.content);

    if (!prompt) {
      throw new Error('使用参考图时需要提供提示词（请在首帧描述中添加"首帧提示"字段）');
    }

    const imageBase64Array = await imagesToBase64(referenceImagePaths);
    imageSourceType = `${referenceImagePaths.length} 张参考图片`;

    const initialMoment = deriveInitialMoment(firstFrameMarkdown?.content);

    const composePrompt = buildComposePromptWithReferenceImage(prompt, initialMoment, referenceImagePaths.length);
    console.log(`[首帧生成] ${storyboard.id}: 使用参考图合成`);
    console.log(`[首帧生成] 参考图: ${referenceImagePaths.map(p => path.relative(workspaceRoot, p)).join(', ')}`);
    console.log(`[首帧生成] 提示词: ${composePrompt.substring(0, 100)}...`);

    result = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, '1280*720');
    
  } else {
    // 策略3：纯文生图（仅使用首帧描述中的提示词）
    const prompt = extractPromptFromFirstFrameMarkdown(firstFrameMarkdown?.content);

    if (!prompt) {
      throw new Error('缺少提示词（请在首帧描述中添加"首帧提示"字段）');
    }

    imageSourceType = '文生图';
    console.log(`[首帧生成] ${storyboard.id}: 文生图`);
    console.log(`[首帧生成] 提示词: ${prompt.substring(0, 100)}...`);

    result = await provider.textToImage(prompt, {
      size: '1280*720',
      style: 'realistic'
    });
  }

  // 处理结果并保存
  // 使用与首帧描述文件相同的命名规则：${storyboardId}-first-frame.png
  const savePath = path.join(workspaceRoot, 'first-frames', `${storyboard.id}-first-frame.png`);
  
  if (result.startsWith('http')) {
    // 同步模式：直接返回图片 URL
    await provider.client.downloadResource(result, savePath);
  } else {
    // 异步模式：需要轮询
    await pollTaskStatus(provider, result);
    await provider.downloadResource(result, savePath);
  }

  // 更新分镜 Markdown 文件
  await updateStoryboardWithFirstFrame(storyboard, savePath);

  console.log(`✓ 首帧生成完成: ${storyboard.id} (${imageSourceType})`);
}

/**
 * 构建使用主体和场景的合成提示词
 */
function buildComposePromptWithSubjectsAndScenes(
  subjectIds: string[],
  sceneIds: string[],
  description: string,
  initialMoment: string
): string {
  const subjectList = subjectIds.map((id, i) => `主体${i + 1}：${id}`).join('，');
  const sceneList = sceneIds.map((id, i) => `场景${i + 1}：${id}`).join('，');

  return `## 任务
使用提供的主体图片和场景图片构建画面。

## 输入
- 主体：${subjectList}
- 场景：${sceneList}
- 场景描述：${initialMoment}

## 要求
### 必须遵守
1. 将主体放置在场景中，保持主体的真实比例和外观特征
2. 场景图片作为背景和环境参考，主体图片作为前景元素
3. 保持统一的美术风格、光线方向和渲染质量
4. 画面中禁止出现任何文字、字幕、Logo 或水印
5. 镜头为单一画面，禁止多场景拼接、分屏或插画边框
6. 输出尺寸为 1280x720，适合视频首帧

### 允许调整
- 主体的姿势、表情、位置
- 场景的光线、色调、细节
- 主体与场景的融合效果

### 禁止改变
- 主体的外观特征（发型、服装、体型等）
- 场景的整体风格和氛围`;
}

/**
 * 构建使用主体的合成提示词
 */
function buildComposePromptWithSubjects(
  subjectIds: string[],
  description: string,
  initialMoment: string
): string {
  const subjectList = subjectIds.map((id, i) => `图${i + 1}：${id}`).join('，');

  return `## 任务
使用提供的主体图片构建画面。

## 输入
- 主体：${subjectList}
- 场景描述：${initialMoment}

## 要求
### 必须遵守
1. 保持主要角色的真实比例
2. 保持统一的美术风格、光线方向和渲染质量
3. 画面中禁止出现任何文字、字幕、Logo 或水印
4. 镜头为单一画面，禁止多场景拼接、分屏或插画边框
5. 输出尺寸为 1280x720，适合视频首帧

### 允许调整
- 背景、姿势、表情、光线
- 禁止改变主要角色的发型`;
}

/**
 * 构建使用场景的合成提示词
 */
function buildComposePromptWithScenes(
  sceneIds: string[],
  description: string,
  initialMoment: string
): string {
  const sceneList = sceneIds.map((id, i) => `场景${i + 1}：${id}`).join('，');

  return `## 任务
使用提供的场景图片构建画面。

## 输入
- 场景：${sceneList}
- 场景描述：${initialMoment}

## 要求
### 必须遵守
1. 参考场景图片的风格、色调和整体氛围
2. 保持统一的美术风格和渲染质量
3. 画面中禁止出现任何文字、字幕、Logo 或水印
4. 镜头为单一画面，禁止多场景拼接、分屏或插画边框
5. 输出尺寸为 1280x720，适合视频首帧

### 允许调整
- 根据描述调整场景细节、构图和光线
- 融合多个场景的优点（如果提供了多个场景）`;
}

/**
 * 构建使用参考图片的合成提示词
 */
function buildComposePromptWithReferenceImage(
  prompt: string,
  initialMoment: string,
  imageCount: number = 1
): string {
  const isMultiple = imageCount > 1;
  
  return `## 任务
参考提供的${isMultiple ? '多张' : ''}参考图片，生成符合描述的图像。

## 输入
- 场景描述：${prompt}
- 参考图片：${isMultiple ? '多张' : '单张'}

## 要求
### 必须遵守
1. ${isMultiple ? '综合参考所有图片的风格、色调和整体氛围' : '保持参考图的风格、色调和整体氛围'}
2. 画面中禁止出现任何文字、字幕、Logo 或水印
3. 输出尺寸为 1280x720，适合视频首帧

### 允许调整
- ${isMultiple ? '根据描述调整场景、构图和细节，融合多张参考图的优点' : '根据描述调整场景、构图和细节，但保持风格一致性'}`;
}

/**
 * 从首帧描述中提取初始瞬间（仅使用首帧描述的内容）
 */
function deriveInitialMoment(firstFrameMarkdown: string | undefined): string {
  const normalizedMarkdown = normalizeFirstFrameMarkdown(firstFrameMarkdown);
  if (normalizedMarkdown) {
    return normalizedMarkdown;
  }

  // 如果没有首帧描述，返回空字符串
  return '';
}

/**
 * 更新分镜 Markdown，添加首帧路径
 * 注意：已禁用自动添加首帧字段，程序不再自动修改分镜脚本
 */
async function updateStoryboardWithFirstFrame(
  storyboard: Storyboard,
  firstFramePath: string
): Promise<void> {
  // 不再自动添加首帧字段，让用户或AI自行管理
  // 如果需要更新首帧路径，请手动编辑分镜脚本
  return;
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
 * 从首帧描述Markdown中提取主体和场景
 * 从参考图片字段中解析 subjects/xxx.png 和 scenes/xxx.png 格式的路径
 */
function extractSubjectsAndScenesFromFirstFrameMarkdown(
  content: string,
  workspaceRoot: string
): { subjects: string[]; scenes: string[] } {
  const subjects: string[] = [];
  const scenes: string[] = [];
  
  // 从参考图片字段中提取
  const referenceImages = extractReferenceImagesFromFirstFrameMarkdown(content, workspaceRoot);
  if (referenceImages) {
    for (const imagePath of referenceImages) {
      // 检查是否是主体图片路径：subjects/角色名.png
      const subjectMatch = imagePath.match(/subjects[\/\\]([^\/\\]+)\.(png|jpg|jpeg)$/i);
      if (subjectMatch) {
        // 提取主体名称（去掉扩展名）
        const subjectName = subjectMatch[1];
        if (!subjects.includes(subjectName)) {
          subjects.push(subjectName);
        }
      }
      
      // 检查是否是场景图片路径：scenes/场景名.png
      const sceneMatch = imagePath.match(/scenes[\/\\]([^\/\\]+)\.(png|jpg|jpeg)$/i);
      if (sceneMatch) {
        // 提取场景名称（去掉扩展名）
        const sceneName = sceneMatch[1];
        if (!scenes.includes(sceneName)) {
          scenes.push(sceneName);
        }
      }
    }
  }
  
  return { subjects, scenes };
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
 * 规范化首帧描述Markdown内容
 */
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
