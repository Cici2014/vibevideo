/**
 * 场景管理器
 * 管理 scenes/ 目录中的场景文件
 */

import * as path from 'path';
import { Scene } from '../types';
import { listFiles, fileExists, readFile } from '../utils/fileSystem';

export class SceneManager {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 发现所有场景
   */
  async discoverScenes(): Promise<Scene[]> {
    const scenesDir = path.join(this.workspaceRoot, 'scenes');
    const mdFiles = await listFiles(scenesDir, '.md');

    const scenes: Scene[] = [];

    for (const mdPath of mdFiles) {
      const id = path.basename(mdPath, '.md');
      const imagePath = mdPath.replace('.md', '.png');
      const exists = await fileExists(imagePath);

      // 读取 Markdown 内容作为提示词
      let prompt = '';
      let referenceImages: string[] | undefined;
      try {
        const content = await readFile(mdPath);
        // 提取参考图
        referenceImages = this.extractReferenceImages(content);
        // 去掉标题行和元数据行
        prompt = content.replace(/^#.*$/m, '').trim();
        // 去掉元数据行（- ** 开头的）
        prompt = prompt.replace(/^[*-]\s*\*\*.*\*\*[：:].*$/gm, '').trim();
      } catch (error) {
        console.error(`读取场景文件失败: ${mdPath}`, error);
      }

      scenes.push({
        id,
        name: id,
        mdPath,
        imagePath,
        exists,
        prompt,
        referenceImages
      });
    }

    return scenes.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 获取需要生成的场景（有 .md 但没有 .png）
   */
  async getScenesToGenerate(): Promise<Scene[]> {
    const allScenes = await this.discoverScenes();
    return allScenes.filter(s => !s.exists && s.prompt.length > 0);
  }

  /**
   * 获取单个场景
   */
  async getScene(id: string): Promise<Scene | undefined> {
    const scenes = await this.discoverScenes();
    return scenes.find(s => s.id === id);
  }

  /**
   * 检查场景图片是否存在
   */
  async sceneExists(id: string): Promise<boolean> {
    const imagePath = path.join(this.workspaceRoot, 'scenes', `${id}.png`);
    return await fileExists(imagePath);
  }

  /**
   * 获取场景图片的绝对路径
   */
  getSceneImagePath(id: string): string {
    return path.join(this.workspaceRoot, 'scenes', `${id}.png`);
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
}

