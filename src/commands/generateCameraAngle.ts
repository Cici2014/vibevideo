/**
 * 生成不同镜头角度的图片（使用 RunningHub 工作流）
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ResourceTreeItem } from '../ui/ResourceTreeProvider';
import { ConfigManager } from '../core/ConfigManager';
import { RunningHubClient } from '../providers/RunningHubClient';
import { RunningHubNodeInfo } from '../types';
import { getWorkspaceRoot, fileExists, ensureDir } from '../utils/fileSystem';

/**
 * 镜头角度定义（从 shot-guide.md 提取）
 */
export interface CameraAngleDefinition {
  id: string;
  label: string;
  prompt: string;
}

/**
 * 水平角度
 */
export const HORIZONTAL_ANGLES: CameraAngleDefinition[] = [
  {
    id: 'eye-level',
    label: '平视 (Eye Level)',
    prompt: 'Next Scene: 平视 (Eye Level): 正常视角，自然真实，常用角度'
  },
  {
    id: 'front',
    label: '正面 (Front)',
    prompt: 'Next Scene: 正面 (Front): 正对主体，直接、正式'
  },
  {
    id: 'profile',
    label: '侧面 (Profile)',
    prompt: 'Next Scene: 侧面 (Profile): 侧面拍摄，展现轮廓'
  },
  {
    id: 'back',
    label: '背面 (Back)',
    prompt: 'Next Scene: 背面 (Back): 背面拍摄，营造神秘感'
  }
];

/**
 * 垂直角度
 */
export const VERTICAL_ANGLES: CameraAngleDefinition[] = [
  {
    id: 'high-angle',
    label: '俯拍 (High Angle)',
    prompt: 'Next Scene: 俯拍 (High Angle): 从上往下，显得主体渺小或展现全貌'
  },
  {
    id: 'low-angle',
    label: '仰拍 (Low Angle)',
    prompt: 'Next Scene: 仰拍 (Low Angle): 从下往上，显得主体高大或增强气势'
  },
  {
    id: 'aerial',
    label: '鸟瞰 (Aerial / Top-down)',
    prompt: 'Next Scene: 鸟瞰 (Aerial / Top-down): 垂直向下，展现布局和空间关系'
  },
  {
    id: 'dutch-angle',
    label: '倾斜角度 (Dutch Angle / Canted)',
    prompt: 'Next Scene: 倾斜角度 (Dutch Angle / Canted): 倾斜画面，营造紧张、不稳定感'
  }
];

/**
 * 所有角度
 */
export const ALL_CAMERA_ANGLES: CameraAngleDefinition[] = [
  ...HORIZONTAL_ANGLES,
  ...VERTICAL_ANGLES
];

/**
 * 根据角度 ID 获取角度定义
 */
function getAngleById(angleId: string): CameraAngleDefinition | undefined {
  return ALL_CAMERA_ANGLES.find(a => a.id === angleId);
}

/**
 * 生成随机 seed
 */
function generateSeed(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/**
 * 工作流 ID
 */
const WORKFLOW_ID = '1994959996884594690';

/**
 * 生成镜头角度图片
 */
export async function generateCameraAngle(
  item: ResourceTreeItem,
  angleId: string,
  angleLabel: string,
  configManager: ConfigManager,
  resourceTreeProvider?: any
): Promise<void> {
  try {
    // 1. 基本校验
    if (!item || item.resourceType !== 'firstFrameImage' || !item.resourcePath) {
      vscode.window.showErrorMessage('只能对首帧图片使用该命令');
      return;
    }

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('无法获取工作区路径');
      return;
    }

    // 2. 读取 RunningHub 配置
    const runningHubConfig = await configManager.getRunningHubConfig();
    if (!runningHubConfig) {
      vscode.window.showErrorMessage(
        'RunningHub 配置不完整。请在设置中配置：\n' +
        '- vibevideo.runninghub.apiKey'
      );
      return;
    }

    // 3. 检查首帧图片是否存在
    const firstFramePath = item.resourcePath;
    if (!(await fileExists(firstFramePath))) {
      vscode.window.showErrorMessage('首帧图片文件不存在');
      return;
    }

    // 4. 获取角度定义
    const angle = getAngleById(angleId);
    if (!angle) {
      vscode.window.showErrorMessage(`未知的角度类型: ${angleId}`);
      return;
    }

    // 5. 初始化 RunningHub 客户端
    const client = new RunningHubClient(
      runningHubConfig.apiKey,
      runningHubConfig.baseUrl || 'https://www.runninghub.cn'
    );

    // 6. 生成随机 seed
    const seed = generateSeed();

    // 7. 显示进度并执行
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Vibe Video - 正在生成${angleLabel}角度图片`,
        cancellable: false
      },
      async (progress) => {
        try {
          // 步骤 1: 上传首帧图片
          progress.report({ message: '正在上传图片...', increment: 20 });
          const uploadedFileName = await client.uploadResource(firstFramePath, 'input');
          console.log(`[RunningHub] 上传成功: ${uploadedFileName}`);

          // 步骤 2: 构造 nodeInfoList
          progress.report({ message: '正在准备工作流参数...', increment: 20 });
          const nodeInfoList: RunningHubNodeInfo[] = [
            {
              nodeId: '1',
              fieldName: 'image',
              fieldValue: uploadedFileName
            },
            {
              nodeId: '17',
              fieldName: 'prompt',
              fieldValue: angle.prompt
            },
            {
              nodeId: '5',
              fieldName: 'seed',
              fieldValue: seed.toString()
            }
          ];

          // 步骤 3: 创建工作流任务
          progress.report({ message: '正在提交任务...', increment: 20 });
          const taskId = await client.createWorkflowTask({
            workflowId: WORKFLOW_ID,
            nodeInfoList
          });
          console.log(`[RunningHub] 任务已创建: ${taskId}, seed: ${seed}`);

          // 步骤 4: 轮询任务状态
          progress.report({ message: '正在生成中，请稍候...', increment: 20 });
          const maxAttempts = 120; // 最多等待 10 分钟（5秒 * 120）
          let attempts = 0;
          let outputs: any[] = [];

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 等待 5 秒
            
            try {
              outputs = await client.getTaskOutputs(taskId);
              if (outputs.length > 0) {
                // 有输出了，任务完成
                break;
              }
            } catch (error: any) {
              // 如果错误信息包含"任务失败"，直接抛出
              if (error.message && error.message.includes('任务失败')) {
                throw error;
              }
              // 否则继续等待（可能是任务还在运行中）
            }
            
            attempts++;
            progress.report({ 
              message: `正在生成中... (${attempts * 5}秒)`, 
              increment: 0 
            });
          }

          if (outputs.length === 0) {
            throw new Error('任务超时（超过 10 分钟）或未返回结果');
          }

          // 步骤 5: 下载结果图片
          progress.report({ message: '正在下载结果...', increment: 20 });
          const firstFrameDir = path.dirname(firstFramePath);
          const firstFrameBaseName = path.basename(firstFramePath, path.extname(firstFramePath));
          const ext = path.extname(firstFramePath);

          // 生成保存路径：原文件名-angle-角度ID.png
          const saveBaseName = `${firstFrameBaseName}-angle-${angleId}`;
          const savePath = path.join(firstFrameDir, `${saveBaseName}${ext}`);

          // 确保目录存在
          await ensureDir(firstFrameDir);

          // 下载第一张图片（主图）
          if (outputs[0]?.fileUrl) {
            await client.downloadResource(outputs[0].fileUrl, savePath);
            console.log(`[RunningHub] 已下载主图: ${savePath}`);
          }

          // 下载其余图片（备选图，使用 .o-n 后缀）
          for (let i = 1; i < outputs.length; i++) {
            if (outputs[i]?.fileUrl) {
              const alternativePath = path.join(firstFrameDir, `${saveBaseName}.o-${i}${ext}`);
              await client.downloadResource(outputs[i].fileUrl, alternativePath);
              console.log(`[RunningHub] 已下载备选图: ${alternativePath}`);
            }
          }

          // 刷新资源树
          if (resourceTreeProvider) {
            resourceTreeProvider.refresh();
          }

          vscode.window.showInformationMessage(
            `✓ ${angleLabel}角度图片生成完成！已保存 ${outputs.length} 张图片`
          );
        } catch (error: any) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[RunningHub] 生成失败:`, errorMsg);
          vscode.window.showErrorMessage(`生成${angleLabel}角度图片失败: ${errorMsg}`);
          throw error;
        }
      }
    );
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`生成镜头角度图片失败: ${errorMsg}`);
  }
}

/**
 * 显示镜头角度选择菜单
 */
export async function showCameraAngleMenu(
  item: ResourceTreeItem,
  configManager: ConfigManager,
  resourceTreeProvider?: any
): Promise<void> {
  const angleGroups = [
    {
      label: '水平角度',
      angles: HORIZONTAL_ANGLES
    },
    {
      label: '垂直角度',
      angles: VERTICAL_ANGLES
    }
  ];

  // 创建 QuickPick 选项和角度映射
  const items: vscode.QuickPickItem[] = [];
  const labelToAngleId = new Map<string, string>();
  
  for (const group of angleGroups) {
    // 添加分组标题（使用不可选择的项作为分隔）
    items.push({
      label: `━━━ ${group.label} ━━━`,
      kind: vscode.QuickPickItemKind.Separator
    });
    // 添加该组的角度选项
    for (const angle of group.angles) {
      // 提取 "Next Scene: " 后面的描述文字
      const description = angle.prompt.startsWith('Next Scene: ')
        ? angle.prompt.substring('Next Scene: '.length)
        : angle.prompt;
      items.push({
        label: angle.label,
        description: description
      });
      labelToAngleId.set(angle.label, angle.id);
    }
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: '选择镜头角度类型'
  });

  if (selected && selected.label) {
    const angleId = labelToAngleId.get(selected.label);
    if (angleId) {
      const angle = getAngleById(angleId);
      if (angle) {
        await generateCameraAngle(item, angle.id, angle.label, configManager, resourceTreeProvider);
      }
    }
  }
}

