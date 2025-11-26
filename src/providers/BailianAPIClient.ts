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
    video_urls?: string[];  // 多个视频 URL（当 n > 1 时）
    message?: string;  // 任务失败原因
    code?: string;     // 任务失败代码
    choices?: Array<{  // qwen-image-edit-plus 响应格式
      finish_reason?: string;
      message?: {
        role?: string;
        content?: Array<{ image?: string }>;
      };
    }>;
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
  private baseUrl: string;
  private taskBaseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    
    // 如果提供了自定义 baseUrl，使用它；否则使用默认的阿里云地址
    if (baseUrl) {
      this.baseUrl = baseUrl;
      // 从 baseUrl 中提取基础部分，用于任务查询
      // 例如：http://localhost:8000/v1/services/aigc -> http://localhost:8000/v1
      // 或者：http://localhost:8000/v1 -> http://localhost:8000/v1
      try {
        const urlObj = new URL(baseUrl);
        // 移除路径中的 /services/aigc 部分（如果存在）
        let pathname = urlObj.pathname.replace(/\/services\/aigc.*$/, '');
        // 如果路径为空，使用 /v1 作为默认路径
        if (!pathname || pathname === '/') {
          pathname = '/v1';
        }
        this.taskBaseUrl = `${urlObj.protocol}//${urlObj.host}${pathname}`;
      } catch (error) {
        // 如果 URL 格式不正确，抛出错误
        throw new Error(`无效的 baseUrl 格式: ${baseUrl}。请提供完整的 URL，例如：http://localhost:8000/v1/services/aigc`);
      }
    } else {
      this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc';
      this.taskBaseUrl = 'https://dashscope.aliyuncs.com/api/v1';
    }
  }

  /**
   * 文生图（同步/异步）
   * 参考：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2976416
   */
  async textToImage(prompt: string, size: string = '1280*720', n: number = 1): Promise<string> {
    const url = `${this.baseUrl}/text2image/image-synthesis`;

    const body = {
      model: 'wan2.5-t2i-preview',
      input: {
        prompt
      },
      parameters: {
        size,
        n: n
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
   * @param n 生成视频数量（如果 API 不支持，将通过多次调用实现）
   */
  async textToVideo(prompt: string, size: string = '832*480', n: number = 1): Promise<string> {
    const url = `${this.baseUrl}/video-generation/video-synthesis`;

    const body = {
      model: 'wan2.5-i2v-preview',
      input: {
        prompt
      },
      parameters: {
        size,
        prompt_extend: true,
        audio: true,  // 启用音频
        ...(n > 1 ? { n: n } : {})  // 如果 n > 1，尝试传递 n 参数（API 可能不支持）
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
   * @param n 生成视频数量（如果 API 不支持，将通过多次调用实现）
   */
  async imageToVideo(imageUrl: string, prompt: string, resolution: string = '1080P', n: number = 1): Promise<string> {
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
        audio: true,  // 启用音频
        ...(n > 1 ? { n: n } : {})  // 如果 n > 1，尝试传递 n 参数（API 可能不支持）
      }
    };

    console.log('[API] 图生视频请求:', {
      url,
      model: 'wan2.5-i2v-preview',
      resolution,
      audio: true,
      n: n,
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
    urls?: string[];  // 多个结果 URL（当 n > 1 时）
    progress?: number;
    error?: string;
  }> {
    // DashScope 异步任务查询端点
    const url = `${this.taskBaseUrl}/tasks/${taskId}`;

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
      // 检测QPS限制错误（429状态码或相关错误信息）
      const errorMessage = data.message || response.statusText || '';
      const errorCode = data.code || '';
      const isQpsLimit = response.status === 429 || 
                         errorCode.includes('Throttling') || 
                         errorCode.includes('Throttled') ||
                         errorMessage.toLowerCase().includes('qps') ||
                         errorMessage.toLowerCase().includes('限流') ||
                         errorMessage.toLowerCase().includes('rate limit') ||
                         errorMessage.toLowerCase().includes('throttling');
      
      if (isQpsLimit) {
        throw new Error(
          `查询任务失败：超过QPS限制（查询接口默认QPS为20）。\n\n` +
          `原因：同时查询的任务数量过多，超过了API的QPS限制。\n\n` +
          `建议：\n` +
          `1. 减少同时生成的任务数量（建议每次不超过10个）\n` +
          `2. 分批生成视频，等待前一批完成后再生成下一批\n` +
          `3. 如需更高频查询，可配置异步任务回调（当前版本暂不支持）\n\n` +
          `错误详情：${errorMessage || errorCode || response.statusText}`
        );
      }
      
      throw new Error(`查询任务失败 [${response.status}]: ${errorMessage || response.statusText}`);
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
    let urls_result: string[] | undefined;
    if (status === 'completed') {
      // 文生图结果（可能返回多个）
      if (data.output?.results && data.output.results.length > 0) {
        urls_result = data.output.results.map(r => r.url);
        url_result = urls_result[0]; // 保持向后兼容，第一个 URL
      }
      // 视频结果（可能返回多个）
      if (data.output?.video_urls && data.output.video_urls.length > 0) {
        urls_result = data.output.video_urls;
        url_result = urls_result[0]; // 保持向后兼容，第一个 URL
      } else if (data.output?.video_url) {
        // 单个视频 URL（向后兼容）
        url_result = data.output.video_url;
        urls_result = [data.output.video_url];
      }
    }

    return {
      status,
      url: url_result,
      urls: urls_result,
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
   * 使用 qwen-image-edit-plus 模型，支持 size 参数输出16:9比例
   * 参考：https://help.aliyun.com/zh/dashscope/developer-reference/api-details-9
   */
  async composeMultipleImages(
    imageBase64Array: string[],  // Base64 Data URL 格式的图片数组（data:image/png;base64,...）
    prompt: string,               // 合成描述
    size: string = '1280*720',   // 输出图片尺寸，默认16:9比例
    n: number = 1                 // 生成图片数量
  ): Promise<string> {
    const url = `${this.baseUrl}/multimodal-generation/generation`;

    // 构建 content 数组：先添加所有图片，最后添加文本提示词
    const content: Array<{ image: string } | { text: string }> = [];
    
    // 添加所有图片
    for (const imageBase64 of imageBase64Array) {
      content.push({ image: imageBase64 });
    }
    
    // 最后添加文本提示词
    content.push({ text: prompt });

    const body = {
      model: 'qwen-image-edit-plus',
      input: {
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      },
      parameters: {
        n: n,  // 输出图片数量
        size: size,  // 输出尺寸，支持16:9比例
        prompt_extend: true,
        watermark: false
      }
    };

    console.log('[API] 多图合成请求:', {
      url,
      model: 'qwen-image-edit-plus',
      imageCount: imageBase64Array.length,
      size: size,
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

    const data = await response.json() as APIResponse;

    console.log('[API] 多图合成响应:', {
      status: response.status,
      ok: response.ok,
      code: data.code,
      message: data.message,
      request_size: size,
      has_choices: !!data.output?.choices
    });

    // 检查错误
    if (!response.ok || data.code) {
      const errorMsg = data.message || response.statusText;
      throw new Error(`多图合成失败 [${response.status}]: ${errorMsg}`);
    }

    // qwen-image-edit-plus 是同步API，直接返回图片URL
    if (!data.output?.choices || data.output.choices.length === 0) {
      throw new Error(`未返回图片结果。响应: ${JSON.stringify(data)}`);
    }

    const firstChoice = data.output.choices[0];
    if (!firstChoice.message?.content || firstChoice.message.content.length === 0) {
      throw new Error(`未返回图片URL。响应: ${JSON.stringify(data)}`);
    }

    // 取第一张图片的URL
    const firstImage = firstChoice.message.content[0];
    if (!firstImage.image) {
      throw new Error(`图片URL格式错误。响应: ${JSON.stringify(data)}`);
    }

    // 返回图片URL（同步模式，直接返回URL）
    return firstImage.image;
  }

  /**
   * 单图编辑（图像编辑）
   * 使用 qwen-image-edit-plus 模型，支持单图编辑和多图合成
   * 参考：https://help.aliyun.com/zh/dashscope/developer-reference/api-details-9
   */
  async editImage(
    imageBase64: string,          // Base64 Data URL 格式的图片（data:image/png;base64,...）
    prompt: string,               // 编辑描述
    additionalImages?: string[],   // 可选的额外参考图片（用于多图合成场景）
    size: string = '1280*720',    // 输出图片尺寸，默认16:9比例
    n: number = 1                 // 生成图片数量
  ): Promise<string> {
    const url = `${this.baseUrl}/multimodal-generation/generation`;

    // 构建 content 数组：先添加所有图片，最后添加文本提示词
    const content: Array<{ image: string } | { text: string }> = [];
    
    // 添加主图片
    content.push({ image: imageBase64 });
    
    // 添加额外的参考图片（如果有）
    if (additionalImages && additionalImages.length > 0) {
      for (const imageBase64 of additionalImages) {
        content.push({ image: imageBase64 });
      }
    }
    
    // 最后添加文本提示词
    content.push({ text: prompt });

    const body = {
      model: 'qwen-image-edit-plus',
      input: {
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      },
      parameters: {
        n: n,
        negative_prompt: ' ',
        prompt_extend: true,
        watermark: false
      }
    };

    console.log('[API] 图像编辑请求:', {
      url,
      model: 'qwen-image-edit-plus',
      imageCount: 1 + (additionalImages?.length || 0),
      size: size,
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

    const data = await response.json() as APIResponse;

    console.log('[API] 图像编辑响应:', {
      status: response.status,
      ok: response.ok,
      code: data.code,
      message: data.message,
      has_choices: !!data.output?.choices
    });

    // 检查错误
    if (!response.ok || data.code) {
      const errorMsg = data.message || response.statusText;
      throw new Error(`图像编辑失败 [${response.status}]: ${errorMsg}`);
    }

    // qwen-image-edit-plus 是同步API，直接返回图片URL
    if (!data.output?.choices || data.output.choices.length === 0) {
      throw new Error(`未返回图片结果。响应: ${JSON.stringify(data)}`);
    }

    const firstChoice = data.output.choices[0];
    if (!firstChoice.message?.content || firstChoice.message.content.length === 0) {
      throw new Error(`未返回图片URL。响应: ${JSON.stringify(data)}`);
    }

    // 取第一张图片的URL
    const firstImage = firstChoice.message.content[0];
    if (!firstImage.image) {
      throw new Error(`图片URL格式错误。响应: ${JSON.stringify(data)}`);
    }

    // 返回图片URL（同步模式，直接返回URL）
    return firstImage.image;
  }

  /**
   * 首尾帧生成视频
   * 使用 wan2.2-kf2v-flash 模型
   * 参考：https://help.aliyun.com/zh/dashscope/developer-reference/api-details-9
   */
  async firstLastFrameToVideo(
    firstFrameUrl: string,  // Base64 Data URL 格式的首帧（data:image/png;base64,...）
    lastFrameUrl: string,   // Base64 Data URL 格式的尾帧（data:image/png;base64,...）
    prompt: string,          // 视频描述
    resolution: string = '720P'  // 分辨率：720P, 1080P 等
  ): Promise<string> {
    const url = `${this.baseUrl}/image2video/video-synthesis`;

    const body = {
      model: 'wan2.2-kf2v-flash',
      input: {
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        prompt: prompt
      },
      parameters: {
        resolution: resolution,
        prompt_extend: true
      }
    };

    console.log('[API] 首尾帧生成视频请求:', {
      url,
      model: 'wan2.2-kf2v-flash',
      resolution,
      prompt: prompt.substring(0, 100),
      firstFrameFormat: firstFrameUrl.startsWith('data:') ? 'base64' : 'url',
      lastFrameFormat: lastFrameUrl.startsWith('data:') ? 'base64' : 'url'
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable',  // 异步模式
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as APIResponse;

    console.log('[API] 首尾帧生成视频响应:', {
      status: response.status,
      ok: response.ok,
      code: data.code,
      message: data.message,
      task_id: data.output?.task_id
    });

    if (!response.ok || data.code) {
      throw new Error(`首尾帧生成视频失败 [${response.status}]: ${data.message || response.statusText}`);
    }

    // wan2.2 API 使用异步模式，返回 task_id
    if (!data.output?.task_id) {
      throw new Error(`未返回任务 ID。响应: ${JSON.stringify(data)}`);
    }

    return data.output.task_id;
  }
}


