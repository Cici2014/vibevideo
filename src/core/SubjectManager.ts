/**
 * 主体/角色管理器
 * 管理 subjects/ 目录中的主体文件
 */

import * as path from 'path';
import { Subject } from '../types';
import { listFiles, fileExists, readFile } from '../utils/fileSystem';

export class SubjectManager {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 发现所有主体
   */
  async discoverSubjects(): Promise<Subject[]> {
    const subjectsDir = path.join(this.workspaceRoot, 'subjects');
    const mdFiles = await listFiles(subjectsDir, '.md');

    const subjects: Subject[] = [];

    for (const mdPath of mdFiles) {
      const id = path.basename(mdPath, '.md');
      const imagePath = mdPath.replace('.md', '.png');
      const exists = await fileExists(imagePath);

      // 读取 Markdown 内容作为提示词
      let prompt = '';
      try {
        prompt = await readFile(mdPath);
        // 去掉标题行
        prompt = prompt.replace(/^#.*$/m, '').trim();
      } catch (error) {
        console.error(`读取主体文件失败: ${mdPath}`, error);
      }

      subjects.push({
        id,
        name: id,
        mdPath,
        imagePath,
        exists,
        prompt
      });
    }

    return subjects.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 获取需要生成的主体（有 .md 但没有 .png）
   */
  async getSubjectsToGenerate(): Promise<Subject[]> {
    const allSubjects = await this.discoverSubjects();
    return allSubjects.filter(s => !s.exists && s.prompt.length > 0);
  }

  /**
   * 获取单个主体
   */
  async getSubject(id: string): Promise<Subject | undefined> {
    const subjects = await this.discoverSubjects();
    return subjects.find(s => s.id === id);
  }

  /**
   * 检查主体图片是否存在
   */
  async subjectExists(id: string): Promise<boolean> {
    const imagePath = path.join(this.workspaceRoot, 'subjects', `${id}.png`);
    return await fileExists(imagePath);
  }

  /**
   * 获取主体图片的绝对路径
   */
  getSubjectImagePath(id: string): string {
    return path.join(this.workspaceRoot, 'subjects', `${id}.png`);
  }
}

