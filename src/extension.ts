/**
 * Vibe Video Extension
 * 像写代码一样制作视频
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectInitializer } from './core/ProjectInitializer';
import { StoryboardParser } from './core/StoryboardParser';
import { ConfigManager } from './core/ConfigManager';
import { SubjectManager } from './core/SubjectManager';
import { SceneManager } from './core/SceneManager';
import { ResourceTreeProvider, ResourceTreeItem } from './ui/ResourceTreeProvider';
import { AlternativeResourceDecorationProvider } from './ui/AlternativeResourceDecorationProvider';
import { ProviderManager } from './providers/ProviderManager';
import { configureVideoAI, showCurrentConfig } from './commands/configureAPI';
import { generateAllVideos, generateSingleVideoFromClip, generateSingleVideo } from './commands/generateVideos';
import { generateVideoFromFirstLastFrame, generateVideoFromFirstLastFrameByStoryboard, generateAllVideosFromFirstLastFrame } from './commands/generateVideoFromFirstLastFrame';
import { generateAllFirstFrames, generateFirstFrameForStoryboard } from './commands/generateFirstFrames';
import { generateAllSubjects, generateSingleSubjectCommand } from './commands/generateSubjects';
import { generateAllScenes, generateSingleSceneCommand } from './commands/generateScenes';
import { editImage } from './commands/editImage';
import { composeAllVideos } from './commands/composeVideo';
import { extractLastFrameToNext } from './commands/extractLastFrame';
import { getWorkspaceRoot, isVVProject, copyFile, ensureDir, fileExists, renameFile, deleteFile, generateUniqueFileName } from './utils/fileSystem';

let resourceTreeProvider: ResourceTreeProvider | undefined;
let providerManager: ProviderManager | undefined;
let configManager: ConfigManager | undefined;
let subjectManager: SubjectManager | undefined;
let sceneManager: SceneManager | undefined;
// 存储复制的图片路径，用于粘贴操作
let copiedImagePath: string | undefined;

/**
 * 扩展激活
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Vibe Video extension is now active!');

  const workspaceRoot = getWorkspaceRoot();

  // 初始化管理器
  configManager = new ConfigManager(context);
  providerManager = new ProviderManager(context);
  
  if (workspaceRoot) {
    subjectManager = new SubjectManager(workspaceRoot);
    sceneManager = new SceneManager(workspaceRoot);
  }
  
  resourceTreeProvider = new ResourceTreeProvider(workspaceRoot);
  const decorationProvider = new AlternativeResourceDecorationProvider();
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(decorationProvider));

  // 监听配置变化，当 provider 或相关配置改变时重置 Provider 缓存
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('vibevideo.provider') || 
        e.affectsConfiguration('vibevideo.dashscope') || 
        e.affectsConfiguration('vibevideo.replicate') ||
        e.affectsConfiguration('vibevideo.google') ||
        e.affectsConfiguration('vibevideo.sora')) {
      // 配置变化时重置 Provider，下次获取时会重新创建
      providerManager?.resetProvider();
      console.log('[Vibe Video] 配置已更新，Provider 缓存已重置');
    }
  });
  
  context.subscriptions.push(configChangeDisposable);

  // 注册侧边栏视图（支持拖放）
  const treeView = vscode.window.createTreeView('vvResources', {
    treeDataProvider: resourceTreeProvider,
    dragAndDropController: resourceTreeProvider,
    showCollapseAll: true
  });

  // ===== 项目管理命令 =====
  
  const initCommand = vscode.commands.registerCommand('vibevideo.initProject', async () => {
    await initializeProject();
  });

  const refreshCommand = vscode.commands.registerCommand('vibevideo.refreshResources', () => {
    resourceTreeProvider?.refresh();
  });

  const statsCommand = vscode.commands.registerCommand('vibevideo.showStats', async () => {
    await showProjectStats();
  });

  // ===== 分镜相关命令 =====
  
  const checkCommand = vscode.commands.registerCommand('vibevideo.checkStoryboards', async () => {
    await checkStoryboards();
  });

  // ===== API 配置命令 =====
  
  const configAPICommand = vscode.commands.registerCommand('vibevideo.configureAPI', async () => {
    if (!configManager || !providerManager) {
      return;
    }
    await configureVideoAI(configManager, providerManager);
  });

  const showConfigCommand = vscode.commands.registerCommand('vibevideo.showConfig', async () => {
    if (!configManager) {
      return;
    }
    await showCurrentConfig(configManager);
  });

  // ===== 主体/角色命令 =====
  
  const generateSubjectsCommand = vscode.commands.registerCommand('vibevideo.generateSubjects', async () => {
    if (!providerManager || !subjectManager) {
      vscode.window.showErrorMessage('请先打开一个工作区文件夹');
      return;
    }
    if (!configManager) {
      vscode.window.showErrorMessage('配置管理器未初始化');
      return;
    }
    await generateAllSubjects(providerManager, subjectManager, configManager);
  });

  const generateSingleSubjectCommandHandler = vscode.commands.registerCommand(
    'vibevideo.generateSingleSubject',
    async (item: ResourceTreeItem) => {
      if (!providerManager || !subjectManager) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      if (!item || (item.resourceType !== 'subject' && item.resourceType !== 'subjectMarkdown')) {
        vscode.window.showErrorMessage('请选择主体项');
        return;
      }

      // 从 ResourceTreeItem 中提取 subjectId
      // 优先使用 markdown 路径，如果没有则使用 resourcePath
      const subjectPath = item.resourcePath || item.relatedPaths?.markdown;
      if (!subjectPath) {
        vscode.window.showErrorMessage('无法获取主体路径');
        return;
      }

      // 从文件路径提取 subjectId（文件名，去掉扩展名）
      const subjectId = path.basename(subjectPath, path.extname(subjectPath));
      
      if (!configManager) {
        vscode.window.showErrorMessage('配置管理器未初始化');
        return;
      }
      await generateSingleSubjectCommand(subjectId, providerManager, subjectManager, configManager);
      
      // 刷新资源树
      resourceTreeProvider?.refresh();
    }
  );

  // ===== 场景命令 =====
  
  const generateScenesCommand = vscode.commands.registerCommand('vibevideo.generateScenes', async () => {
    if (!providerManager || !sceneManager) {
      vscode.window.showErrorMessage('请先打开一个工作区文件夹');
      return;
    }
    if (!configManager) {
      vscode.window.showErrorMessage('配置管理器未初始化');
      return;
    }
    await generateAllScenes(providerManager, sceneManager, configManager);
  });

  const generateSingleSceneCommandHandler = vscode.commands.registerCommand(
    'vibevideo.generateSingleScene',
    async (item: ResourceTreeItem) => {
      if (!providerManager || !sceneManager) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      if (!item || (item.resourceType !== 'scene' && item.resourceType !== 'sceneMarkdown')) {
        vscode.window.showErrorMessage('请选择场景项');
        return;
      }

      // 从 ResourceTreeItem 中提取 sceneId
      // 优先使用 resourcePath，如果没有则使用 relatedPaths 中的 markdown
      const scenePath = item.resourcePath || item.relatedPaths?.markdown;
      if (!scenePath) {
        vscode.window.showErrorMessage('无法获取场景路径');
        return;
      }

      // 从文件路径提取 sceneId（文件名，去掉扩展名）
      const sceneId = path.basename(scenePath, path.extname(scenePath));
      
      if (!configManager) {
        vscode.window.showErrorMessage('配置管理器未初始化');
        return;
      }
      await generateSingleSceneCommand(sceneId, providerManager, sceneManager, configManager);
      
      // 刷新资源树
      resourceTreeProvider?.refresh();
    }
  );

  // 注意：composeFirstFrames 命令已合并到 generateFirstFrames，保留此命令以兼容旧版本
  const composeFirstFramesCommand = vscode.commands.registerCommand('vibevideo.composeFirstFrames', async () => {
    if (!providerManager || !subjectManager || !resourceTreeProvider) {
      vscode.window.showErrorMessage('请先打开一个工作区文件夹');
      return;
    }
    if (!configManager) {
      vscode.window.showErrorMessage('配置管理器未初始化');
      return;
    }
    // 使用统一的生成函数
    await generateAllFirstFrames(providerManager, subjectManager, resourceTreeProvider, configManager, sceneManager);
  });

  const composeSingleFirstFrameCommand = vscode.commands.registerCommand(
    'vibevideo.composeStoryboardFirstFrame',
    async (item: ResourceTreeItem) => {
      if (!providerManager || !subjectManager || !resourceTreeProvider) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      if (!item?.resourcePath) {
        vscode.window.showErrorMessage('无法获取首帧路径');
        return;
      }

      // 从首帧描述（markdown）路径推导分镜路径
      const storyboardPath = await resourceTreeProvider.getStoryboardPathFromFirstFrame(item.resourcePath);
      if (!storyboardPath) {
        vscode.window.showErrorMessage('未找到对应的分镜脚本，命名需与首帧文件一致。');
        return;
      }

      if (!configManager) {
        vscode.window.showErrorMessage('配置管理器未初始化');
        return;
      }
      // 使用统一的生成函数
      await generateFirstFrameForStoryboard(
        storyboardPath,
        providerManager,
        subjectManager,
        resourceTreeProvider,
        configManager,
        sceneManager
      );
    }
  );

  // ===== 视频生成命令 =====
  
  const generateVideosCommand = vscode.commands.registerCommand('vibevideo.generateVideos', async () => {
    if (!providerManager || !resourceTreeProvider) {
      return;
    }
    await generateAllVideos(providerManager, resourceTreeProvider, subjectManager, sceneManager);
  });

  const generateFirstFramesCommand = vscode.commands.registerCommand('vibevideo.generateFirstFrames', async () => {
    if (!providerManager || !subjectManager || !resourceTreeProvider) {
      vscode.window.showErrorMessage('请先打开一个工作区文件夹');
      return;
    }
    if (!configManager) {
      vscode.window.showErrorMessage('配置管理器未初始化');
      return;
    }
    await generateAllFirstFrames(providerManager, subjectManager, resourceTreeProvider, configManager, sceneManager);
  });

  const openFirstFrameResourceCommand = vscode.commands.registerCommand(
    'vibevideo.openFirstFrameResource',
    async (item: ResourceTreeItem) => {
      if (!item) {
        return;
      }

      const paths: Array<{ path: string; isMarkdown: boolean }> = [];
      const primary = item.resourcePath;
      if (primary) {
        paths.push({ path: primary, isMarkdown: primary.toLowerCase().endsWith('.md') });
      }
      const markdownPath = item.relatedPaths?.markdown;
      if (markdownPath && markdownPath !== primary) {
        paths.unshift({ path: markdownPath, isMarkdown: true });
      }
      const imagePath = item.relatedPaths?.image;
      if (imagePath && imagePath !== primary) {
        paths.push({ path: imagePath, isMarkdown: imagePath.toLowerCase().endsWith('.md') });
      }

      const opened = new Set<string>();
      for (const entry of paths) {
        if (opened.has(entry.path)) {
          continue;
        }
        opened.add(entry.path);
        const uri = vscode.Uri.file(entry.path);
        if (entry.isMarkdown) {
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, { preview: false });
        } else {
          await vscode.commands.executeCommand('vscode.open', uri);
        }
      }
    }
  );

  // 复制首帧图片到下一帧
  const copyFirstFrameToNextCommand = vscode.commands.registerCommand(
    'vibevideo.copyFirstFrameToNext',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择首帧图片');
        return;
      }

      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 检查是否是首帧图片类型
      if (item.resourceType !== 'firstFrameImage') {
        vscode.window.showErrorMessage('只能对首帧图片执行此操作');
        return;
      }

      try {
        if (!resourceTreeProvider) {
          vscode.window.showErrorMessage('ResourceTreeProvider 未初始化');
          return;
        }

        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
          vscode.window.showErrorMessage('无法获取工作区路径');
          return;
        }

        // 从当前首帧图片路径提取分镜ID
        const currentFileName = path.basename(resourcePath, path.extname(resourcePath));
        // 去掉 .o-n 后缀（如果有）
        const baseName = currentFileName.replace(/\.o-\d+$/, '');
        // 去掉 -first-frame 后缀
        const storyboardId = baseName.replace(/-first-frame$/i, '');

        // 获取所有分镜列表
        const storyboards = await resourceTreeProvider.getAllStoryboards();
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

        // 复制当前图片到下一帧路径
        await copyFile(resourcePath, nextFramePath);

        // 刷新资源树
        resourceTreeProvider?.refresh();

        vscode.window.showInformationMessage(`已复制到下一帧: ${nextFrameFileName}`);
      } catch (error: any) {
        console.error('复制到下一帧失败:', error);
        vscode.window.showErrorMessage(`复制到下一帧失败: ${error.message || error}`);
      }
    }
  );

  const openVideoClipCommand = vscode.commands.registerCommand(
    'vibevideo.openVideoClip',
    async (resourcePath: string) => {
      if (!resourcePath) {
        return;
      }

      // 打开视频文件
      const uri = vscode.Uri.file(resourcePath);
      await vscode.commands.executeCommand('vscode.open', uri);

      // 显示提示信息
      vscode.window.showInformationMessage(
        '提示：如果视频没有声音，请使用系统默认播放器或其他播放器打开视频文件。',
        '知道了'
      );
    }
  );

  const extractLastFrameToNextCommand = vscode.commands.registerCommand(
    'vibevideo.extractLastFrameToNext',
    async (item: ResourceTreeItem) => {
      if (!resourceTreeProvider) {
        vscode.window.showErrorMessage('ResourceTreeProvider 未初始化');
        return;
      }
      await extractLastFrameToNext(item, context, resourceTreeProvider);
    }
  );

  const generateSingleVideoCommand = vscode.commands.registerCommand(
    'vibevideo.generateSingleVideo',
    async (item: ResourceTreeItem) => {
      if (!providerManager || !resourceTreeProvider) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      
      // 支持从分镜脚本生成视频
      if (item && item.resourceType === 'storyboard' && item.resourcePath) {
        const storyboardPath = item.resourcePath;
        const parser = new StoryboardParser();
        
        try {
          const storyboard = await parser.parseMarkdown(storyboardPath);
          
          if (!storyboard.description || storyboard.description.length < 20) {
            vscode.window.showErrorMessage(
              `分镜描述太短或为空。请编辑 ${storyboardPath} 添加详细描述。`
            );
            return;
          }

          const workspaceRoot = getWorkspaceRoot();
          if (!workspaceRoot) {
            vscode.window.showErrorMessage('无法获取工作区路径');
            return;
          }

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
                if (!providerManager) {
                  vscode.window.showErrorMessage('ProviderManager 未初始化');
                  return;
                }
                const provider = await providerManager.getProvider();
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
              resourceTreeProvider?.refresh();
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(`生成视频失败: ${error}`);
        }
        return;
      }
      
      // 兼容旧的方式：从视频片段生成（保留向后兼容）
      if (!item || item.resourceType !== 'clip') {
        vscode.window.showErrorMessage('请选择分镜脚本项或视频片段项');
        return;
      }
      if (!item.resourcePath) {
        vscode.window.showErrorMessage('无法获取资源路径');
        return;
      }

      await generateSingleVideoFromClip(item.resourcePath, providerManager, resourceTreeProvider, subjectManager, sceneManager);
    }
  );

  const generateVideoFromFirstLastFrameCommand = vscode.commands.registerCommand(
    'vibevideo.generateVideoFromFirstLastFrame',
    async (item: ResourceTreeItem) => {
      if (!providerManager || !resourceTreeProvider) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      if (!item || item.resourceType !== 'storyboard') {
        vscode.window.showErrorMessage('请选择分镜脚本项');
        return;
      }
      if (!item.resourcePath) {
        vscode.window.showErrorMessage('无法获取分镜脚本路径');
        return;
      }

      // 直接使用分镜脚本路径
      await generateVideoFromFirstLastFrameByStoryboard(item.resourcePath, providerManager, resourceTreeProvider);
    }
  );

  const generateAllVideosFromFirstLastFrameCommand = vscode.commands.registerCommand(
    'vibevideo.generateAllVideosFromFirstLastFrame',
    async () => {
      if (!providerManager || !resourceTreeProvider) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      await generateAllVideosFromFirstLastFrame(providerManager, resourceTreeProvider);
    }
  );

  const openSubjectResourceCommand = vscode.commands.registerCommand(
    'vibevideo.openSubjectResource',
    async (item: ResourceTreeItem) => {
      if (!item) {
        return;
      }

      const paths: Array<{ path: string; isMarkdown: boolean }> = [];
      const primary = item.resourcePath;
      if (primary) {
        paths.push({ path: primary, isMarkdown: primary.toLowerCase().endsWith('.md') });
      }
      const markdownPath = item.relatedPaths?.markdown;
      if (markdownPath && markdownPath !== primary) {
        paths.unshift({ path: markdownPath, isMarkdown: true });
      }
      const imagePath = item.relatedPaths?.image;
      if (imagePath && imagePath !== primary) {
        paths.push({ path: imagePath, isMarkdown: false });
      }

      const opened = new Set<string>();
      for (const entry of paths) {
        if (opened.has(entry.path)) {
          continue;
        }
        opened.add(entry.path);
        const uri = vscode.Uri.file(entry.path);
        if (entry.isMarkdown) {
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, { preview: false });
        } else {
          await vscode.commands.executeCommand('vscode.open', uri);
        }
      }
    }
  );

  const openSceneResourceCommand = vscode.commands.registerCommand(
    'vibevideo.openSceneResource',
    async (item: ResourceTreeItem) => {
      if (!item) {
        return;
      }

      const paths: Array<{ path: string; isMarkdown: boolean }> = [];
      const primary = item.resourcePath;
      if (primary) {
        paths.push({ path: primary, isMarkdown: primary.toLowerCase().endsWith('.md') });
      }
      const markdownPath = item.relatedPaths?.markdown;
      if (markdownPath && markdownPath !== primary) {
        paths.unshift({ path: markdownPath, isMarkdown: true });
      }
      const imagePath = item.relatedPaths?.image;
      if (imagePath && imagePath !== primary) {
        paths.push({ path: imagePath, isMarkdown: false });
      }

      const opened = new Set<string>();
      for (const entry of paths) {
        if (opened.has(entry.path)) {
          continue;
        }
        opened.add(entry.path);
        const uri = vscode.Uri.file(entry.path);
        if (entry.isMarkdown) {
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, { preview: false });
        } else {
          await vscode.commands.executeCommand('vscode.open', uri);
        }
      }
    }
  );

  const addReferenceImageCommand = vscode.commands.registerCommand(
    'vibevideo.addReferenceImage',
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }

      // 打开文件选择器，只允许选择图片文件
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        openLabel: '添加参考图',
        filters: {
          '图片文件': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
        }
      });

      if (!fileUris || fileUris.length === 0) {
        return;
      }

      const refImgDir = path.join(workspaceRoot, 'ref-img');
      await ensureDir(refImgDir);

      let successCount = 0;
      let errorCount = 0;

      for (const uri of fileUris) {
        try {
          const sourcePath = uri.fsPath;
          const fileName = path.basename(sourcePath);
          const targetPath = path.join(refImgDir, fileName);

          // 如果文件已存在，询问是否覆盖
          if (await fileExists(targetPath)) {
            const result = await vscode.window.showWarningMessage(
              `文件 ${fileName} 已存在，是否覆盖？`,
              '覆盖',
              '跳过',
              '取消'
            );

            if (result === '取消') {
              return; // 取消整个操作
            } else if (result === '跳过') {
              continue; // 跳过当前文件
            }
          }

          // 复制文件
          await copyFile(sourcePath, targetPath);
          successCount++;
        } catch (error) {
          console.error('添加参考图时出错:', error);
          errorCount++;
        }
      }

      // 刷新视图
      if (successCount > 0) {
        resourceTreeProvider?.refresh();
        if (errorCount > 0) {
          vscode.window.showInformationMessage(`已添加 ${successCount} 个参考图，${errorCount} 个失败`);
        } else {
          vscode.window.showInformationMessage(`已添加 ${successCount} 个参考图`);
        }
      }
    }
  );

  const copyRelativePathCommand = vscode.commands.registerCommand(
    'vibevideo.copyRelativePath',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择要复制路径的资源项');
        return;
      }

      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }

      // 获取资源路径
      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 计算相对路径
      const relativePath = path.relative(workspaceRoot, resourcePath);
      // 统一使用正斜杠作为路径分隔符（跨平台兼容）
      const normalizedPath = relativePath.split(path.sep).join('/');

      // 复制到剪贴板
      await vscode.env.clipboard.writeText(normalizedPath);
      vscode.window.showInformationMessage(`已复制相对路径: ${normalizedPath}`);
    }
  );

  const renameResourceCommand = vscode.commands.registerCommand(
    'vibevideo.renameResource',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择要重命名的资源项');
        return;
      }

      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }

      // 获取资源路径
      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 获取当前文件名和扩展名
      const currentFileName = path.basename(resourcePath);
      const currentExt = path.extname(currentFileName);
      const currentNameWithoutExt = path.basename(currentFileName, currentExt);
      const currentDir = path.dirname(resourcePath);

      // 提示用户输入新文件名
      const newFileName = await vscode.window.showInputBox({
        prompt: '请输入新文件名',
        value: currentFileName,
        valueSelection: [0, currentNameWithoutExt.length],
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return '文件名不能为空';
          }
          // 检查是否包含非法字符
          const invalidChars = /[<>:"/\\|?*]/;
          if (invalidChars.test(value)) {
            return '文件名包含非法字符';
          }
          // 检查扩展名是否匹配
          const newExt = path.extname(value);
          if (newExt !== currentExt) {
            return `文件扩展名必须为 ${currentExt}`;
          }
          return null;
        }
      });

      if (!newFileName || newFileName === currentFileName) {
        return; // 用户取消或没有更改
      }

      const newPath = path.join(currentDir, newFileName);

      // 检查新文件名是否已存在
      if (await fileExists(newPath)) {
        const result = await vscode.window.showWarningMessage(
          `文件 ${newFileName} 已存在，是否覆盖？`,
          '覆盖',
          '取消'
        );
        if (result !== '覆盖') {
          return;
        }
      }

      try {
        // 重命名文件
        await renameFile(resourcePath, newPath);
        
        // 刷新资源树
        resourceTreeProvider?.refresh();
        
        vscode.window.showInformationMessage(`已重命名为: ${newFileName}`);
      } catch (error) {
        vscode.window.showErrorMessage(`重命名失败: ${error}`);
      }
    }
  );

  const revealInExplorerCommand = vscode.commands.registerCommand(
    'vibevideo.revealInExplorer',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择要在资源管理器中打开的资源项');
        return;
      }

      // 获取资源路径
      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      try {
        // 在操作系统的文件管理器中显示文件
        const uri = vscode.Uri.file(resourcePath);
        await vscode.commands.executeCommand('revealFileInOS', uri);
      } catch (error) {
        vscode.window.showErrorMessage(`在资源管理器中打开失败: ${error}`);
      }
    }
  );

  // 判断资源项是否为图片类型
  const isImageResource = (item: ResourceTreeItem): boolean => {
    const imageTypes = [
      'firstFrameImage',
      'firstFrameImageAlternative',
      'subjectImage',
      'subjectImageAlternative',
      'sceneImage',
      'sceneImageAlternative',
      'referenceImage'
    ];
    return item.resourceType ? imageTypes.includes(item.resourceType) : false;
  };

  // 判断资源项是否为视频类型
  const isVideoResource = (item: ResourceTreeItem): boolean => {
    const videoTypes = ['clip', 'outputVideo'];
    return item.resourceType ? videoTypes.includes(item.resourceType) : false;
  };

  // 判断资源项是否为 Markdown 文件类型
  const isMarkdownResource = (item: ResourceTreeItem): boolean => {
    const markdownTypes = ['firstFrameMarkdown', 'subjectMarkdown', 'sceneMarkdown', 'script', 'storyboard'];
    return item.resourceType ? markdownTypes.includes(item.resourceType) : false;
  };

  // 判断资源项是否为可复制的文件类型（图片、视频或 Markdown）
  const isCopyableResource = (item: ResourceTreeItem): boolean => {
    return isImageResource(item) || isVideoResource(item) || isMarkdownResource(item);
  };

  const deleteResourceCommand = vscode.commands.registerCommand(
    'vibevideo.deleteResource',
    async (items: ResourceTreeItem | ResourceTreeItem[]) => {
      // 统一转换为数组处理
      const itemsArray = Array.isArray(items) ? items : [items];
      
      if (itemsArray.length === 0) {
        vscode.window.showErrorMessage('请选择要删除的资源项');
        return;
      }

      // 过滤出图片类型的资源（多选时只允许删除图片）
      const imageItems = itemsArray.filter(item => {
        if (!item || !item.resourcePath) {
          return false;
        }
        // 如果多选（数组长度 > 1），只允许删除图片类型
        if (itemsArray.length > 1) {
          return isImageResource(item);
        }
        // 单选时，允许删除所有类型（保持原有行为）
        return true;
      });

      if (imageItems.length === 0) {
        if (itemsArray.length > 1) {
          vscode.window.showWarningMessage('多选删除仅支持图片类型的资源');
        } else {
          vscode.window.showErrorMessage('该资源项没有文件路径');
        }
        return;
      }

      // 如果多选时过滤掉了部分项，提示用户
      if (itemsArray.length > 1 && imageItems.length < itemsArray.length) {
        const filteredCount = itemsArray.length - imageItems.length;
        vscode.window.showWarningMessage(
          `已过滤掉 ${filteredCount} 个非图片资源，将删除 ${imageItems.length} 个图片文件`
        );
      }

      // 获取所有要删除的文件名
      const fileNames = imageItems.map(item => path.basename(item.resourcePath!));
      const fileCount = fileNames.length;

      // 确认删除
      const confirmMessage = fileCount === 1
        ? `确定要删除「${fileNames[0]}」吗？此操作不可撤销。`
        : `确定要删除 ${fileCount} 个图片文件吗？此操作不可撤销。\n\n${fileNames.slice(0, 5).join('\n')}${fileCount > 5 ? `\n... 还有 ${fileCount - 5} 个文件` : ''}`;

      const confirm = await vscode.window.showWarningMessage(
        confirmMessage,
        '删除',
        '取消'
      );

      if (confirm !== '删除') {
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const failedFiles: string[] = [];

      // 批量删除文件
      for (const item of imageItems) {
        const resourcePath = item.resourcePath!;
        const fileName = path.basename(resourcePath);

        try {
          // 检查文件是否存在
          if (!(await fileExists(resourcePath))) {
            failCount++;
            failedFiles.push(fileName);
            continue;
          }

          // 删除文件
          await deleteFile(resourcePath);
          successCount++;
        } catch (error: any) {
          failCount++;
          failedFiles.push(fileName);
          console.error(`删除文件失败: ${fileName}`, error);
        }
      }

      // 刷新资源树
      if (successCount > 0) {
        resourceTreeProvider?.refresh();
      }

      // 显示结果消息
      if (successCount > 0 && failCount === 0) {
        const message = fileCount === 1
          ? `已删除: ${fileNames[0]}`
          : `已删除 ${successCount} 个文件`;
        vscode.window.showInformationMessage(message);
      } else if (successCount > 0 && failCount > 0) {
        vscode.window.showWarningMessage(
          `已删除 ${successCount} 个文件，${failCount} 个文件删除失败${failedFiles.length > 0 ? `: ${failedFiles.join(', ')}` : ''}`
        );
      } else {
        vscode.window.showErrorMessage(
          `删除失败${failedFiles.length > 0 ? `: ${failedFiles.join(', ')}` : ''}`
        );
      }
    }
  );

  // 不选中图片：添加 .o-n 后缀
  const deselectImageCommand = vscode.commands.registerCommand(
    'vibevideo.deselectImage',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择图片项');
        return;
      }

      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 检查是否是图片类型（包括参考图）
      const allowedTypes = [
        'firstFrameImage',
        'subjectImage',
        'sceneImage',
        'referenceImage'
      ];
      if (!item.resourceType || !allowedTypes.includes(item.resourceType)) {
        vscode.window.showErrorMessage('只能对图片文件执行此操作');
        return;
      }

      try {
        const currentDir = path.dirname(resourcePath);
        const currentFileName = path.basename(resourcePath);
        const ext = path.extname(currentFileName);
        const baseName = path.basename(currentFileName, ext);

        // 检查文件名是否已经有 .o- 后缀
        if (currentFileName.includes('.o-')) {
          vscode.window.showWarningMessage('该文件已经是备选文件，无需再次标记');
          return;
        }

        // 查找当前目录中已有的 .o-n 文件，找到最大的 n 和最小的 n
        const files = await fs.promises.readdir(currentDir);
        let maxN = 0;
        let minN = Infinity;
        // 转义 baseName 和 ext 中的特殊字符，用于正则表达式
        const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedExt = ext.replace('.', '\\.');
        const alternativePattern = new RegExp(`^${escapedBaseName}\\.o-(\\d+)${escapedExt}$`);
        const alternativeFiles: Array<{ n: number; fileName: string; path: string }> = [];
        
        console.log(`[不选中] 当前目录: ${currentDir}`);
        console.log(`[不选中] baseName: ${baseName}, ext: ${ext}`);
        console.log(`[不选中] 正则表达式: ${alternativePattern}`);
        console.log(`[不选中] 目录中的文件:`, files);
        
        for (const file of files) {
          const match = file.match(alternativePattern);
          console.log(`[不选中] 检查文件: ${file}, 匹配结果:`, match);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxN) {
              maxN = n;
            }
            if (n < minN) {
              minN = n;
            }
            alternativeFiles.push({
              n,
              fileName: file,
              path: path.join(currentDir, file)
            });
          }
        }

        // 生成新的文件名（n 自增），如果文件已存在则继续递增
        let newN = maxN + 1;
        let newFileName = `${baseName}.o-${newN}${ext}`;
        let newPath = path.join(currentDir, newFileName);
        
        // 如果新文件名已存在，继续递增直到找到不存在的文件名
        while (await fileExists(newPath)) {
          newN++;
          newFileName = `${baseName}.o-${newN}${ext}`;
          newPath = path.join(currentDir, newFileName);
        }

        // 1. 将当前文件重命名为备选文件
        await renameFile(resourcePath, newPath);
        
        // 2. 如果有备选文件，选择最小的 n（如 .o-1）提升为选中状态
        const originalPath = path.join(currentDir, `${baseName}${ext}`);
        
        console.log(`[不选中] 备选文件数量: ${alternativeFiles.length}`);
        console.log(`[不选中] 备选文件列表:`, alternativeFiles.map(f => f.fileName));
        
        if (alternativeFiles.length > 0) {
          // 找到最小的 n
          const smallestAlternative = alternativeFiles.reduce((prev, curr) => 
            curr.n < prev.n ? curr : prev
          );
          
          console.log(`[不选中] 最小的备选文件: ${smallestAlternative.fileName}, n=${smallestAlternative.n}`);
          console.log(`[不选中] 检查原文件是否存在: ${originalPath}, 存在=${await fileExists(originalPath)}`);
          
          // 检查原文件名是否已存在（理论上不应该存在，因为刚被重命名）
          if (await fileExists(originalPath)) {
            // 如果原文件名已存在，说明有冲突，跳过提升操作
            console.warn(`原文件名 ${baseName}${ext} 已存在，跳过提升备选文件`);
            vscode.window.showInformationMessage(`已标记为备选: ${newFileName}`);
          } else {
            // 检查最小的备选文件是否存在
            if (await fileExists(smallestAlternative.path)) {
              // 将最小的备选文件提升为选中状态
              await renameFile(smallestAlternative.path, originalPath);
              vscode.window.showInformationMessage(`已标记为备选: ${newFileName}，已选中: ${smallestAlternative.fileName} -> ${baseName}${ext}`);
            } else {
              console.warn(`最小的备选文件不存在: ${smallestAlternative.path}`);
              vscode.window.showWarningMessage(`备选文件 ${smallestAlternative.fileName} 不存在`);
            }
          }
        } else {
          console.log(`[不选中] 没有备选文件，跳过提升操作`);
          vscode.window.showInformationMessage(`已标记为备选: ${newFileName}`);
        }
        
        // 刷新资源树
        resourceTreeProvider?.refresh();
      } catch (error: any) {
        vscode.window.showErrorMessage(`操作失败: ${error.message || error}`);
      }
    }
  );

  // 选中图片：去掉 .o-n 或 -edited 后缀
  const selectImageCommand = vscode.commands.registerCommand(
    'vibevideo.selectImage',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择图片项');
        return;
      }

      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 检查是否是图片类型（包括备选图片和编辑后的图片）
      // 通过 contextValue 判断，因为 referenceImage 类型也可能有备选状态
      const allowedContextValues = [
        'firstFrameImage',
        'firstFrameImageAlternative',
        'subjectImage',
        'subjectImageAlternative',
        'sceneImage',
        'sceneImageAlternative',
        'referenceImage',
        'referenceImageAlternative'
      ];
      if (!item.contextValue || !allowedContextValues.includes(item.contextValue)) {
        vscode.window.showErrorMessage('只能对图片文件执行此操作');
        return;
      }

      try {
        const currentDir = path.dirname(resourcePath);
        const currentFileName = path.basename(resourcePath);

        let baseName: string;
        let ext: string;
        let originalFileName: string;
        let originalPath: string;

        // 检查文件名格式：支持 .o-n、-edited 和 - 副本 三种格式
        // 格式1: 文件名.o-n.扩展名 (例如: 01-opening-first-frame.o-1.png)
        const alternativeMatch = currentFileName.match(/^(.+)\.o-(\d+)(\.\w+)$/);
        // 格式2: 文件名-edited.扩展名 或 文件名-edited-n.扩展名 (例如: 01-opening-first-frame-edited.png)
        const editedMatch = currentFileName.match(/^(.+)-edited(?:-(\d+))?(\.\w+)$/);
        // 格式3: 文件名 - 副本.扩展名 或 文件名 - 副本 (n).扩展名 (例如: name - 副本.png 或 name - 副本 (2).png)
        const copyMatch = currentFileName.match(/^(.+) - 副本(?: \((\d+)\))?(\.\w+)$/);

        if (alternativeMatch) {
          // 处理 .o-n 格式
          baseName = alternativeMatch[1];
          ext = alternativeMatch[3];
          originalFileName = baseName + ext;
          originalPath = path.join(currentDir, originalFileName);
        } else if (editedMatch) {
          // 处理 -edited 格式
          baseName = editedMatch[1];
          ext = editedMatch[3];
          originalFileName = baseName + ext;
          originalPath = path.join(currentDir, originalFileName);
        } else if (copyMatch) {
          // 处理 - 副本 格式
          baseName = copyMatch[1];
          ext = copyMatch[3];
          originalFileName = baseName + ext;
          originalPath = path.join(currentDir, originalFileName);
        } else {
          vscode.window.showWarningMessage('该文件不是备选文件、编辑后的文件或副本文件');
          return;
        }

        // 查找当前目录中已有的 .o-n 文件，找到最大的 n（排除当前要选中的文件）
        const files = await fs.promises.readdir(currentDir);
        let maxN = 0;
        const alternativePattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.o-(\\d+)\\${ext.replace('.', '\\.')}$`);
        const currentFileNameOnly = path.basename(resourcePath);
        
        for (const file of files) {
          // 排除当前要选中的文件（通过文件名比较）
          if (file === currentFileNameOnly) {
            continue;
          }
          
          const match = file.match(alternativePattern);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxN) {
              maxN = n;
            }
          }
        }

        // 如果原文件名已存在，先将其重命名为备选文件（n 自增）
        if (await fileExists(originalPath)) {
          // 生成新的文件名（n 自增），如果文件已存在则继续递增
          let newN = maxN + 1;
          let originalAsAlternativePath = path.join(currentDir, `${baseName}.o-${newN}${ext}`);
          
          // 如果新文件名已存在，继续递增直到找到不存在的文件名
          while (await fileExists(originalAsAlternativePath)) {
            newN++;
            originalAsAlternativePath = path.join(currentDir, `${baseName}.o-${newN}${ext}`);
          }
          
          // 将原文件重命名为备选文件
          await renameFile(originalPath, originalAsAlternativePath);
        }

        // 将当前备选文件或编辑后的文件重命名为原文件名（选中状态）
        await renameFile(resourcePath, originalPath);
        
        // 刷新资源树
        resourceTreeProvider?.refresh();
        
        // 打开选中的图片
        const uri = vscode.Uri.file(originalPath);
        await vscode.commands.executeCommand('vscode.open', uri);
        
        vscode.window.showInformationMessage(`已选中: ${originalFileName}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`操作失败: ${error.message || error}`);
      }
    }
  );

  // 不选中视频：将视频文件标记为备选
  const deselectVideoCommand = vscode.commands.registerCommand(
    'vibevideo.deselectVideo',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择视频项');
        return;
      }

      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 检查是否是视频类型（通过 contextValue 判断，因为可能有备选状态）
      const allowedContextValues = ['clip', 'outputVideo'];
      if (!item.contextValue || !allowedContextValues.includes(item.contextValue)) {
        vscode.window.showErrorMessage('只能对视频文件执行此操作');
        return;
      }

      try {
        const currentDir = path.dirname(resourcePath);
        const currentFileName = path.basename(resourcePath);
        const ext = path.extname(currentFileName);
        const baseName = path.basename(currentFileName, ext);

        // 检查文件名是否已经有 .o- 后缀
        if (currentFileName.includes('.o-')) {
          vscode.window.showWarningMessage('该文件已经是备选文件，无需再次标记');
          return;
        }

        // 查找当前目录中已有的 .o-n 文件，找到最大的 n 和最小的 n
        const files = await fs.promises.readdir(currentDir);
        let maxN = 0;
        let minN = Infinity;
        // 转义 baseName 和 ext 中的特殊字符，用于正则表达式
        const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedExt = ext.replace('.', '\\.');
        const alternativePattern = new RegExp(`^${escapedBaseName}\\.o-(\\d+)${escapedExt}$`);
        const alternativeFiles: Array<{ n: number; fileName: string; path: string }> = [];
        
        for (const file of files) {
          const match = file.match(alternativePattern);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxN) {
              maxN = n;
            }
            if (n < minN) {
              minN = n;
            }
            alternativeFiles.push({
              n,
              fileName: file,
              path: path.join(currentDir, file)
            });
          }
        }

        // 生成新的文件名（n 自增），如果文件已存在则继续递增
        let newN = maxN + 1;
        let newFileName = `${baseName}.o-${newN}${ext}`;
        let newPath = path.join(currentDir, newFileName);
        
        // 如果新文件名已存在，继续递增直到找到不存在的文件名
        while (await fileExists(newPath)) {
          newN++;
          newFileName = `${baseName}.o-${newN}${ext}`;
          newPath = path.join(currentDir, newFileName);
        }

        // 1. 将当前文件重命名为备选文件
        await renameFile(resourcePath, newPath);
        
        // 2. 如果有备选文件，选择最小的 n（如 .o-1）提升为选中状态
        const originalPath = path.join(currentDir, `${baseName}${ext}`);
        
        if (alternativeFiles.length > 0) {
          // 找到最小的 n
          const smallestAlternative = alternativeFiles.reduce((prev, curr) => 
            curr.n < prev.n ? curr : prev
          );
          
          // 检查原文件名是否已存在（理论上不应该存在，因为刚被重命名）
          if (await fileExists(originalPath)) {
            // 如果原文件名已存在，说明有冲突，跳过提升操作
            vscode.window.showInformationMessage(`已标记为备选: ${newFileName}`);
          } else {
            // 检查最小的备选文件是否存在
            if (await fileExists(smallestAlternative.path)) {
              // 将最小的备选文件提升为选中状态
              await renameFile(smallestAlternative.path, originalPath);
              vscode.window.showInformationMessage(`已标记为备选: ${newFileName}，已选中: ${smallestAlternative.fileName} -> ${baseName}${ext}`);
            } else {
              vscode.window.showWarningMessage(`备选文件 ${smallestAlternative.fileName} 不存在`);
            }
          }
        } else {
          vscode.window.showInformationMessage(`已标记为备选: ${newFileName}`);
        }
        
        // 刷新资源树
        resourceTreeProvider?.refresh();
      } catch (error: any) {
        vscode.window.showErrorMessage(`操作失败: ${error.message || error}`);
      }
    }
  );

  // 选中视频：去掉 .o-n 或 -edited 后缀
  const selectVideoCommand = vscode.commands.registerCommand(
    'vibevideo.selectVideo',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择视频项');
        return;
      }

      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 检查是否是视频类型（包括备选视频，通过 contextValue 判断）
      const allowedContextValues = ['clip', 'clipAlternative', 'outputVideo', 'outputVideoAlternative'];
      if (!item.contextValue || !allowedContextValues.includes(item.contextValue)) {
        vscode.window.showErrorMessage('只能对视频文件执行此操作');
        return;
      }

      try {
        const currentDir = path.dirname(resourcePath);
        const currentFileName = path.basename(resourcePath);

        let baseName: string;
        let ext: string;
        let originalFileName: string;
        let originalPath: string;

        // 检查文件名格式：支持 .o-n、-edited 和 - 副本 三种格式
        // 格式1: 文件名.o-n.扩展名 (例如: 01-opening.mp4.o-1.mp4)
        const alternativeMatch = currentFileName.match(/^(.+)\.o-(\d+)(\.\w+)$/);
        // 格式2: 文件名-edited.扩展名 或 文件名-edited-n.扩展名 (例如: 01-opening-edited.mp4)
        const editedMatch = currentFileName.match(/^(.+)-edited(?:-(\d+))?(\.\w+)$/);
        // 格式3: 文件名 - 副本.扩展名 或 文件名 - 副本 (n).扩展名 (例如: name - 副本.mp4 或 name - 副本 (2).mp4)
        const copyMatch = currentFileName.match(/^(.+) - 副本(?: \((\d+)\))?(\.\w+)$/);

        if (alternativeMatch) {
          // 处理 .o-n 格式
          baseName = alternativeMatch[1];
          ext = alternativeMatch[3];
          originalFileName = baseName + ext;
          originalPath = path.join(currentDir, originalFileName);
        } else if (editedMatch) {
          // 处理 -edited 格式
          baseName = editedMatch[1];
          ext = editedMatch[3];
          originalFileName = baseName + ext;
          originalPath = path.join(currentDir, originalFileName);
        } else if (copyMatch) {
          // 处理 - 副本 格式
          baseName = copyMatch[1];
          ext = copyMatch[3];
          originalFileName = baseName + ext;
          originalPath = path.join(currentDir, originalFileName);
        } else {
          vscode.window.showWarningMessage('该文件不是备选文件、编辑后的文件或副本文件');
          return;
        }

        // 查找当前目录中已有的 .o-n 文件，找到最大的 n（排除当前要选中的文件）
        const files = await fs.promises.readdir(currentDir);
        let maxN = 0;
        const alternativePattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.o-(\\d+)\\${ext.replace('.', '\\.')}$`);
        const currentFileNameOnly = path.basename(resourcePath);
        
        for (const file of files) {
          // 排除当前要选中的文件（通过文件名比较）
          if (file === currentFileNameOnly) {
            continue;
          }
          
          const match = file.match(alternativePattern);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxN) {
              maxN = n;
            }
          }
        }

        // 如果原文件名已存在，先将其重命名为备选文件（n 自增）
        if (await fileExists(originalPath)) {
          // 生成新的文件名（n 自增），如果文件已存在则继续递增
          let newN = maxN + 1;
          let originalAsAlternativePath = path.join(currentDir, `${baseName}.o-${newN}${ext}`);
          
          // 如果新文件名已存在，继续递增直到找到不存在的文件名
          while (await fileExists(originalAsAlternativePath)) {
            newN++;
            originalAsAlternativePath = path.join(currentDir, `${baseName}.o-${newN}${ext}`);
          }
          
          // 将原文件重命名为备选文件
          await renameFile(originalPath, originalAsAlternativePath);
        }

        // 将当前备选文件或编辑后的文件重命名为原文件名（选中状态）
        await renameFile(resourcePath, originalPath);
        
        // 刷新资源树
        resourceTreeProvider?.refresh();
        
        // 打开选中的视频
        const uri = vscode.Uri.file(originalPath);
        await vscode.commands.executeCommand('vibevideo.openVideoClip', originalPath);
        
        vscode.window.showInformationMessage(`已选中: ${originalFileName}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`操作失败: ${error.message || error}`);
      }
    }
  );

  // 图像编辑命令
  const editImageCommand = vscode.commands.registerCommand(
    'vibevideo.editImage',
    async (item: ResourceTreeItem) => {
      if (!providerManager) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      await editImage(item, providerManager);
    }
  );

  // 视频合成命令
  const composeVideoCommand = vscode.commands.registerCommand(
    'vibevideo.composeVideo',
    async () => {
      if (!resourceTreeProvider) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }
      await composeAllVideos(context, resourceTreeProvider);
    }
  );

  // 复制资源命令（支持图片和视频）
  const copyImageCommand = vscode.commands.registerCommand(
    'vibevideo.copyImage',
    async (item?: ResourceTreeItem) => {
      console.log('[Vibe Video] copyImageCommand called, item:', item);
      
      // 如果没有传入 item，尝试从树视图的选中项获取
      if (!item) {
        const selection = treeView.selection;
        console.log('[Vibe Video] treeView.selection:', selection);
        if (selection && selection.length > 0) {
          item = selection[0];
        }
      }

      if (!item) {
        vscode.window.showErrorMessage('请选择要复制的资源项');
        return;
      }

      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 检查是否是图片或视频类型
      if (!isCopyableResource(item)) {
        vscode.window.showErrorMessage('只能复制图片、视频或 Markdown 类型的资源');
        return;
      }

      // 检查文件是否存在
      if (!(await fileExists(resourcePath))) {
        vscode.window.showErrorMessage('文件不存在');
        return;
      }

      // 存储复制的文件路径
      copiedImagePath = resourcePath;
      const fileName = path.basename(resourcePath);
      let resourceType = '文件';
      if (isImageResource(item)) {
        resourceType = '图片';
      } else if (isVideoResource(item)) {
        resourceType = '视频';
      } else if (isMarkdownResource(item)) {
        resourceType = 'Markdown';
      }
      vscode.window.showInformationMessage(`已复制${resourceType}: ${fileName}`);
    }
  );

  // 获取目标目录（根据资源项类型）
  const getTargetDirectory = (item: ResourceTreeItem, workspaceRoot: string | undefined): string | undefined => {
    if (!workspaceRoot) {
      return undefined;
    }

    // 如果是目录节点（分组节点），根据 contextValue 或 label 确定目录
    if (!item.resourcePath) {
      const contextValue = item.contextValue;
      const label = item.label;

      if (contextValue === 'referenceImagesRoot' || label.startsWith('📸')) {
        return path.join(workspaceRoot, 'ref-img');
      } else if (contextValue === 'firstFramesRoot' || label.startsWith('🖼️')) {
        return path.join(workspaceRoot, 'first-frames');
      } else if (contextValue === 'subjectsRoot' || label.startsWith('🎭')) {
        return path.join(workspaceRoot, 'subjects');
      } else if (contextValue === 'scenesRoot' || label.startsWith('🌆')) {
        return path.join(workspaceRoot, 'scenes');
      } else if (contextValue === 'storyboardsRoot' || label.startsWith('📝')) {
        return path.join(workspaceRoot, 'storyboards');
      } else if (contextValue === 'clipsRoot' || label.startsWith('🎬')) {
        return path.join(workspaceRoot, 'video-clip');
      } else if (label.startsWith('🎥')) {
        return path.join(workspaceRoot, 'output');
      } else if (label.startsWith('📄')) {
        return workspaceRoot; // 剧本目录是项目根目录
      }
    } else {
      // 如果是文件节点，返回文件所在目录
      return path.dirname(item.resourcePath);
    }

    return undefined;
  };

  // 粘贴资源命令（支持图片和视频）
  const pasteImageCommand = vscode.commands.registerCommand(
    'vibevideo.pasteImage',
    async (item?: ResourceTreeItem) => {
      if (!copiedImagePath) {
        vscode.window.showWarningMessage('没有可粘贴的内容，请先复制一个文件');
        return;
      }

      // 如果没有传入 item，尝试从树视图的选中项获取
      if (!item) {
        const selection = treeView.selection;
        if (selection && selection.length > 0) {
          item = selection[0];
        }
      }

      if (!item) {
        vscode.window.showErrorMessage('请选择要粘贴到的目标位置');
        return;
      }

      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('请先打开一个工作区文件夹');
        return;
      }

      // 检查源文件是否存在
      if (!(await fileExists(copiedImagePath))) {
        vscode.window.showErrorMessage('复制的文件不存在');
        copiedImagePath = undefined;
        return;
      }

      // 判断源文件类型
      const sourceExt = path.extname(copiedImagePath).toLowerCase();
      const isSourceImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(sourceExt);
      const isSourceVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(sourceExt);
      const isSourceMarkdown = ['.md', '.markdown'].includes(sourceExt);

      if (!isSourceImage && !isSourceVideo && !isSourceMarkdown) {
        vscode.window.showErrorMessage('不支持的文件类型，只能粘贴图片、视频或 Markdown 文件');
        return;
      }

      // 获取目标目录
      const targetDir = getTargetDirectory(item, workspaceRoot);
      if (!targetDir) {
        vscode.window.showErrorMessage('无法确定目标目录');
        return;
      }

      // 如果是文件节点，检查目标类型是否匹配
      if (item.resourcePath) {
        const targetIsImage = isImageResource(item);
        const targetIsVideo = isVideoResource(item);
        const targetIsMarkdown = isMarkdownResource(item);
        
        // 如果目标既不是图片也不是视频也不是 Markdown，不允许粘贴
        if (!targetIsImage && !targetIsVideo && !targetIsMarkdown) {
          vscode.window.showErrorMessage('只能粘贴到图片、视频或 Markdown 类型的资源位置');
          return;
        }
        
        // 如果目标有明确的资源类型，检查是否匹配
        if (targetIsImage && !isSourceImage) {
          vscode.window.showErrorMessage('只能将图片粘贴到图片类型的资源位置或图片目录');
          return;
        }
        if (targetIsVideo && !isSourceVideo) {
          vscode.window.showErrorMessage('只能将视频粘贴到视频类型的资源位置或视频目录');
          return;
        }
        if (targetIsMarkdown && !isSourceMarkdown) {
          vscode.window.showErrorMessage('只能将 Markdown 文件粘贴到 Markdown 类型的资源位置或相应目录');
          return;
        }
      } else {
        // 如果是目录节点，检查目录类型是否匹配
        const contextValue = item.contextValue;
        const label = item.label;
        
        // 图片目录
        const isImageDir = contextValue === 'referenceImagesRoot' || 
                          contextValue === 'firstFramesRoot' || 
                          contextValue === 'subjectsRoot' || 
                          contextValue === 'scenesRoot' ||
                          label.startsWith('📸') || 
                          label.startsWith('🖼️') || 
                          label.startsWith('🎭') || 
                          label.startsWith('🌆');
        
        // 视频目录
        const isVideoDir = contextValue === 'clipsRoot' || 
                          label.startsWith('🎬') || 
                          label.startsWith('🎥');
        
        // Markdown 目录（分镜脚本、剧本等）
        const isMarkdownDir = contextValue === 'storyboardsRoot' || 
                              label.startsWith('📝') || 
                              label.startsWith('📄');
        
        if (isImageDir && !isSourceImage) {
          vscode.window.showErrorMessage('只能将图片粘贴到图片目录');
          return;
        }
        if (isVideoDir && !isSourceVideo) {
          vscode.window.showErrorMessage('只能将视频粘贴到视频目录');
          return;
        }
        if (isMarkdownDir && !isSourceMarkdown) {
          vscode.window.showErrorMessage('只能将 Markdown 文件粘贴到 Markdown 目录');
          return;
        }
      }

      try {
        const sourceFileName = path.basename(copiedImagePath);
        
        // 生成唯一的文件名
        const uniqueFileName = await generateUniqueFileName(targetDir, sourceFileName);
        const targetPath = path.join(targetDir, uniqueFileName);

        // 确保目标目录存在
        await ensureDir(targetDir);

        // 复制文件
        await copyFile(copiedImagePath, targetPath);

        // 刷新资源树
        resourceTreeProvider?.refresh();

        const resourceType = isSourceImage ? '图片' : '视频';
        vscode.window.showInformationMessage(`已粘贴${resourceType}: ${uniqueFileName}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`粘贴失败: ${error.message || error}`);
      }
    }
  );

  // 注册所有命令和视图
  context.subscriptions.push(
    treeView,
    initCommand,
    refreshCommand,
    statsCommand,
    checkCommand,
    configAPICommand,
    showConfigCommand,
    generateSubjectsCommand,
    generateSingleSubjectCommandHandler,
    generateScenesCommand,
    generateSingleSceneCommandHandler,
    composeFirstFramesCommand,
    composeSingleFirstFrameCommand,
    generateVideosCommand,
    generateFirstFramesCommand,
    generateSingleVideoCommand,
    generateVideoFromFirstLastFrameCommand,
    generateAllVideosFromFirstLastFrameCommand,
    openFirstFrameResourceCommand,
    copyFirstFrameToNextCommand,
    openVideoClipCommand,
    extractLastFrameToNextCommand,
    openSubjectResourceCommand,
    openSceneResourceCommand,
    addReferenceImageCommand,
    copyRelativePathCommand,
    renameResourceCommand,
    revealInExplorerCommand,
    deleteResourceCommand,
    deselectImageCommand,
    selectImageCommand,
    deselectVideoCommand,
    selectVideoCommand,
    editImageCommand,
    composeVideoCommand,
    copyImageCommand,
    pasteImageCommand,
    // 注册资源树提供者以便在扩展停用时清理监听器
    {
      dispose: () => {
        resourceTreeProvider?.dispose();
      }
    }
  );

  // 如果已经是 VV 项目，自动刷新视图
  if (workspaceRoot) {
    isVVProject(workspaceRoot).then(isVV => {
      if (isVV) {
        resourceTreeProvider?.refresh();
      }
    });
  }
}

/**
 * 初始化项目
 */
async function initializeProject(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    vscode.window.showErrorMessage('请先打开一个工作区文件夹！');
    return;
  }

  // 检查是否已初始化
  const initializer = new ProjectInitializer();
  const isInitialized = await initializer.checkIfInitialized(workspaceRoot);

  if (isInitialized) {
    const result = await vscode.window.showWarningMessage(
      '该项目已经初始化过了，是否重新初始化？',
      '是',
      '否'
    );
    if (result !== '是') {
      return;
    }
  }

  // 显示进度
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Vibe Video',
      cancellable: false
    },
    async (progress) => {
      progress.report({ message: '正在初始化项目...' });

      try {
        await initializer.initialize(workspaceRoot);
        
        // 刷新侧边栏
        resourceTreeProvider?.refresh();

        // 打开剧本文件
        const scriptPath = path.join(workspaceRoot, '剧本.md');
        const doc = await vscode.workspace.openTextDocument(scriptPath);
        await vscode.window.showTextDocument(doc);

        progress.report({ message: '完成！' });
      } catch (error) {
        vscode.window.showErrorMessage(`初始化失败: ${error}`);
      }
    }
  );
}

/**
 * 检查所有分镜质量
 */
async function checkStoryboards(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('请先打开一个工作区文件夹！');
    return;
  }

  if (!(await isVVProject(workspaceRoot))) {
    vscode.window.showWarningMessage('当前不是 Vibe Video 项目，请先初始化项目。');
    return;
  }

  const parser = new StoryboardParser();
  const storyboards = await resourceTreeProvider?.getAllStoryboards() || [];

  if (storyboards.length === 0) {
    vscode.window.showInformationMessage('暂无分镜脚本。提示：使用 Cursor AI 生成分镜脚本！');
    return;
  }

  // 检查每个分镜的质量
  const results: string[] = [];
  let excellentCount = 0;
  let goodCount = 0;
  let fairCount = 0;
  let needsImprovementCount = 0;

  for (const sb of storyboards) {
    const quality = parser.checkQuality(sb);
    
    if (quality.rating === 'excellent') {
      excellentCount++;
      results.push(`✅ ${sb.id}: 优秀`);
    } else if (quality.rating === 'good') {
      goodCount++;
      results.push(`✓ ${sb.id}: 良好`);
    } else if (quality.rating === 'fair') {
      fairCount++;
      results.push(`⚠️ ${sb.id}: 可用 (${quality.suggestions.join(', ')})`);
    } else {
      needsImprovementCount++;
      results.push(`💡 ${sb.id}: 需要改进 (${quality.warnings.join(', ')})`);
    }
  }

  // 显示结果
  const summary = `
分镜质量检查结果：
- 优秀: ${excellentCount}
- 良好: ${goodCount}
- 可用: ${fairCount}
- 需要改进: ${needsImprovementCount}

${results.join('\n')}
  `;

  const outputChannel = vscode.window.createOutputChannel('Vibe Video');
  outputChannel.clear();
  outputChannel.appendLine(summary);
  outputChannel.show();

  vscode.window.showInformationMessage(
    `分镜质量检查完成！✅ ${excellentCount + goodCount} 个优秀/良好，⚠️ ${fairCount + needsImprovementCount} 个可改进`
  );
}

/**
 * 显示项目统计信息
 */
async function showProjectStats(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('请先打开一个工作区文件夹！');
    return;
  }

  if (!(await isVVProject(workspaceRoot))) {
    vscode.window.showWarningMessage('当前不是 Vibe Video 项目，请先初始化项目。');
    return;
  }

  const storyboards = await resourceTreeProvider?.getAllStoryboards() || [];
  const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 5), 0);

  const message = `
项目统计：
- 分镜数量: ${storyboards.length}
- 总时长: ${totalDuration} 秒 (${Math.floor(totalDuration / 60)}分${totalDuration % 60}秒)
  `;

  vscode.window.showInformationMessage(message);
}

/**
 * 扩展停用
 */
export function deactivate() {
  // 清理资源
  resourceTreeProvider?.dispose();
}
