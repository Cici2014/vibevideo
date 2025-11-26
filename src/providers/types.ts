/**
 * 视频 AI Provider 相关类型定义
 */

/**
 * 视频生成选项
 */
export type SupportedVideoSize = '720x1280' | '1280x720' | '1024x1792' | '1792x1024';

export interface VideoOptions {
  /** 兼容旧字段：时长（秒） */
  duration?: number;
  /** 官方 seconds 参数（仅允许 4/8/12） */
  seconds?: 4 | 8 | 12;
  /** 兼容旧字段：分辨率描述，如 720P、1280*720 等 */
  resolution?: string;
  /** 长宽比，如 16:9、9:16 等 */
  aspectRatio?: string;
  /** 官方 size 参数，格式为 widthxheight */
  size?: SupportedVideoSize;
  /** 视频质量 */
  quality?: 'standard' | 'pro';
  /** 运动幅度 */
  motion?: 'low' | 'medium' | 'high';
}

/**
 * 图片生成选项
 */
export interface ImageOptions {
  /** 尺寸 */
  size?: string;
  /** 风格 */
  style?: string;
}

/**
 * 任务状态
 */
export interface VideoJob {
  id?: string;
  object?: string;
  model?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  prompt?: string;
  remixed_from_video_id?: string;
  created_at?: number;
  completed_at?: number;
  expires_at?: number;
  seconds?: string;
  size?: string;
  quality?: string;
  video_url?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export interface VideoListOptions {
  after?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface TaskStatus {
  /** 状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** 进度（0-100） */
  progress?: number;
  /** 资源 URL（图片或视频） */
  url?: string;
  /** 多个资源 URL（当生成多个图片时） */
  urls?: string[];
  /** 错误信息（失败时的详细原因） */
  error?: string;
  /** 原始任务信息（用于展示更多字段） */
  job?: VideoJob;
}

/**
 * 视频 AI Provider 接口
 */
export interface VideoAIProvider {
  /** Provider 名称 */
  readonly name: string;

  /**
   * 文生图（生成初始帧）
   */
  textToImage(prompt: string, options?: ImageOptions): Promise<string>;

  /**
   * 图生视频（基于首帧）
   * @param n 生成视频数量（可选）
   */
  imageToVideo(imagePath: string, prompt: string, options?: VideoOptions, n?: number): Promise<string>;

  /**
   * 纯文生视频（无首帧）
   * @param n 生成视频数量（可选）
   */
  textToVideo(prompt: string, options?: VideoOptions, n?: number): Promise<string>;

  /**
   * 查询任务状态
   */
  checkStatus(taskId: string): Promise<TaskStatus>;

  /**
   * 下载资源（图片或视频）
   */
  downloadResource(taskId: string, savePath: string): Promise<void>;

  /**
   * Remix 已生成的视频（部分 Provider 支持）
   */
  remixVideo?(videoId: string, prompt: string, options?: VideoOptions): Promise<string>;

  /**
   * 列出历史视频任务
   */
  listVideos?(options?: VideoListOptions): Promise<VideoJob[]>;

  /**
   * 获取单个视频任务
   */
  retrieveVideo?(videoId: string): Promise<VideoJob>;

  /**
   * 删除视频任务
   */
  deleteVideo?(videoId: string): Promise<void>;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  /** Provider 类型 */
  provider: 'tongyi-wanxiang' | 'replicate' | 'google' | 'sora';
  /** 是否已配置 */
  configured: boolean;
}

/**
 * 通义万相配置（使用 DashScope API Key）
 */
export interface TongyiConfig {
  apiKey: string;
  /** 自定义 API 基础 URL（用于本地部署模型），例如：http://localhost:8000/v1/services/aigc */
  baseUrl?: string;
}

/**
 * Replicate 配置
 */
export interface ReplicateConfig {
  /** Replicate API Token（访问 https://replicate.com/account/api-tokens 获取） */
  apiKey: string;
  /** 文生图模型（可选，默认使用 SDXL） */
  imageModel?: string;
  /** 视频生成模型（可选，默认使用 zeroscope-v2-xl） */
  videoModel?: string;
}


/**
 * Google 配置
 */
export interface GoogleConfig {
  /** Google API Key（访问 https://makersuite.google.com/app/apikey 获取） */
  apiKey: string;
  /** 自定义 API 基础 URL（可选，默认使用 https://generativelanguage.googleapis.com/v1beta） */
  baseUrl?: string;
  /** 图像生成模型（可选，默认使用 gemini-3-pro-image-preview） */
  imageModel?: string;
  /** 视频生成模型（可选，默认使用 veo-3） */
  videoModel?: string;
  /** Vertex AI 项目 ID（可选，如果使用 Vertex AI） */
  projectId?: string;
  /** Vertex AI 位置（可选，默认使用 us-central1） */
  location?: string;
}

/**
 * Sora 配置（OpenAI Sora）
 */
export interface SoraConfig {
  /** OpenAI API Key（访问 https://platform.openai.com/api-keys 获取） */
  apiKey: string;
  /** 自定义 API 基础 URL（可选，默认使用 https://api.openai.com/v1） */
  baseUrl?: string;
  /** 视频生成模型（可选，默认使用 sora-2） */
  videoModel?: string;
  /** 图像生成模型（可选，默认使用 dall-e-3，用于文生图） */
  imageModel?: string;
}

