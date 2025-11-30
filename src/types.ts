/**
 * Vibe Video 核心类型定义
 */

/**
 * 分镜脚本（从 Markdown 解析）
 */
export interface Storyboard {
  /** 场景ID（从文件名提取） */
  id: string;
  /** 场景标题（从 # 标题提取） */
  title: string;
  /** 视觉描述（正文内容） */
  description: string;
  /** 时长（秒），可选 */
  duration?: number;
  /** 首帧图片路径，可选 */
  firstFrame?: string;
  /** 尾帧图片路径，可选 */
  lastFrame?: string;
  /** 生成首帧的提示词，可选 */
  firstFramePrompt?: string;
  /** 视频提示词（用于图生视频），可选 */
  videoPrompt?: string;
  /** 参考图路径（ref-img/ 目录中的图片），可选，支持多张（逗号分隔） */
  referenceImages?: string[];
  /** 文件路径 */
  filePath: string;
}

/**
 * 项目配置
 */
export interface VVProjectConfig {
  /** 项目名称 */
  name: string;
  /** 视频尺寸 */
  videoSize: {
    width: number;
    height: number;
  };
  /** 帧率 */
  fps: number;
  /** 创建时间 */
  createdAt: string;
  /** 版本 */
  version: string;
}

/**
 * 质量检查结果
 */
export interface QualityCheckResult {
  /** 是否通过基本检查 */
  isValid: boolean;
  /** 质量评级 */
  rating: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  /** 警告信息 */
  warnings: string[];
  /** 建议 */
  suggestions: string[];
}

/**
 * 项目统计信息
 */
export interface ProjectStats {
  /** 分镜总数 */
  totalStoryboards: number;
  /** 已生成首帧数 */
  generatedFirstFrames: number;
  /** 已生成视频数 */
  generatedVideos: number;
  /** 总时长（秒） */
  totalDuration: number;
}

/**
 * 主体/角色
 */
export interface Subject {
  /** ID（文件名） */
  id: string;
  /** 名称 */
  name: string;
  /** Markdown 文件路径 */
  mdPath: string;
  /** 图片路径 */
  imagePath: string;
  /** 图片是否已生成 */
  exists: boolean;
  /** 提示词（从 Markdown 读取） */
  prompt: string;
  /** 参考图路径（支持多张，逗号分隔），可选 */
  referenceImages?: string[];
}

/**
 * 场景
 */
export interface Scene {
  /** ID（文件名） */
  id: string;
  /** 名称 */
  name: string;
  /** Markdown 文件路径 */
  mdPath: string;
  /** 图片路径 */
  imagePath: string;
  /** 图片是否已生成 */
  exists: boolean;
  /** 提示词（从 Markdown 读取） */
  prompt: string;
  /** 参考图路径（支持多张，逗号分隔），可选 */
  referenceImages?: string[];
}

/**
 * 分镜（扩展：支持主体引用）
 */
export interface StoryboardWithSubjects extends Storyboard {
  /** 使用的主体列表 */
  subjects?: string[];
  /** 场景描述 */
  sceneDescription?: string;
  /** 构图描述 */
  layout?: string;
}

/**
 * RunningHub 节点信息
 */
export interface RunningHubNodeInfo {
  nodeId: string;
  fieldName: string;
  fieldValue: string;
}

/**
 * RunningHub 任务输出
 */
export interface RunningHubTaskOutput {
  fileUrl: string;
  fileType: string;
  taskCostTime?: string;
  nodeId?: string;
}

/**
 * RunningHub 配置（工作流配置硬编码在代码中）
 */
export interface RunningHubConfig {
  apiKey: string;
  baseUrl?: string;
}

