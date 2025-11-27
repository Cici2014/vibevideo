/**
 * Sora Provider
 * 基于 OpenAI Sora API 实现
 * 参考：https://platform.openai.com/docs/api-reference/videos
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  VideoAIProvider,
  VideoOptions,
  ImageOptions,
  TaskStatus,
  SoraConfig,
  VideoListOptions,
  VideoJob,
  SupportedVideoSize
} from './types';
import { imageToBase64 } from '../utils/imageEncoder';
import { backupExistingFile } from '../utils/fileSystem';

/**
 * Sora Provider 客户端接口
 * 提供多图合成等高级功能
 */
class SoraProviderClient {
  private provider: SoraProvider;

  constructor(provider: SoraProvider) {
    this.provider = provider;
  }

  /**
   * 多图合成（图片编辑）
   * 使用 Sora 的 editImage 方法，支持多图输入合成
   */
  async composeMultipleImages(
    imageBase64Array: string[],  // Base64 Data URL 格式的图片数组（data:image/png;base64,...）
    prompt: string,               // 合成描述
    size: string = '1280*720',   // 输出图片尺寸（仅供参考，实际由 API 决定）
    n: number = 1                 // 生成图片数量（Sora API 通常只支持 n=1）
  ): Promise<string> {
    console.log('[Sora] 多图合成请求:', { 
      imageCount: imageBase64Array.length, 
      size, 
      prompt: prompt.substring(0, 100) 
    });

    if (imageBase64Array.length === 0) {
      throw new Error('至少需要提供一张图片');
    }

    // 使用第一张图片作为主图片，其余作为额外参考图片
    const mainImage = imageBase64Array[0];
    const additionalImages = imageBase64Array.length > 1 ? imageBase64Array.slice(1) : undefined;

    // 调用 editImage 方法进行多图合成
    const result = await this.provider.editImage(mainImage, prompt, additionalImages);

    // editImage 返回的是 URL 或 file:// 路径
    // 如果是 file:// 路径，说明是本地临时文件，直接返回文件路径（不带 file:// 前缀）
    // 调用者可以直接使用该文件路径，无需下载
    if (result.startsWith('file://')) {
      const filePath = result.substring(7); // 移除 file:// 前缀
      console.log('[Sora] 多图合成成功，返回本地文件路径:', filePath);
      return filePath;
    }

    // 如果是 URL，直接返回
    console.log('[Sora] 多图合成成功，返回 URL:', result);
    return result;
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    return this.provider.downloadResource(taskId, savePath);
  }
}

const SUPPORTED_VIDEO_SIZES: SupportedVideoSize[] = ['720x1280', '1280x720', '1024x1792', '1792x1024'];
const DEFAULT_VIDEO_SIZE: SupportedVideoSize = '720x1280';
const ALLOWED_VIDEO_SECONDS: Array<4 | 8 | 12> = [4, 8, 12];

/**
 * OpenAI API 响应类型
 */
interface OpenAIResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * OpenAI 视频生成响应
 * 参考：https://platform.openai.com/docs/api-reference/videos
 */
type VideoGenerationResponse = VideoJob;

interface VideoListResponse {
  object?: string;
  data?: VideoJob[];
}

/**
 * Sora Provider
 * 
 * 支持情况：
 * ✅ 文生图：支持（使用 gpt-image-1 或 DALL-E 3 模型）
 * ✅ 图片编辑：支持（使用 gpt-image-1 模型，支持多图合成）
 * ✅ 图生视频：支持（使用 Sora 模型）
 * ✅ 文生视频：支持（使用 Sora 模型）
 * ✅ 视频状态查询：支持（轮询任务状态）
 * 
 * API 参考：
 * - 图片生成：https://platform.openai.com/docs/api-reference/images/create
 * - 图片编辑：https://platform.openai.com/docs/api-reference/images/edits
 * - 视频生成：https://platform.openai.com/docs/api-reference/videos
 */
export class SoraProvider implements VideoAIProvider {
  readonly name = 'OpenAI Sora';
  public readonly client: SoraProviderClient;
  private apiKey: string;
  private baseUrl: string;
  private videoModel: string;
  private imageModel: string;

  constructor(config: SoraConfig) {
    this.apiKey = config.apiKey;
    // 默认使用 OpenAI API
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    // 默认视频生成模型
    this.videoModel = config.videoModel || 'sora-2';
    // 默认图像生成模型（支持 gpt-image-1 和 dall-e-3）
    // 参考：https://platform.openai.com/docs/api-reference/images/create
    this.imageModel = config.imageModel || 'gpt-image-1';
    
    // 初始化 client
    this.client = new SoraProviderClient(this);
  }

  /**
   * 文生图（生成初始帧）
   * 支持 gpt-image-1 和 dall-e-3 模型
   */
  async textToImage(prompt: string, options?: ImageOptions, n?: number): Promise<string> {
    console.log('[Sora] 文生图请求:', { prompt, size: options?.size, n });

    // 解析尺寸（格式：宽度*高度，例如：1280*720）
    // Sora 支持的尺寸：'1024x1024'（1:1）、'1792x1024'（16:9 横屏）、'1024x1792'（9:16 竖屏）
    let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
    if (options?.size) {
      const sizeParts = options.size.split('*');
      if (sizeParts.length === 2) {
        const width = parseInt(sizeParts[0].trim());
        const height = parseInt(sizeParts[1].trim());
        
        if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
          // 精确匹配 Sora 支持的尺寸
          if (width === 1024 && height === 1024) {
            size = '1024x1024';
          } else if (width === 1792 && height === 1024) {
            size = '1792x1024';
          } else if (width === 1024 && height === 1792) {
            size = '1024x1792';
          } else {
            // 根据长宽比映射到最接近的尺寸
            const aspectRatio = width / height;
            
            // 计算与各个支持尺寸的长宽比差异
            const ratios = {
              '1024x1024': 1.0,      // 1:1
              '1792x1024': 1792 / 1024,  // ≈ 1.75 (16:9)
              '1024x1792': 1024 / 1792   // ≈ 0.57 (9:16)
            };
            
            // 找到最接近的长宽比
            let closestSize: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
            let minDiff = Math.abs(aspectRatio - ratios['1024x1024']);
            
            for (const [supportedSize, supportedRatio] of Object.entries(ratios)) {
              const diff = Math.abs(aspectRatio - supportedRatio);
              if (diff < minDiff) {
                minDiff = diff;
                closestSize = supportedSize as '1024x1024' | '1792x1024' | '1024x1792';
              }
            }
            
            size = closestSize;
            
            console.log(`[Sora] 图片尺寸映射: ${width}*${height} (${aspectRatio.toFixed(2)}) → ${size}`);
          }
        }
      }
    }

    // gpt-image-1 和 DALL-E 3 通常只支持 n=1
    const numOutputs = n !== undefined ? Math.min(n, 1) : 1;

    // 构建请求 URL
    const url = `${this.baseUrl}/images/generations`;

    // 构建请求体
    // 根据官方 API 文档：https://platform.openai.com/docs/api-reference/images/create
    const body: any = {
      model: this.imageModel,
      prompt: prompt,
      n: numOutputs,
      size: size
    };

    // 可选参数（仅在对模型支持时添加）
    // quality 参数仅适用于某些模型（如 dall-e-3）
    if (this.imageModel === 'dall-e-3') {
      body.quality = 'standard';
    }
    // response_format 默认为 'url'，如果需要可以添加
    // body.response_format = 'url';

    console.log('[Sora] 图像生成请求:', {
      url,
      model: this.imageModel,
      size
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`图像生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;

    if (data.error) {
      throw new Error(`图像生成失败: ${data.error.message || '未知错误'}`);
    }

    // 提取图像 URL
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('未返回图像 URL');
    }

    console.log('[Sora] 图像生成成功，URL:', imageUrl);
    console.log('[Sora] 请求的图片尺寸:', size, '（注意：实际返回的图片尺寸可能因 API 服务限制而不同）');
    
    // 返回 URL（需要调用者下载）
    return imageUrl;
  }

  /**
   * 图片编辑（多图合成）
   * 支持多张图片合成到一张图片中
   * 参考：https://platform.openai.com/docs/api-reference/images/edits
   */
  async editImage(
    imageBase64: string,          // Base64 Data URL 格式的图片（data:image/png;base64,...）
    prompt: string,               // 编辑描述
    additionalImages?: string[]   // 可选的额外参考图片（用于多图合成场景）
  ): Promise<string> {
    console.log('[Sora] 图片编辑请求:', { prompt, hasAdditionalImages: !!additionalImages });

    // 构建请求 URL
    // API 参考：https://platform.openai.com/docs/api-reference/images/edits
    const url = `${this.baseUrl}/images/edits`;

    // 构建请求体 - 使用 form-data 格式（根据官方 API 示例）
    const formData = new FormData();
    formData.append('model', this.imageModel);
    formData.append('prompt', prompt);

    // 解析主图片 base64（移除 data URL 前缀）
    let mainImageData = imageBase64;
    if (imageBase64.startsWith('data:')) {
      const commaIndex = imageBase64.indexOf(',');
      if (commaIndex > 0) {
        mainImageData = imageBase64.substring(commaIndex + 1);
      }
    }

    // 将 base64 转换为 Blob 并上传
    const mainImageBlob = new Blob([Buffer.from(mainImageData, 'base64')], { type: 'image/png' });
    formData.append('image[]', mainImageBlob, 'image.png');

    // 添加额外的参考图片（如果有）- 使用 image[] 数组格式
    if (additionalImages && additionalImages.length > 0) {
      for (let i = 0; i < additionalImages.length; i++) {
        let imageData = additionalImages[i];
        // 移除 data URL 前缀（如果有）
        if (imageData.startsWith('data:')) {
          const commaIndex = imageData.indexOf(',');
          if (commaIndex > 0) {
            imageData = imageData.substring(commaIndex + 1);
          }
        }
        
        const imageBlob = new Blob([Buffer.from(imageData, 'base64')], { type: 'image/png' });
        formData.append('image[]', imageBlob, `image-${i + 1}.png`);
      }
    }

    console.log('[Sora] 图片编辑请求:', {
      url,
      model: this.imageModel,
      imageCount: 1 + (additionalImages?.length || 0),
      prompt: prompt.substring(0, 100)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
        // 注意：使用 FormData 时不要手动设置 Content-Type，浏览器会自动设置正确的 boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`图片编辑失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;

    if (data.error) {
      throw new Error(`图片编辑失败: ${data.error.message || '未知错误'}`);
    }

    // 根据官方示例，返回的可能是 b64_json（base64 编码的图片）
    // 参考：官方示例使用 jq -r '.data[0].b64_json' | base64 --decode
    const b64Json = data.data?.[0]?.b64_json;
    if (b64Json) {
      // 将 base64 数据保存到临时文件并返回文件路径
      // 这样调用者可以像处理普通文件一样处理
      const tempDir = path.join(os.tmpdir(), 'vibevideo-openai');
      await fs.promises.mkdir(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, `edited-image-${Date.now()}.png`);
      await fs.promises.writeFile(tempFile, Buffer.from(b64Json, 'base64'));
      
      console.log('[Sora] 图片编辑成功（base64），保存到:', tempFile);
      
      // 返回临时文件路径（注意：调用者需要知道这是本地文件路径）
      // 为了兼容性，返回 file:// URL 格式
      return `file://${tempFile}`;
    }

    // 如果返回的是 URL
    const imageUrl = data.data?.[0]?.url;
    if (imageUrl) {
      console.log('[Sora] 图片编辑成功，URL:', imageUrl);
      return imageUrl;
    }

    throw new Error('未返回图片 URL 或 base64 数据');
  }

  /**
   * 图生视频（基于首帧）
   * 使用 Sora 模型
   */
  async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[Sora] 图生视频请求:', {
      imagePath,
      promptPreview: prompt.substring(0, 80),
      n
    });

    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }

    const imageBase64 = await imageToBase64(imagePath);
    const imageData = imageBase64.split(',')[1];

    const { formData, seconds, size } = this.buildVideoFormData(prompt, options);

    if (imageData) {
      const referenceName = path.basename(imagePath) || 'reference.png';
      const imageBlob = new Blob([Buffer.from(imageData, 'base64')], { type: 'image/png' });
      formData.append('input_reference', imageBlob, referenceName);
    }

    console.log('[Sora] 视频生成参数:', {
      model: this.videoModel,
      size,
      seconds,
      quality: options?.quality,
      hasReference: !!imageData
    });

    const data = await this.createVideoJob(formData);
    return this.handleVideoCreationResponse(data);
  }

  /**
   * 纯文生视频（无首帧）
   * 使用 Sora 模型
   */
  async textToVideo(prompt: string, options?: VideoOptions, n?: number): Promise<string> {
    console.log('[Sora] 文生视频请求:', {
      promptPreview: prompt.substring(0, 80),
      resolution: options?.resolution,
      size: options?.size,
      n
    });

    const { formData, seconds, size } = this.buildVideoFormData(prompt, options);

    console.log('[Sora] 视频生成参数:', {
      model: this.videoModel,
      size,
      seconds,
      quality: options?.quality
    });

    const data = await this.createVideoJob(formData);
    return this.handleVideoCreationResponse(data);
  }

  private buildVideoFormData(prompt: string, options?: VideoOptions) {
    const seconds = this.resolveVideoSeconds(options);
    const size = this.resolveVideoSize(options);
    const formData = new FormData();
    formData.append('model', this.videoModel);
    formData.append('prompt', prompt);
    // 临时规避：OpenAI 现阶段在 multipart 中将 seconds 解析为字符串导致 400，
    // 因此先不传该字段，使用官方默认 4 秒，等官方修复后再恢复。
    // formData.append('seconds', seconds);
    formData.append('size', size);

    if (options?.quality) {
      formData.append('quality', options.quality);
    }

    return { formData, seconds, size };
  }

  private resolveVideoSeconds(options?: VideoOptions): '4' | '8' | '12' {
    if (options?.seconds && ALLOWED_VIDEO_SECONDS.includes(options.seconds)) {
      return options.seconds.toString() as '4' | '8' | '12';
    }

    const duration = options?.duration;
    if (typeof duration === 'number' && !Number.isNaN(duration)) {
      const closest = ALLOWED_VIDEO_SECONDS.reduce((prev, curr) => {
        return Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev;
      });
      return closest.toString() as '4' | '8' | '12';
    }

    return '4';
  }

  private resolveVideoSize(options?: VideoOptions): SupportedVideoSize {
    // 如果直接指定了 size，优先使用（最高优先级）
    if (options?.size && SUPPORTED_VIDEO_SIZES.includes(options.size)) {
      return options.size;
    }

    // 尝试解析分辨率和长宽比
    const parsed = this.parseResolutionToSize(options?.resolution, options?.aspectRatio);
    if (parsed) {
      return parsed;
    }

    // 如果都没有，使用默认值
    return DEFAULT_VIDEO_SIZE;
  }

  /**
   * 根据分辨率和长宽比解析视频尺寸
   * @param resolution 分辨率（如 480P、720P、1080P 或 1280*720）
   * @param aspectRatio 长宽比（如 16:9、9:16 等）
   */
  private parseResolutionToSize(resolution?: string, aspectRatio?: string): SupportedVideoSize | undefined {
    if (!resolution) {
      return undefined;
    }

    const normalizedAspectRatio = aspectRatio?.trim().toLowerCase() || '16:9';

    // 如果已经是 widthxheight 格式，检查是否支持
    const sanitized = resolution.toLowerCase().replace(/[×*]/g, 'x').replace(/\s+/g, '');
    if (SUPPORTED_VIDEO_SIZES.includes(sanitized as SupportedVideoSize)) {
      // 如果明确指定了尺寸，检查是否与长宽比匹配
      // 如果不匹配，根据长宽比重新计算（但优先使用明确指定的尺寸）
      const isPortrait = sanitized === '720x1280' || sanitized === '1024x1792';
      const wantsPortrait = normalizedAspectRatio === '9:16' || normalizedAspectRatio === '3:4';
      
      // 如果明确指定的尺寸与长宽比不匹配，根据长宽比重新选择
      if (isPortrait !== wantsPortrait) {
        // 根据长宽比重新选择最合适的尺寸
        return this.selectSizeByAspectRatio(normalizedAspectRatio, resolution);
      }
      
      return sanitized as SupportedVideoSize;
    }

    // 解析 P 格式的分辨率（480P、720P、1080P）
    const upper = resolution.trim().toUpperCase();
    
    // 根据分辨率和长宽比映射到 Sora 支持的尺寸
    // Sora 支持的尺寸：'720x1280'（竖屏）、'1280x720'（横屏）、'1024x1792'（竖屏高）、'1792x1024'（横屏高）
    
    if (upper === '480P') {
      // 480P 通常使用较低分辨率
      if (normalizedAspectRatio === '9:16' || normalizedAspectRatio === '3:4') {
        return '720x1280'; // 竖屏
      } else {
        // 16:9、4:3、1:1 都使用横屏
        return '1280x720'; // 横屏（虽然 480P 横屏应该是 854x480，但 Sora 不支持，使用最接近的）
      }
    } else if (upper === '720P') {
      if (normalizedAspectRatio === '9:16' || normalizedAspectRatio === '3:4') {
        return '720x1280'; // 竖屏
      } else {
        return '1280x720'; // 横屏（标准 720P 横屏）
      }
    } else if (upper === '1080P') {
      if (normalizedAspectRatio === '9:16' || normalizedAspectRatio === '3:4') {
        return '1024x1792'; // 竖屏高分辨率
      } else {
        return '1792x1024'; // 横屏高分辨率（接近 1080P 横屏）
      }
    }

    return undefined;
  }

  /**
   * 根据长宽比选择最合适的尺寸
   */
  private selectSizeByAspectRatio(aspectRatio: string, resolution?: string): SupportedVideoSize {
    const wantsPortrait = aspectRatio === '9:16' || aspectRatio === '3:4';
    
    // 如果分辨率是 1080P，使用高分辨率选项
    if (resolution && resolution.toUpperCase().includes('1080')) {
      return wantsPortrait ? '1024x1792' : '1792x1024';
    }
    
    // 默认使用标准分辨率
    return wantsPortrait ? '720x1280' : '1280x720';
  }

  private async createVideoJob(formData: FormData): Promise<VideoGenerationResponse> {
    const url = `${this.baseUrl}/videos`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });

    const data = await response.json() as VideoGenerationResponse;

    if (!response.ok) {
      const message = data.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`视频生成失败: ${message}`);
    }

    if (data.error) {
      throw new Error(`视频生成失败: ${data.error.message || '未知错误'}`);
    }

    return data;
  }

  private handleVideoCreationResponse(data: VideoGenerationResponse): string {
    if (data.id) {
      console.log('[Sora] 视频生成任务已提交，taskId:', data.id);
      return data.id;
    }

    if (data.video_url) {
      console.log('[Sora] 视频生成成功，URL:', data.video_url);
      return data.video_url;
    }

    throw new Error('未返回任务 ID 或视频 URL');
  }

  /**
   * 查询任务状态
   */
  async checkStatus(taskId: string): Promise<TaskStatus> {
    // 如果 taskId 是 URL，直接返回完成状态
    if (taskId.startsWith('http')) {
      return {
        status: 'completed',
        progress: 100,
        url: taskId
      };
    }

    // 查询视频生成任务状态
    // API 参考：https://platform.openai.com/docs/api-reference/videos
    const url = `${this.baseUrl}/videos/${taskId}`;

    console.log('[Sora] 查询视频状态:', { taskId });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`查询状态失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const job = await response.json() as VideoGenerationResponse;

    if (job.error) {
      return {
        status: 'failed',
        error: job.error.message || '未知错误',
        job
      };
    }

    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (job.status) {
      status = job.status;
    } else if (job.video_url) {
      status = 'completed';
    }

    const progress =
      typeof job.progress === 'number'
        ? job.progress
        : status === 'completed'
          ? 100
          : status === 'processing'
            ? 50
            : undefined;

    return {
      status,
      progress,
      url: job.video_url,
      job
    };
  }

  /**
   * 下载资源（图片或视频）
   */
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    console.log('[Sora] 下载资源:', { taskId, savePath });

    if (taskId.startsWith('http')) {
      await this.downloadFromUrl(taskId, savePath);
      return;
    }

    const status = await this.checkStatus(taskId);
    if (status.status !== 'completed') {
      throw new Error('资源尚未生成完成');
    }

    try {
      await this.downloadVideoContentFromApi(taskId, savePath);
      console.log('[Sora] 资源下载完成:', savePath);
    } catch (error) {
      // 如果内容接口不可用，回退到状态返回的 URL
      if (status.url) {
        console.warn('[Sora] 内容下载失败，回退到 URL 下载:', error);
        await this.downloadFromUrl(status.url, savePath);
        console.log('[Sora] 资源下载完成（回退 URL）:', savePath);
        return;
      }
      throw error;
    }
  }

  async remixVideo(videoId: string, prompt: string, options?: VideoOptions): Promise<string> {
    console.log('[Sora] 视频 Remix 请求:', {
      videoId,
      promptPreview: prompt.substring(0, 80)
    });

    const body: Record<string, unknown> = {
      prompt
    };

    if (options) {
      if (options.seconds || options.duration) {
        body.seconds = this.resolveVideoSeconds(options);
      }
      if (options.size || options.resolution) {
        body.size = this.resolveVideoSize(options);
      }
      if (options.quality) {
        body.quality = options.quality;
      }
    }

    const url = `${this.baseUrl}/videos/${videoId}/remix`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as VideoGenerationResponse;

    if (!response.ok || data.error) {
      const message = data.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`Remix 请求失败: ${message}`);
    }

    return this.handleVideoCreationResponse(data);
  }

  async listVideos(options?: VideoListOptions): Promise<VideoJob[]> {
    const params = new URLSearchParams();
    if (options?.after) {
      params.set('after', options.after);
    }
    if (typeof options?.limit === 'number') {
      params.set('limit', options.limit.toString());
    }
    if (options?.order) {
      params.set('order', options.order);
    }

    const query = params.toString();
    const url = `${this.baseUrl}/videos${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`获取视频列表失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VideoListResponse;
    return data.data || [];
  }

  async retrieveVideo(videoId: string): Promise<VideoJob> {
    const url = `${this.baseUrl}/videos/${videoId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const job = await response.json() as VideoGenerationResponse;

    if (!response.ok || job.error) {
      const message = job.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`获取视频任务失败: ${message}`);
    }

    return job;
  }

  async deleteVideo(videoId: string): Promise<void> {
    const url = `${this.baseUrl}/videos/${videoId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`删除视频失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log('[Sora] 视频任务已删除:', videoId);
  }

  private async downloadFromUrl(url: string, savePath: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await backupExistingFile(savePath);
    await fs.promises.writeFile(savePath, Buffer.from(buffer));
  }

  private async downloadVideoContentFromApi(videoId: string, savePath: string): Promise<void> {
    const url = `${this.baseUrl}/videos/${videoId}/content`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`内容下载失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const buffer = await response.arrayBuffer();
    await backupExistingFile(savePath);
    await fs.promises.writeFile(savePath, Buffer.from(buffer));
  }

  /**
   * 测试连接
   * 通过尝试一个简单的 API 请求来测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[Sora] 测试连接...');
      
      // 尝试列出模型来测试 API 连接
      const url = `${this.baseUrl}/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Sora] 连接测试失败:', response.status, errorText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[Sora] 连接失败:', error);
      return false;
    }
  }
}

