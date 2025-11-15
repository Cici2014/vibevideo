/**
 * 百炼平台 HTTP API 客户端
 * 直接使用 HTTP API，无需 SDK
 */

import * as fs from 'fs';

/**
 * API 响应
 */
interface APIResponse {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{ url: string }>;
    video_url?: string;
    message?: string;  // 任务失败原因
    code?: string;     // 任务失败代码
  };
  request_id?: string;
  code?: string;
  message?: string;
}

/**
 * 百炼 API 客户端
 */
export class BailianAPIClient {
  private apiKey: string;
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 文生图（同步/异步）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2976416
   */
  async textToImage(prompt: string, size: string = '1280*720'): Promise<string> {
    const url = `${this.baseUrl}/text2image/image-synthesis`;

    const body = {
      model: 'wan2.5-t2i-preview',
      input: {
        prompt
      },
      parameters: {
        size,
        n: 1
      }
    };

    console.log('[API] 文生图请求:', { url, prompt: prompt.substring(0, 50), size });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable', // 异步模式
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as APIResponse;

    console.log('[API] 文生图响应:', {
      status: response.status,
      ok: response.ok,
      code: data.code,
      message: data.message,
      task_id: data.output?.task_id
    });

    if (!response.ok || data.code) {
      throw new Error(`文生图失败 [${response.status}]: ${data.message || response.statusText}。请检查 API Key 是否正确。`);
    }

    if (!data.output?.task_id) {
      throw new Error(`未返回任务 ID。响应: ${JSON.stringify(data)}`);
    }

    return data.output.task_id;
  }

  /**
   * 文生视频
   * 注意：API 不支持自定义 duration 参数
   */
  async textToVideo(prompt: string, size: string = '832*480'): Promise<string> {
    const url = `${this.baseUrl}/video-generation/video-synthesis`;

    const body = {
      model: 'wan2.5-i2v-preview',
      input: {
        prompt
      },
      parameters: {
        size,
        prompt_extend: true,
        audio: true  // 启用音频
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as APIResponse;

    if (!response.ok || data.code) {
      throw new Error(`文生视频失败: ${data.message || response.statusText}`);
    }

    if (!data.output?.task_id) {
      throw new Error('未返回任务 ID');
    }

    return data.output.task_id;
  }

  /**
   * 图生视频（基于首帧）
   * 支持 base64 data URL 格式（data:image/png;base64,...）
   * 注意：API 不支持自定义 duration 参数
   */
  async imageToVideo(imageUrl: string, prompt: string, resolution: string = '1080P'): Promise<string> {
    const url = `${this.baseUrl}/video-generation/video-synthesis`;

    const body = {
      model: 'wan2.5-i2v-preview',
      input: {
        prompt,
        img_url: imageUrl
      },
      parameters: {
        resolution,
        prompt_extend: true,
        audio: true  // 启用音频
      }
    };

    console.log('[API] 图生视频请求:', {
      url,
      model: 'wan2.5-i2v-preview',
      resolution,
      audio: true,
      prompt: prompt.substring(0, 100),
      imageFormat: imageUrl.startsWith('data:') ? 'base64' : 'url',
      imageLength: imageUrl.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as APIResponse;

    console.log('[API] 图生视频响应:', {
      status: response.status,
      ok: response.ok,
      code: data.code,
      message: data.message,
      task_id: data.output?.task_id
    });

    if (!response.ok || data.code) {
      throw new Error(`图生视频失败: ${data.message || response.statusText}`);
    }

    if (!data.output?.task_id) {
      throw new Error('未返回任务 ID');
    }

    return data.output.task_id;
  }

  /**
   * 查询任务状态
   * DashScope 使用 GET 方法但是不同的路径格式
   */
  async getTaskStatus(taskId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    url?: string;
    progress?: number;
    error?: string;
  }> {
    // DashScope 异步任务查询端点
    const url = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

    console.log('[API] 查询任务状态:', { taskId, url });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const data = await response.json() as APIResponse;

    console.log('[API] 任务状态响应:', {
      status: response.status,
      ok: response.ok,
      task_status: data.output?.task_status,
      code: data.code,
      output_code: data.output?.code,
      output_message: data.output?.message,
      full_output: data.output
    });

    if (!response.ok || data.code) {
      throw new Error(`查询任务失败 [${response.status}]: ${data.message || response.statusText}`);
    }

    // 映射状态
    const taskStatus = data.output?.task_status?.toUpperCase();
    let status: 'pending' | 'processing' | 'completed' | 'failed';
    let error: string | undefined;

    if (taskStatus === 'SUCCEEDED') {
      status = 'completed';
    } else if (taskStatus === 'FAILED') {
      status = 'failed';
      // 获取失败原因
      error = data.output?.message || data.output?.code || '任务失败，未返回详细原因';
      console.error('[API] 任务失败原因:', error);
    } else if (taskStatus === 'RUNNING' || taskStatus === 'PENDING') {
      status = 'processing';
    } else {
      status = 'pending';
    }

    // 获取结果 URL
    let url_result: string | undefined;
    if (status === 'completed') {
      // 文生图结果
      if (data.output?.results && data.output.results.length > 0) {
        url_result = data.output.results[0].url;
      }
      // 视频结果
      if (data.output?.video_url) {
        url_result = data.output.video_url;
      }
    }

    return {
      status,
      url: url_result,
      progress: status === 'completed' ? 100 : status === 'processing' ? 50 : 0,
      error
    };
  }

  /**
   * 下载资源到本地
   */
  async downloadResource(url: string, savePath: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(savePath, Buffer.from(buffer));
  }

  /**
   * 多图合成（图片编辑）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2865250
   */
  async composeMultipleImages(
    imageBase64Array: string[],  // Base64 编码的图片数组
    prompt: string                // 合成描述
  ): Promise<string> {
    const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

    // 构建 content（多图 + 文本）
    const content = [
      ...imageBase64Array.map(base64 => ({ image: base64 })),
      { text: prompt }
    ];

    const body = {
      model: 'qwen-image-edit-plus',
      input: {
        messages: [{
          role: 'user',
          content
        }]
      },
      parameters: {
        n: 1,
        negative_prompt: '',
        prompt_extend: true,
        watermark: false
      }
    };

    console.log('[API] 多图合成请求:', {
      url,
      imageCount: imageBase64Array.length,
      prompt: prompt.substring(0, 100)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as any;

    console.log('[API] 多图合成响应:', {
      status: response.status,
      ok: response.ok,
      hasOutput: !!data.output
    });

    if (!response.ok || data.code) {
      throw new Error(`多图合成失败 [${response.status}]: ${data.message || response.statusText}`);
    }

    // 这个 API 可能是同步的，直接返回图片 URL
    // 或者返回 task_id（异步）
    // 需要根据实际响应调整
    
    // 1. results[].url
    if (data.output?.results && data.output.results.length > 0) {
      const url = data.output.results[0].url;
      if (url) {
        return url;
      }
    }

    // 2. choices[].message.content[].image
    const choices = data.output?.choices;
    if (choices && choices.length > 0) {
      const contents = choices[0]?.message?.content || [];
      const imageEntry = contents.find((entry: any) => entry.image);
      if (imageEntry?.image) {
        return imageEntry.image;
      }
    }

    // 3. task_id（异步模式）
    if (data.output?.task_id) {
      return data.output.task_id;
    }

    throw new Error(`未返回结果。响应: ${JSON.stringify(data)}`);
  }
}

