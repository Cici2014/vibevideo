/**
 * 基于首帧图片生成多角度变体（使用 RunningHub 工作流）
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ResourceTreeItem } from '../ui/ResourceTreeProvider';
import { ConfigManager } from '../core/ConfigManager';
import { RunningHubClient } from '../providers/RunningHubClient';
import { RunningHubNodeInfo } from '../types';
import { getWorkspaceRoot, fileExists, generateUniqueFileName, ensureDir } from '../utils/fileSystem';

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  workflowId: string;
  imageNodeId: string;
  imageFieldName: string;
  promptNodeId: string;
  promptFieldName: string;
}

/**
 * 工作流配置文件结构
 */
interface WorkflowConfigFile {
  defaultWorkflow: WorkflowConfig;
  angleWorkflows?: Record<string, WorkflowConfig>;
}

/**
 * 角度定义（工作流配置从配置文件加载）
 */
export interface AngleDefinition {
  id: string;
  label: string;
  prompt: string;
}

/**
 * 加载工作流配置文件
 * 优先从工作区根目录读取 .vibevideo/runninghub-workflows.json
 * 如果不存在，则从扩展目录读取默认配置
 */
function loadWorkflowConfig(): WorkflowConfigFile | null {
  try {
    const workspaceRoot = getWorkspaceRoot();
    
    // 优先从工作区根目录读取用户自定义配置
    let configPath: string | null = null;
    if (workspaceRoot) {
      const userConfigPath = path.join(workspaceRoot, '.vibevideo', 'runninghub-workflows.json');
      if (fs.existsSync(userConfigPath)) {
        configPath = userConfigPath;
        console.log(`[RunningHub] 使用工作区配置文件: ${configPath}`);
      }
    }
    
    // 如果工作区没有配置，尝试从扩展目录读取默认配置
    if (!configPath) {
      // 尝试多个可能的扩展 ID
      const extensionIds = ['vibevideo.vibevideo', 'fastpen.vibevideo', 'vibevideo'];
      let extension: vscode.Extension<any> | undefined;
      
      for (const id of extensionIds) {
        extension = vscode.extensions.getExtension(id);
        if (extension) {
          break;
        }
      }
      
      if (extension) {
        const extensionPath = extension.extensionPath;
        // 尝试多个可能的路径（开发环境：src/config，生产环境：可能在不同位置）
        const possiblePaths = [
          path.join(extensionPath, 'src', 'config', 'runninghub-workflows.json'),
          path.join(extensionPath, 'config', 'runninghub-workflows.json'),
          path.join(__dirname, '../config/runninghub-workflows.json')
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            configPath = possiblePath;
            console.log(`[RunningHub] 使用默认配置文件: ${configPath}`);
            break;
          }
        }
      } else {
        // 如果无法获取扩展路径，尝试使用 __dirname（开发环境）
        const fallbackPath = path.join(__dirname, '../config/runninghub-workflows.json');
        if (fs.existsSync(fallbackPath)) {
          configPath = fallbackPath;
          console.log(`[RunningHub] 使用默认配置文件: ${configPath}`);
        }
      }
    }

    // 如果仍然没有找到配置文件，返回 null（将使用硬编码默认配置）
    if (!configPath) {
      console.warn(`[RunningHub] 配置文件不存在，将使用硬编码默认配置`);
      return null;
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as WorkflowConfigFile;
    
    // 验证配置格式
    if (!config.defaultWorkflow) {
      console.error('[RunningHub] 配置文件缺少 defaultWorkflow');
      return null;
    }

    return config;
  } catch (error) {
    console.error('[RunningHub] 加载配置文件失败:', error);
    return null;
  }
}

/**
 * 获取角度的工作流配置
 */
function getWorkflowForAngle(angleId: string, config: WorkflowConfigFile | null): WorkflowConfig {
  if (!config) {
    // 如果配置文件不存在，返回硬编码的默认配置
    return {
      workflowId: '1904136902449209346',
      imageNodeId: '74',
      imageFieldName: 'image',
      promptNodeId: '76',
      promptFieldName: 'text'
    };
  }

  // 优先使用角度专用配置
  if (config.angleWorkflows && config.angleWorkflows[angleId]) {
    return config.angleWorkflows[angleId];
  }

  // 否则使用默认配置
  return config.defaultWorkflow;
}

/**
 * 基础角度（直接菜单项）
 */
export const BASIC_ANGLES: AngleDefinition[] = [
  {
    id: 'overhead',
    label: '俯视',
    prompt: 'Next Scene: 将镜头转为俯视（将相机转至自上而下的视图.）'
  },
  {
    id: 'underside',
    label: '仰视',
    prompt: 'Next Scene: 将镜头转为仰视'
  },
  {
    id: 'wide',
    label: '广角',
    prompt: 'Next Scene: 将镜头转为广角镜头（将相机转向广角镜头.）'
  },
  {
    id: 'closeup',
    label: '特写',
    prompt: 'Next Scene: 将镜头转为特写镜头（将相机转向特写镜头。）'
  }
];

/**
 * 高级角度（QuickPick 选择）
 */
export const ADVANCED_ANGLES: AngleDefinition[] = [
  {
    id: 'closeup-left',
    label: '左侧特写',
    prompt: 'Next Scene: 将镜头转为左侧特写镜头'
  },
  {
    id: 'closeup-right',
    label: '右侧特写',
    prompt: 'Next Scene: 将镜头转为右侧特写镜头'
  },
  {
    id: 'over-shoulder',
    label: '过肩镜头',
    prompt: 'Next Scene: 将镜头转为过肩镜头'
  },
  {
    id: 'low-angle',
    label: '低角度',
    prompt: 'Next Scene: 将镜头转为低角度'
  },
  {
    id: 'high-angle',
    label: '高角度',
    prompt: 'Next Scene: 将镜头转为高角度'
  },
  {
    id: 'dutch-angle',
    label: '倾斜镜头',
    prompt: 'Next Scene: 将镜头转为倾斜镜头（荷兰角）'
  }
];

/**
 * 根据角度 ID 获取角度定义
 */
function getAngleById(angleId: string): AngleDefinition | undefined {
  return [...BASIC_ANGLES, ...ADVANCED_ANGLES].find(a => a.id === angleId);
}

/**
 * 生成多角度首帧（统一入口）
 */
export async function generateFirstFrameAngle(
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

    // 2. 读取 RunningHub 配置（只需要 API Key）
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

    // 6. 显示进度并执行
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Vibe Video - 正在生成${angleLabel}角度首帧`,
        cancellable: false
      },
      async (progress) => {
        try {
          // 步骤 1: 上传首帧图片
          progress.report({ message: '正在上传首帧图片...', increment: 20 });
          const uploadedFileName = await client.uploadResource(firstFramePath, 'input');
          console.log(`[RunningHub] 上传成功: ${uploadedFileName}`);

          // 步骤 2: 加载工作流配置并构造 nodeInfoList
          progress.report({ message: '正在准备工作流参数...', increment: 20 });
          const workflowConfig = loadWorkflowConfig();
          const workflow = getWorkflowForAngle(angleId, workflowConfig);
          
          const nodeInfoList: RunningHubNodeInfo[] = [
            {
              nodeId: workflow.imageNodeId,
              fieldName: workflow.imageFieldName,
              fieldValue: uploadedFileName
            },
            {
              nodeId: workflow.promptNodeId,
              fieldName: workflow.promptFieldName,
              fieldValue: angle.prompt
            }
          ];

          // 步骤 3: 创建工作流任务
          progress.report({ message: '正在提交任务...', increment: 20 });
          const taskId = await client.createWorkflowTask({
            workflowId: workflow.workflowId,
            nodeInfoList
          });
          console.log(`[RunningHub] 任务已创建: ${taskId}`);

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
            `✓ ${angleLabel}角度首帧生成完成！已保存 ${outputs.length} 张图片`
          );
        } catch (error: any) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[RunningHub] 生成失败:`, errorMsg);
          vscode.window.showErrorMessage(`生成${angleLabel}角度首帧失败: ${errorMsg}`);
          throw error;
        }
      }
    );
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`生成多角度首帧失败: ${errorMsg}`);
  }
}

/**
 * 显示高级角度选择菜单
 */
export async function showAdvancedAngleMenu(
  item: ResourceTreeItem,
  configManager: ConfigManager,
  resourceTreeProvider?: any
): Promise<void> {
  const selected = await vscode.window.showQuickPick(
    ADVANCED_ANGLES.map(angle => ({
      label: angle.label,
      description: angle.prompt,
      angleId: angle.id
    })),
    {
      placeHolder: '选择角度类型'
    }
  );

  if (selected) {
    const angle = getAngleById(selected.angleId);
    if (angle) {
      await generateFirstFrameAngle(item, angle.id, angle.label, configManager, resourceTreeProvider);
    }
  }
}

