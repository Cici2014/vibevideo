/**
 * 生成场景图命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SceneManager } from '../core/SceneManager';
import { ProviderManager } from '../providers/ProviderManager';
import { ConfigManager } from '../core/ConfigManager';
import { Scene } from '../types';
import { imagesToBase64 } from '../utils/imageEncoder';
import { backupExistingFile } from '../utils/fileSystem';

/**
 * 生成所有场景图
 */
export async function generateAllScenes(
  providerManager: ProviderManager,
  sceneManager: SceneManager,
  configManager: ConfigManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    
    // 获取所有场景（包括已存在的）
    const allScenes = await sceneManager.discoverScenes();
    const scenesToGenerate = allScenes.filter(s => s.prompt.length > 0);
    const existingScenes = scenesToGenerate.filter(s => s.exists);
    const newScenes = scenesToGenerate.filter(s => !s.exists);

    if (scenesToGenerate.length === 0) {
      vscode.window.showInformationMessage(
        '没有可生成的场景！\n\n提示：在 scenes/ 目录创建 .md 文件来定义新场景。'
      );
      return;
    }

    // 如果有已存在的场景，提醒用户这是重新生成
    let confirmMessage: string;
    let confirmButton: string;
    
    if (existingScenes.length > 0 && newScenes.length > 0) {
      // 部分已存在，部分需要生成
      confirmMessage = `将生成 ${scenesToGenerate.length} 个场景图片（其中 ${existingScenes.length} 个将重新生成，${newScenes.length} 个为新生成），预计需要 ${Math.ceil(scenesToGenerate.length * 0.5)} 分钟。\n\n⚠️ 重新生成将覆盖现有图片。是否继续？`;
      confirmButton = '继续生成';
    } else if (existingScenes.length > 0) {
      // 所有场景都已存在，这是重新生成
      confirmMessage = `所有场景都已生成。将重新生成 ${existingScenes.length} 个场景图片，预计需要 ${Math.ceil(existingScenes.length * 0.5)} 分钟。\n\n⚠️ 重新生成将覆盖现有图片。是否继续？`;
      confirmButton = '重新生成';
    } else {
      // 所有都是新生成
      confirmMessage = `将生成 ${newScenes.length} 个场景图片，预计需要 ${Math.ceil(newScenes.length * 0.5)} 分钟。是否继续？`;
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

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: existingScenes.length > 0 ? 'Vibe Video - 重新生成场景' : 'Vibe Video - 生成场景',
        cancellable: true
      },
      async (progress, token) => {
        let successCount = 0;
        let failCount = 0;
        let completedCount = 0;
        let cancelled = false;

        // 并发控制：最多3个并发请求
        const MAX_CONCURRENT = 3;
        const runningTasks = new Set<Promise<void>>();

        // 为每个场景创建任务
        for (let i = 0; i < scenesToGenerate.length; i++) {
          // 检查是否已取消
          if (token.isCancellationRequested) {
            cancelled = true;
            progress.report({ message: '正在取消...' });
            break;
          }

          const scene = scenesToGenerate[i];
          
          // 创建任务 Promise
          const taskPromise = (async () => {
            try {
              // 再次检查取消状态
              if (token.isCancellationRequested) {
                return;
              }

              const actionText = scene.exists ? '重新生成' : '生成';
              progress.report({
                message: `正在${actionText} ${i + 1}/${scenesToGenerate.length}: ${scene.name}`,
                increment: 0
              });

              await generateSingleScene(scene, provider, configManager);
              successCount++;
            } catch (error) {
              // 如果是取消错误，不记录为失败
              if (token.isCancellationRequested) {
                return;
              }
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`生成场景失败: ${scene.id}`, errorMsg);
              vscode.window.showErrorMessage(`生成失败 [${scene.name}]: ${errorMsg}`);
              failCount++;
            } finally {
              completedCount++;
              if (!token.isCancellationRequested) {
                progress.report({
                  message: `已完成 ${completedCount}/${scenesToGenerate.length} (成功: ${successCount}, 失败: ${failCount})`,
                  increment: (100 / scenesToGenerate.length)
                });
              }
            }
          })();

          runningTasks.add(taskPromise);
          
          // 任务完成后从 Set 中移除
          taskPromise.finally(() => {
            runningTasks.delete(taskPromise);
          });

          // 如果达到最大并发数，等待其中一个完成
          if (runningTasks.size >= MAX_CONCURRENT) {
            await Promise.race(runningTasks);
            // 清理已完成的任务（确保 Set 大小正确）
            // 注意：finally 块会删除已完成的任务，但为了确保，我们再次检查
          }
        }

        // 如果已取消，等待正在运行的任务完成
        if (cancelled) {
          progress.report({ message: '等待正在运行的任务完成...' });
        }

        // 等待所有剩余任务完成
        if (runningTasks.size > 0) {
          await Promise.all(runningTasks);
        }

        if (cancelled) {
          const actionText = existingScenes.length > 0 ? '重新生成' : '生成';
          const message = `
场景${actionText}已取消
✓ 已完成: ${successCount}
✗ 失败: ${failCount}
          `;
          vscode.window.showWarningMessage(message);
        } else {
          const actionText = existingScenes.length > 0 ? '重新生成' : '生成';
          const message = `
场景${actionText}完成！
✓ 成功: ${successCount}
✗ 失败: ${failCount}
          `;

          if (failCount === 0) {
            vscode.window.showInformationMessage(message);
          } else {
            vscode.window.showWarningMessage(message);
          }
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成场景失败: ${error}`);
  }
}

/**
 * 生成单个场景图
 */
async function generateSingleScene(
  scene: Scene,
  provider: any,
  configManager: ConfigManager
): Promise<void> {
  console.log(`[场景生成] ${scene.id}: ${scene.prompt.substring(0, 50)}...`);

  // 获取工作区根目录
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 获取图片尺寸配置和生成数量配置
  const imageSize = configManager.getSceneImageSize();
  const numOutputs = configManager.getImageNumOutputs();

  // 增强提示词：生成场景图片
  const enhancedPrompt = `## 任务
生成场景图片。

## 输入
- 场景描述：${scene.prompt}

## 要求
### 必须遵守
1. 仅生成纯粹的环境/背景，画面中禁止出现任何人物、主体、产品或可移动物体
2. 如果参考图中包含人物或主体，请忽略他们，只保留背景和环境元素
3. 生成完整的场景画面，包含背景、环境、氛围
4. 画面中禁止出现任何文字、字幕、Logo 或水印
5. 保持统一的美术风格和渲染质量`;

  let taskId: string;

  // 检查是否有参考图
  if (scene.referenceImages && scene.referenceImages.length > 0) {
    // 使用参考图生成
    const referenceImagePaths: string[] = [];
    
    for (const refImage of scene.referenceImages) {
      let imagePath: string;
      if (path.isAbsolute(refImage)) {
        imagePath = refImage;
      } else {
        // 相对路径：相对于工作区根目录或场景文件所在目录
        if (refImage.startsWith('ref-img/') || refImage.startsWith('ref-img\\')) {
          imagePath = path.join(workspaceRoot, refImage);
        } else {
          // 相对于场景文件所在目录
          const sceneDir = path.dirname(scene.mdPath);
          imagePath = path.join(sceneDir, refImage);
        }
      }
      
      if (!fs.existsSync(imagePath)) {
        throw new Error(`参考图不存在: ${refImage} (解析为: ${imagePath})`);
      }
      referenceImagePaths.push(imagePath);
    }

    console.log(`[场景生成] ${scene.id}: 使用 ${referenceImagePaths.length} 张参考图`);
    console.log(`[场景生成] 参考图: ${referenceImagePaths.map(p => path.relative(workspaceRoot, p)).join(', ')}`);

    // 转换为 base64
    const imageBase64Array = await imagesToBase64(referenceImagePaths);

    // 构建合成提示词
    const composePrompt = `${enhancedPrompt}

## 参考图片
请参考提供的图片，生成符合描述的场景图片。`;

    // 调用多图合成 API
    const resultUrl = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, imageSize, numOutputs);
    
    // 多图合成 API 可能返回 URL、本地文件路径或 taskId
    if (resultUrl && (resultUrl.startsWith('http://') || resultUrl.startsWith('https://'))) {
      // 直接是 URL，直接下载
      console.log(`[场景] 直接下载: ${resultUrl}`);
      await provider.client.downloadResource(resultUrl, scene.imagePath);
      console.log(`✓ 场景生成完成: ${scene.id}`);
      return;
    } else if (resultUrl && (path.isAbsolute(resultUrl) || resultUrl.startsWith('./') || resultUrl.startsWith('../'))) {
      // 本地文件路径：直接复制文件
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const sourcePath = path.isAbsolute(resultUrl) ? resultUrl : (workspaceRoot ? path.join(workspaceRoot, resultUrl) : resultUrl);
      await backupExistingFile(scene.imagePath);
      await fs.promises.copyFile(sourcePath, scene.imagePath);
      console.log(`[场景] 已复制本地文件: ${sourcePath} → ${scene.imagePath}`);
      console.log(`✓ 场景生成完成: ${scene.id}`);
      return;
    } else {
      // 是 taskId，需要轮询
      taskId = resultUrl;
    }
  } else {
    // 使用文生图 API
    taskId = await provider.textToImage(enhancedPrompt, {
      size: imageSize,
      style: 'realistic'
    }, numOutputs);
  }

  console.log(`[场景] 任务创建: ${taskId}`);

  // 轮询任务状态
  await pollTaskStatus(provider, taskId);

  // 下载图片
  console.log(`[场景] 下载到: ${scene.imagePath}`);
  await provider.downloadResource(taskId, scene.imagePath);

  console.log(`✓ 场景生成完成: ${scene.id}`);
}

/**
 * 轮询任务状态
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
      const errorMsg = status.error || '任务失败';
      console.error(`[场景] 任务失败:`, errorMsg);
      throw new Error(`生成失败: ${errorMsg}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('生成超时');
}

/**
 * 生成单个场景（由右键菜单触发）
 */
export async function generateSingleSceneCommand(
  sceneId: string,
  providerManager: ProviderManager,
  sceneManager: SceneManager,
  configManager: ConfigManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const scene = await sceneManager.getScene(sceneId);

    if (!scene) {
      vscode.window.showErrorMessage(`未找到场景: ${sceneId}`);
      return;
    }

    if (!scene.prompt || scene.prompt.length < 20) {
      vscode.window.showErrorMessage(
        `场景描述太短或为空。请编辑 ${scene.mdPath} 添加详细描述。`
      );
      return;
    }

    // 如果场景已存在，提示用户这是重新生成
    if (scene.exists) {
      const confirm = await vscode.window.showWarningMessage(
        `场景「${scene.name}」已存在，重新生成将覆盖现有图片。是否继续？`,
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
        title: scene.exists ? `重新生成场景: ${scene.name}` : `生成场景: ${scene.name}`,
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: '正在生成...' });
        await generateSingleScene(scene, provider, configManager);
        const message = scene.exists 
          ? `✓ 场景重新生成完成: ${scene.name}`
          : `✓ 场景生成完成: ${scene.name}`;
        vscode.window.showInformationMessage(message);
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成场景失败: ${error}`);
  }
}

