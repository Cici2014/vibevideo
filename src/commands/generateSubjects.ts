/**
 * 生成主体图命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SubjectManager } from '../core/SubjectManager';
import { ProviderManager } from '../providers/ProviderManager';
import { Subject } from '../types';

/**
 * 生成所有主体图
 */
export async function generateAllSubjects(
  providerManager: ProviderManager,
  subjectManager: SubjectManager
): Promise<void> {
  try {
    const provider = await providerManager.getProvider();
    const subjects = await subjectManager.getSubjectsToGenerate();

    if (subjects.length === 0) {
      vscode.window.showInformationMessage(
        '所有主体都已生成！\n\n提示：在 subjects/ 目录创建 .md 文件来定义新主体。'
      );
      return;
    }

    const confirm = await vscode.window.showInformationMessage(
      `将生成 ${subjects.length} 个主体图片，预计需要 ${Math.ceil(subjects.length * 0.5)} 分钟。是否继续？`,
      '继续',
      '取消'
    );

    if (confirm !== '继续') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Vibe Video - 生成主体',
        cancellable: false
      },
      async (progress) => {
        let successCount = 0;
        let failCount = 0;
        let completedCount = 0;

        // 并发控制：最多3个并发请求
        const MAX_CONCURRENT = 3;
        const runningTasks = new Set<Promise<void>>();

        // 为每个主体创建任务
        for (let i = 0; i < subjects.length; i++) {
          const subject = subjects[i];
          
          // 创建任务 Promise
          const taskPromise = (async () => {
            try {
              progress.report({
                message: `正在生成 ${i + 1}/${subjects.length}: ${subject.name}`,
                increment: 0
              });

              await generateSingleSubject(subject, provider);
              successCount++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`生成主体失败: ${subject.id}`, errorMsg);
              vscode.window.showErrorMessage(`生成失败 [${subject.name}]: ${errorMsg}`);
              failCount++;
            } finally {
              completedCount++;
              progress.report({
                message: `已完成 ${completedCount}/${subjects.length} (成功: ${successCount}, 失败: ${failCount})`,
                increment: (100 / subjects.length)
              });
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

        // 等待所有剩余任务完成
        if (runningTasks.size > 0) {
          await Promise.all(runningTasks);
        }

        const message = `
主体生成完成！
✓ 成功: ${successCount}
✗ 失败: ${failCount}
        `;

        if (failCount === 0) {
          vscode.window.showInformationMessage(message);
        } else {
          vscode.window.showWarningMessage(message);
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
  provider: any
): Promise<void> {
  console.log(`[主体生成] ${subject.id}: ${subject.prompt.substring(0, 50)}...`);

  // 增强提示词：确保只生成主体，背景纯白，无其他物品
  const enhancedPrompt = `${subject.prompt}\n\n重要要求：只生成主体本身，背景必须是纯白色（#FFFFFF），画面中不能有任何其他物品、道具、装饰或背景元素。主体应该完整、清晰，便于后续合成。`;

  // 调用文生图 API
  const taskId = await provider.textToImage(enhancedPrompt, {
    size: '1024*1024',  // 主体图用方形，便于合成
    style: 'realistic'
  });

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
  subjectManager: SubjectManager
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
        await generateSingleSubject(subject, provider);
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

