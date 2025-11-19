/**
 * Vibe Video Extension
 * 像写代码一样制作视频
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectInitializer } from './core/ProjectInitializer';
import { StoryboardParser } from './core/StoryboardParser';
import { ConfigManager } from './core/ConfigManager';
import { SubjectManager } from './core/SubjectManager';
import { SceneManager } from './core/SceneManager';
import { ResourceTreeProvider, ResourceTreeItem } from './ui/ResourceTreeProvider';
import { ProviderManager } from './providers/ProviderManager';
import { configureVideoAI, showCurrentConfig } from './commands/configureAPI';
import { generateAllVideos, generateSingleVideoFromClip, generateSingleVideo } from './commands/generateVideos';
import { generateVideoFromFirstLastFrame, generateVideoFromFirstLastFrameByStoryboard, generateAllVideosFromFirstLastFrame } from './commands/generateVideoFromFirstLastFrame';
import { generateAllFirstFrames, generateFirstFrameForStoryboard } from './commands/generateFirstFrames';
import { generateAllSubjects, generateSingleSubjectCommand } from './commands/generateSubjects';
import { generateAllScenes, generateSingleSceneCommand } from './commands/generateScenes';
import { getWorkspaceRoot, isVVProject, copyFile, ensureDir, fileExists, renameFile, deleteFile } from './utils/fileSystem';

let resourceTreeProvider: ResourceTreeProvider | undefined;
let providerManager: ProviderManager | undefined;
let configManager: ConfigManager | undefined;
let subjectManager: SubjectManager | undefined;
let sceneManager: SceneManager | undefined;

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
    await generateAllSubjects(providerManager, subjectManager);
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
      
      await generateSingleSubjectCommand(subjectId, providerManager, subjectManager);
      
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
    await generateAllScenes(providerManager, sceneManager);
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
      
      await generateSingleSceneCommand(sceneId, providerManager, sceneManager);
      
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
    // 使用统一的生成函数
    await generateAllFirstFrames(providerManager, subjectManager, resourceTreeProvider, sceneManager);
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

      // 使用统一的生成函数
      await generateFirstFrameForStoryboard(
        storyboardPath,
        providerManager,
        subjectManager,
        resourceTreeProvider,
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
    await generateAllFirstFrames(providerManager, subjectManager, resourceTreeProvider, sceneManager);
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

  const deleteResourceCommand = vscode.commands.registerCommand(
    'vibevideo.deleteResource',
    async (item: ResourceTreeItem) => {
      if (!item) {
        vscode.window.showErrorMessage('请选择要删除的资源项');
        return;
      }

      // 获取资源路径
      const resourcePath = item.resourcePath;
      if (!resourcePath) {
        vscode.window.showErrorMessage('该资源项没有文件路径');
        return;
      }

      // 获取文件名用于显示
      const fileName = path.basename(resourcePath);

      // 确认删除
      const confirm = await vscode.window.showWarningMessage(
        `确定要删除「${fileName}」吗？此操作不可撤销。`,
        '删除',
        '取消'
      );

      if (confirm !== '删除') {
        return;
      }

      try {
        // 检查文件是否存在
        if (!(await fileExists(resourcePath))) {
          vscode.window.showWarningMessage(`文件不存在: ${fileName}`);
          // 即使文件不存在，也刷新资源树（可能已经被外部删除）
          resourceTreeProvider?.refresh();
          return;
        }

        // 删除文件
        await deleteFile(resourcePath);
        
        // 刷新资源树
        resourceTreeProvider?.refresh();
        
        vscode.window.showInformationMessage(`已删除: ${fileName}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`删除失败: ${error.message || error}`);
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
    openVideoClipCommand,
    openSubjectResourceCommand,
    openSceneResourceCommand,
    addReferenceImageCommand,
    copyRelativePathCommand,
    renameResourceCommand,
    revealInExplorerCommand,
    deleteResourceCommand,
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
