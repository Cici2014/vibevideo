/**
 * RunningHub API 客户端
 * 封装 RunningHub 工作流 API 调用
 */

import * as fs from 'fs';
import * as path from 'path';
import { RunningHubNodeInfo, RunningHubTaskOutput } from '../types';

export interface RunningHubUploadResponse {
  code: number;
  msg: string;
  data?: {
    fileName: string;
    fileType: string;
  };
}

export interface RunningHubTaskCreateResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    taskStatus: string;
    clientId?: string;
    netWssUrl?: string;
    promptTips?: string;
  };
}

export interface RunningHubTaskStatusResponse {
  code: number;
  msg: string;
  data?: string; // 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS'
}

export interface RunningHubTaskOutputsResponse {
  code: number;
  msg: string;
  data?: RunningHubTaskOutput[] | {
    failedReason?: {
      node_name: string;
      exception_message: string;
      traceback?: string;
    };
  };
}

export class RunningHubClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://www.runninghub.cn') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * 上传资源文件（图片、视频、音频等）
   */
  async uploadResource(filePath: string, fileType: 'input' = 'input'): Promise<string> {
    const url = `${this.baseUrl}/task/openapi/upload`;
    
    // 读取文件
    const fileBuffer = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);
    
    // 构建 multipart/form-data
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const formDataParts: Buffer[] = [];
    
    // apiKey 字段
    formDataParts.push(Buffer.from(`--${boundary}\r\n`));
    formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="apiKey"\r\n\r\n`));
    formDataParts.push(Buffer.from(`${this.apiKey}\r\n`));
    
    // fileType 字段
    formDataParts.push(Buffer.from(`--${boundary}\r\n`));
    formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="fileType"\r\n\r\n`));
    formDataParts.push(Buffer.from(`${fileType}\r\n`));
    
    // file 字段
    formDataParts.push(Buffer.from(`--${boundary}\r\n`));
    formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${Buffer.from(fileName).toString('latin1')}"\r\n`));
    formDataParts.push(Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`));
    formDataParts.push(fileBuffer);
    formDataParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    
    const body = Buffer.concat(formDataParts);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Host': 'www.runninghub.cn',
        'Content-Length': body.length.toString()
      },
      body: body
    });

    const data = await response.json() as RunningHubUploadResponse;

    if (data.code !== 0 || !data.data) {
      throw new Error(`上传文件失败: ${data.msg || response.statusText}`);
    }

    return data.data.fileName;
  }

  /**
   * 创建工作流任务（高级版，支持 nodeInfoList）
   */
  async createWorkflowTask(params: {
    workflowId: string;
    nodeInfoList: RunningHubNodeInfo[];
    addMetadata?: boolean;
    webhookUrl?: string;
    instanceType?: string;
    usePersonalQueue?: boolean;
  }): Promise<string> {
    const url = `${this.baseUrl}/task/openapi/create`;

    const body = {
      apiKey: this.apiKey,
      workflowId: params.workflowId,
      nodeInfoList: params.nodeInfoList,
      addMetadata: params.addMetadata ?? true,
      ...(params.webhookUrl && { webhookUrl: params.webhookUrl }),
      ...(params.instanceType && { instanceType: params.instanceType }),
      ...(params.usePersonalQueue !== undefined && { usePersonalQueue: params.usePersonalQueue })
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.cn'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as RunningHubTaskCreateResponse;

    if (data.code !== 0 || !data.data) {
      // 检查是否有节点错误信息
      if (data.data?.promptTips) {
        try {
          const tips = JSON.parse(data.data.promptTips);
          if (tips.node_errors && Object.keys(tips.node_errors).length > 0) {
            const errors = Object.entries(tips.node_errors).map(([nodeId, error]) => 
              `节点 ${nodeId}: ${error}`
            ).join('; ');
            throw new Error(`工作流节点错误: ${errors}`);
          }
        } catch (e) {
          // 解析失败，使用原始错误信息
        }
      }
      throw new Error(`创建任务失败: ${data.msg || response.statusText}`);
    }

    return data.data.taskId;
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS'> {
    const url = `${this.baseUrl}/task/openapi/status`;

    const body = {
      apiKey: this.apiKey,
      taskId: taskId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.cn'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as RunningHubTaskStatusResponse;

    if (data.code !== 0 || !data.data) {
      throw new Error(`查询任务状态失败: ${data.msg || response.statusText}`);
    }

    return data.data as 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS';
  }

  /**
   * 查询任务输出结果
   */
  async getTaskOutputs(taskId: string): Promise<RunningHubTaskOutput[]> {
    const url = `${this.baseUrl}/task/openapi/outputs`;

    const body = {
      apiKey: this.apiKey,
      taskId: taskId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.cn'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as RunningHubTaskOutputsResponse;

    // 处理不同的响应状态
    if (data.code === 804 || data.code === 813) {
      // 任务还在运行中或排队中
      return [];
    }

    if (data.code === 805) {
      // 任务失败
      if (data.data && typeof data.data === 'object' && 'failedReason' in data.data) {
        const reason = data.data.failedReason;
        if (reason) {
          throw new Error(`任务失败: 节点 ${reason.node_name} - ${reason.exception_message}`);
        }
      }
      throw new Error(`任务失败: ${data.msg || '未知错误'}`);
    }

    if (data.code !== 0 || !data.data || !Array.isArray(data.data)) {
      throw new Error(`查询任务输出失败: ${data.msg || response.statusText}`);
    }

    return data.data;
  }

  /**
   * 下载资源文件
   */
  async downloadResource(url: string, savePath: string): Promise<void> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`下载资源失败 [${response.status}]: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const dir = path.dirname(savePath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(savePath, Buffer.from(buffer));
  }
}

