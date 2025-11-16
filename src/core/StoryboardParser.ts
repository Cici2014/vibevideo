/**
 * 分镜脚本解析器 - 解析 Markdown 格式的分镜
 */

import * as path from 'path';
import { Storyboard, QualityCheckResult } from '../types';
import { readFile } from '../utils/fileSystem';

export class StoryboardParser {
  /**
   * 解析 Markdown 分镜文件
   */
  async parseMarkdown(filePath: string): Promise<Storyboard> {
    const content = await readFile(filePath);
    const fileName = path.basename(filePath, '.md');

    // 提取标题
    const title = this.extractTitle(content) || fileName;

    // 提取元数据
    const duration = this.extractDuration(content);
    const firstFrame = this.extractFirstFrame(content);
    const firstFramePrompt = this.extractFirstFramePrompt(content);
    const referenceImages = this.extractReferenceImages(content);

    // 提取描述
    const description = this.extractDescription(content);

    return {
      id: fileName,
      title,
      description,
      duration,
      firstFrame,
      firstFramePrompt,
      referenceImages,
      filePath
    };
  }

  /**
   * 提取标题（从 # 标题）
   */
  private extractTitle(content: string): string | undefined {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : undefined;
  }

  /**
   * 提取时长（支持多种格式）
   */
  private extractDuration(content: string): number | undefined {
    const patterns = [
      /[*-]\s*\*?\*?时长\*?\*?[：:]\s*(\d+)\s*秒/i,
      /[*-]\s*\*?\*?duration\*?\*?[：:]\s*(\d+)/i,
      /#.*\((\d+)\s*秒\)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * 提取首帧路径
   */
  private extractFirstFrame(content: string): string | undefined {
    const patterns = [
      /[*-]\s*\*?\*?首帧\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?firstFrame\*?\*?[：:]\s*(.+)$/im,
      /\[首帧[：:]\s*(.+)\]/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * 提取生成首帧的提示词
   */
  private extractFirstFramePrompt(content: string): string | undefined {
    const patterns = [
      /[*-]\s*\*?\*?生成首帧\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?generateFirstFrame\*?\*?[：:]\s*(.+)$/im,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * 提取参考图路径（支持多张，逗号分隔）
   */
  private extractReferenceImages(content: string): string[] | undefined {
    const patterns = [
      /[*-]\s*\*?\*?参考图\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?参考图片\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?referenceImage\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?referenceImages\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?ref-img\*?\*?[：:]\s*(.+)$/im,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // 分割多个路径（支持逗号、中文逗号、空格分隔）
        const paths = match[1]
          .split(/[,，\s]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
        return paths.length > 0 ? paths : undefined;
      }
    }

    return undefined;
  }

  /**
   * 提取描述（正文内容，去掉标题和元数据）
   */
  private extractDescription(content: string): string {
    let result = content;

    // 去掉 frontmatter
    result = result.replace(/^---[\s\S]*?---/m, '');

    // 去掉标题行
    result = result.replace(/^#.*$/m, '');

    // 去掉元数据行（- ** 开头的）
    result = result.replace(/^[*-]\s*\*\*.*\*\*[：:].*$/gm, '');

    // 去掉方括号标记
    result = result.replace(/\[首帧[：:].*\]/gi, '');
    result = result.replace(/\[生成首帧[：:].*\]/gi, '');
    result = result.replace(/\[参考图[：:].*\]/gi, '');
    result = result.replace(/\[参考图片[：:].*\]/gi, '');

    // 清理空行，保留段落结构
    result = result.trim();

    return result;
  }

  /**
   * 提取主体列表（- **主体**: 猪大哥, 猪二哥）
   */
  extractSubjects(content: string): string[] {
    const patterns = [
      /[*-]\s*\*?\*?主体\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?subjects?\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?使用角色\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?characters?\*?\*?[：:]\s*(.+)$/im,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // 分割：猪大哥, 猪二哥, 猪小弟
        return match[1]
          .split(/[,，、]/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
    }

    return [];
  }

  /**
   * 提取场景描述
   */
  extractScene(content: string): string | undefined {
    const patterns = [
      /[*-]\s*\*?\*?场景\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?scene\*?\*?[：:]\s*(.+)$/im,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * 提取构图描述
   */
  extractLayout(content: string): string | undefined {
    const patterns = [
      /[*-]\s*\*?\*?构图\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?layout\*?\*?[：:]\s*(.+)$/im,
      /[*-]\s*\*?\*?位置\*?\*?[：:]\s*(.+)$/im,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * 质量检查（友好建议，不阻止使用）
   */
  checkQuality(storyboard: Storyboard): QualityCheckResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const desc = storyboard.description;
    const length = desc.length;

    // 检查描述长度
    if (length < 30) {
      warnings.push('描述太短（少于30字），可能无法生成高质量视频');
    } else if (length < 100) {
      suggestions.push('描述较短，建议扩充到 100 字以上');
    }

    // 检查关键元素（非强制）
    const keywords = {
      运镜: ['镜头', '推', '拉', '摇', '移', '环绕', '跟随', 'camera', 'dolly', 'pan', 'zoom'],
      光线: ['光', '阳光', '灯光', '照', '投射', 'light', '明亮', '柔和'],
      动作: ['动', '移动', '上升', '下降', '旋转', 'motion', '缓慢', '快速'],
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (!this.hasAnyKeyword(desc, words)) {
        suggestions.push(`建议添加${category}描述`);
      }
    }

    // 评级
    let rating: QualityCheckResult['rating'];
    if (warnings.length > 0) {
      rating = 'needs-improvement';
    } else if (suggestions.length === 0 && length >= 150) {
      rating = 'excellent';
    } else if (suggestions.length <= 1) {
      rating = 'good';
    } else {
      rating = 'fair';
    }

    return {
      isValid: length >= 20, // 最低要求：20字
      rating,
      warnings,
      suggestions
    };
  }

  /**
   * 检查是否包含任何关键词
   */
  private hasAnyKeyword(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
  }
}

