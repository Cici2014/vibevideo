/**
 * 图像编辑命令
 * 使用 qwen-image-edit-plus 模型编辑图片
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProviderManager } from '../providers/ProviderManager';
import { ResourceTreeItem } from '../ui/ResourceTreeProvider';
import { imageToBase64 } from '../utils/imageEncoder';
import { getWorkspaceRoot, fileExists } from '../utils/fileSystem';

/**
 * 编辑图片
 */
export async function editImage(
  item: ResourceTreeItem,
  providerManager: ProviderManager
): Promise<void> {
  if (!item || !item.resourcePath) {
    vscode.window.showErrorMessage('请选择图片文件');
    return;
  }

  // 检查是否是图片类型
  const imageTypes = [
    'firstFrameImage',
    'firstFrameImageAlternative',
    'subjectImage',
    'subjectImageAlternative',
    'sceneImage',
    'sceneImageAlternative',
    'referenceImage'
  ];

  if (!item.resourceType || !imageTypes.includes(item.resourceType)) {
    vscode.window.showErrorMessage('只能编辑图片文件');
    return;
  }

  // 检查文件是否存在
  if (!(await fileExists(item.resourcePath))) {
    vscode.window.showErrorMessage(`图片文件不存在: ${item.resourcePath}`);
    return;
  }

  // 获取 Provider
  const provider = await providerManager.getProvider();
  if (!provider || provider.name !== '通义万相') {
    vscode.window.showErrorMessage('图像编辑功能目前仅支持通义万相服务');
    return;
  }

  // 获取配置管理器
  const configManager = providerManager.getConfigManager();
  if (!configManager) {
    vscode.window.showErrorMessage('配置管理器未初始化');
    return;
  }

  // 提示用户输入编辑描述
  const editPrompt = await vscode.window.showInputBox({
    prompt: '请描述需要如何修改这张图片',
    placeHolder: '例如：将背景改为蓝色，或者添加一朵花',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '请输入编辑描述';
      }
      if (value.trim().length < 3) {
        return '编辑描述至少需要3个字符';
      }
      return null;
    }
  });

  if (!editPrompt) {
    return; // 用户取消
  }

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('无法获取工作区路径');
    return;
  }

  // 显示进度
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '图像编辑',
      cancellable: false
    },
    async (progress) => {
      try {
        progress.report({ message: '正在转换图片...' });

        // 将图片转换为 base64
        const imageBase64 = await imageToBase64(item.resourcePath);
        console.log('[图像编辑] 图片已转换为 base64，大小:', imageBase64.length, '字符');

        progress.report({ message: '正在调用图像编辑接口...' });

        // 调用图像编辑 API
        const client = (provider as any).client;
        if (!client || typeof client.editImage !== 'function') {
          throw new Error('Provider 不支持图像编辑功能');
        }

        const imageUrl = await client.editImage(imageBase64, editPrompt);

        progress.report({ message: '正在下载编辑后的图片...' });

        // 下载编辑后的图片
        const originalFileName = path.basename(item.resourcePath);
        const originalExt = path.extname(originalFileName);
        const originalBaseName = path.basename(originalFileName, originalExt);
        const originalDir = path.dirname(item.resourcePath);

        // 生成新文件名（添加 -edited 后缀）
        let newFileName = `${originalBaseName}-edited${originalExt}`;
        let newPath = path.join(originalDir, newFileName);

        // 如果文件已存在，添加序号
        let counter = 1;
        while (await fileExists(newPath)) {
          newFileName = `${originalBaseName}-edited-${counter}${originalExt}`;
          newPath = path.join(originalDir, newFileName);
          counter++;
        }

        // 下载图片
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`下载图片失败: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        await fs.promises.writeFile(newPath, Buffer.from(buffer));

        progress.report({ message: '完成！' });

        vscode.window.showInformationMessage(`图像编辑完成: ${newFileName}`);

        // 刷新资源树
        // 注意：这里需要通过 extension.ts 中的 resourceTreeProvider 来刷新
        // 我们通过发送命令来触发刷新
        await vscode.commands.executeCommand('vibevideo.refreshResources');

        // 打开编辑后的图片
        const uri = vscode.Uri.file(newPath);
        await vscode.commands.executeCommand('vscode.open', uri);
      } catch (error: any) {
        console.error('[图像编辑] 错误:', error);
        vscode.window.showErrorMessage(`图像编辑失败: ${error.message || error}`);
      }
    }
  );
}

