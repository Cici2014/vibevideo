/**
 * 生成主体图命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SubjectManager } from '../core/SubjectManager';
import { ProviderManager } from '../providers/ProviderManager';
import { ConfigManager } from '../core/ConfigManager';
import { Subject } from '../types';
import { imagesToBase64 } from '../utils/imageEncoder';
import { backupExistingFile } from '../utils/fileSystem';

/**
 * 生成所有主体图
 */
export async function generateAllSubjects(
  providerManager: ProviderManager,
  subjectManager: SubjectManager,
  configManager: ConfigManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    
    // 获取所有主体（包括已存在的）
    const allSubjects = await subjectManager.discoverSubjects();
    const subjectsToGenerate = allSubjects.filter(s => s.prompt.length > 0);
    const existingSubjects = subjectsToGenerate.filter(s => s.exists);
    const newSubjects = subjectsToGenerate.filter(s => !s.exists);

    if (subjectsToGenerate.length === 0) {
      vscode.window.showInformationMessage(
        '没有可生成的主体！\n\n提示：在 subjects/ 目录创建 .md 文件来定义新主体。'
      );
      return;
    }

    // 如果有已存在的主体，提醒用户这是重新生成
    let confirmMessage: string;
    let confirmButton: string;
    
    if (existingSubjects.length > 0 && newSubjects.length > 0) {
      // 部分已存在，部分需要生成
      confirmMessage = `将生成 ${subjectsToGenerate.length} 个主体图片（其中 ${existingSubjects.length} 个将重新生成，${newSubjects.length} 个为新生成），预计需要 ${Math.ceil(subjectsToGenerate.length * 0.5)} 分钟。\n\n⚠️ 重新生成将覆盖现有图片。是否继续？`;
      confirmButton = '继续生成';
    } else if (existingSubjects.length > 0) {
      // 所有主体都已存在，这是重新生成
      confirmMessage = `所有主体都已生成。将重新生成 ${existingSubjects.length} 个主体图片，预计需要 ${Math.ceil(existingSubjects.length * 0.5)} 分钟。\n\n⚠️ 重新生成将覆盖现有图片。是否继续？`;
      confirmButton = '重新生成';
    } else {
      // 所有都是新生成
      confirmMessage = `将生成 ${newSubjects.length} 个主体图片，预计需要 ${Math.ceil(newSubjects.length * 0.5)} 分钟。是否继续？`;
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
        title: existingSubjects.length > 0 ? 'Vibe Video - 重新生成主体' : 'Vibe Video - 生成主体',
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

        // 为每个主体创建任务
        for (let i = 0; i < subjectsToGenerate.length; i++) {
          // 检查是否已取消
          if (token.isCancellationRequested) {
            cancelled = true;
            progress.report({ message: '正在取消...' });
            break;
          }

          const subject = subjectsToGenerate[i];
          
          // 创建任务 Promise
          const taskPromise = (async () => {
            try {
              // 再次检查取消状态
              if (token.isCancellationRequested) {
                return;
              }

              const actionText = subject.exists ? '重新生成' : '生成';
              progress.report({
                message: `正在${actionText} ${i + 1}/${subjectsToGenerate.length}: ${subject.name}`,
                increment: 0
              });

              await generateSingleSubject(subject, provider, configManager);
              successCount++;
            } catch (error) {
              // 如果是取消错误，不记录为失败
              if (token.isCancellationRequested) {
                return;
              }
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`生成主体失败: ${subject.id}`, errorMsg);
              vscode.window.showErrorMessage(`生成失败 [${subject.name}]: ${errorMsg}`);
              failCount++;
            } finally {
              completedCount++;
              if (!token.isCancellationRequested) {
                progress.report({
                  message: `已完成 ${completedCount}/${subjectsToGenerate.length} (成功: ${successCount}, 失败: ${failCount})`,
                  increment: (100 / subjectsToGenerate.length)
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
          const actionText = existingSubjects.length > 0 ? '重新生成' : '生成';
          const message = `
主体${actionText}已取消
✓ 已完成: ${successCount}
✗ 失败: ${failCount}
          `;
          vscode.window.showWarningMessage(message);
        } else {
          const actionText = existingSubjects.length > 0 ? '重新生成' : '生成';
          const message = `
主体${actionText}完成！
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
    vscode.window.showErrorMessage(`生成主体失败: ${error}`);
  }
}

/**
 * 生成单个主体图
 */
async function generateSingleSubject(
  subject: Subject,
  provider: any,
  configManager: ConfigManager
): Promise<void> {
  console.log(`[主体生成] ${subject.id}: ${subject.prompt.substring(0, 50)}...`);

  // 获取工作区根目录
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('无法获取工作区路径');
  }

  // 获取图片尺寸配置和生成数量配置
  const imageSize = configManager.getSubjectImageSize();
  const numOutputs = configManager.getImageNumOutputs();

  // 增强提示词：确保只生成主体，背景纯白，无其他物品
  const enhancedPrompt = `## 任务
生成主体图片。

## 输入
- 主体描述：${subject.prompt}

## 要求
### 必须遵守
1. 只生成主体本身（角色或物体）
2. 背景必须是纯白色（#FFFFFF）
3. 画面中不能有任何其他物品、道具、装饰或背景元素
4. 主体应该完整、清晰，便于后续合成`;

  let taskId: string;

  // 检查是否有参考图
  if (subject.referenceImages && subject.referenceImages.length > 0) {
    // 使用参考图生成
    const referenceImagePaths: string[] = [];
    
    for (const refImage of subject.referenceImages) {
      let imagePath: string;
      if (path.isAbsolute(refImage)) {
        imagePath = refImage;
      } else {
        // 相对路径：相对于工作区根目录或主体文件所在目录
        if (refImage.startsWith('ref-img/') || refImage.startsWith('ref-img\\')) {
          imagePath = path.join(workspaceRoot, refImage);
        } else {
          // 相对于主体文件所在目录
          const subjectDir = path.dirname(subject.mdPath);
          imagePath = path.join(subjectDir, refImage);
        }
      }
      
      if (!fs.existsSync(imagePath)) {
        throw new Error(`参考图不存在: ${refImage} (解析为: ${imagePath})`);
      }
      referenceImagePaths.push(imagePath);
    }

    console.log(`[主体生成] ${subject.id}: 使用 ${referenceImagePaths.length} 张参考图`);
    console.log(`[主体生成] 参考图: ${referenceImagePaths.map(p => path.relative(workspaceRoot, p)).join(', ')}`);

    // 转换为 base64
    const imageBase64Array = await imagesToBase64(referenceImagePaths);

    // 构建合成提示词
    const composePrompt = `${enhancedPrompt}

## 参考图片
请参考提供的图片，生成符合描述的主体图片。`;

    // 调用多图合成 API
    const resultUrl = await provider.client.composeMultipleImages(imageBase64Array, composePrompt, imageSize, numOutputs);
    
    // 多图合成 API 可能返回 URL、本地文件路径或 taskId
    if (resultUrl && (resultUrl.startsWith('http://') || resultUrl.startsWith('https://'))) {
      // 直接是 URL，直接下载
      console.log(`[主体] 直接下载: ${resultUrl}`);
      await provider.client.downloadResource(resultUrl, subject.imagePath);
      console.log(`✓ 主体生成完成: ${subject.id}`);
      return;
    } else if (resultUrl && (path.isAbsolute(resultUrl) || resultUrl.startsWith('./') || resultUrl.startsWith('../'))) {
      // 本地文件路径：直接复制文件
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const sourcePath = path.isAbsolute(resultUrl) ? resultUrl : (workspaceRoot ? path.join(workspaceRoot, resultUrl) : resultUrl);
      await backupExistingFile(subject.imagePath);
      await fs.promises.copyFile(sourcePath, subject.imagePath);
      console.log(`[主体] 已复制本地文件: ${sourcePath} → ${subject.imagePath}`);
      console.log(`✓ 主体生成完成: ${subject.id}`);
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

  console.log(`[主体] 任务创建: ${taskId}`);

  // 轮询任务状态
  await pollTaskStatus(provider, taskId);

  // 下载图片
  console.log(`[主体] 下载到: ${subject.imagePath}`);
  await provider.downloadResource(taskId, subject.imagePath);

  console.log(`✓ 主体生成完成: ${subject.id}`);
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
      console.error(`[主体] 任务失败:`, errorMsg);
      throw new Error(`生成失败: ${errorMsg}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('生成超时');
}

/**
 * 生成单个主体（由右键菜单触发）
 */
export async function generateSingleSubjectCommand(
  subjectId: string,
  providerManager: ProviderManager,
  subjectManager: SubjectManager,
  configManager: ConfigManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const subject = await subjectManager.getSubject(subjectId);

    if (!subject) {
      vscode.window.showErrorMessage(`未找到主体: ${subjectId}`);
      return;
    }

    if (!subject.prompt || subject.prompt.length < 20) {
      vscode.window.showErrorMessage(
        `主体描述太短或为空。请编辑 ${subject.mdPath} 添加详细描述。`
      );
      return;
    }

    // 如果主体已存在，提示用户这是重新生成
    if (subject.exists) {
      const confirm = await vscode.window.showWarningMessage(
        `主体「${subject.name}」已存在，重新生成将覆盖现有图片。是否继续？`,
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
        title: subject.exists ? `重新生成主体: ${subject.name}` : `生成主体: ${subject.name}`,
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: '正在生成...' });
        await generateSingleSubject(subject, provider, configManager);
        const message = subject.exists 
          ? `✓ 主体重新生成完成: ${subject.name}`
          : `✓ 主体生成完成: ${subject.name}`;
        vscode.window.showInformationMessage(message);
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`生成主体失败: ${error}`);
  }
}

