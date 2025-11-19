/**
 * 项目初始化器
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { VVProjectConfig } from '../types';
import { ensureDir, writeFile, fileExists } from '../utils/fileSystem';
import {
  generateCursorRules,
  generateProjectConfig,
  generateExampleScript,
  generateContextReadme,
  generateStoryboardGuide,
  generateShotGuide,
  generatePromptExamples
} from './TemplateGenerator';

export class ProjectInitializer {
  /**
   * 初始化 Vibe Video 项目
   */
  async initialize(rootPath: string): Promise<void> {
    const projectName = path.basename(rootPath);

    // 1. 创建文件夹结构
    await this.createDirectories(rootPath);

    // 2. 生成配置文件
    await this.generateConfigFiles(rootPath, projectName);

    // 3. 生成 AI 上下文文件
    await this.generateAIContext(rootPath);

    // 4. 创建示例剧本（如果不存在）
    await this.createExampleScript(rootPath);

    // 5. 创建示例主体文件
    await this.createExampleSubjects(rootPath);

    vscode.window.showInformationMessage(
      `✓ Vibe Video 项目初始化完成！现在可以使用 Cursor AI 生成分镜脚本了。`
    );
  }

  /**
   * 创建标准文件夹结构
   */
  private async createDirectories(rootPath: string): Promise<void> {
    const dirs = [
      'subjects',                  // 主体/角色目录
      'scenes',                    // 场景目录
      'storyboards',
      'ref-img',                   // 参考图目录（用于生成首帧）
      'video-clip',                // 视频片段目录
      '.temp',                     // 临时图片目录（隐藏目录）
      'first-frames',
      'output',
      '.vv-context'
    ];

    for (const dir of dirs) {
      await ensureDir(path.join(rootPath, dir));
    }
  }

  /**
   * 生成配置文件
   */
  private async generateConfigFiles(rootPath: string, projectName: string): Promise<void> {
    // .vv-project.json
    const config = generateProjectConfig(projectName);
    await writeFile(
      path.join(rootPath, '.vv-project.json'),
      JSON.stringify(config, null, 2)
    );

    // 生成所有 AI 工具的规则文件（统一从 AI-rules.md 读取）
    const aiRulesContent = await generateCursorRules(); // 统一内容
    
    // Cursor
    await writeFile(
      path.join(rootPath, '.cursorrules'),
      aiRulesContent
    );

    // Cline
    await writeFile(
      path.join(rootPath, '.clinerules'),
      aiRulesContent
    );

    // Aider
    await writeFile(
      path.join(rootPath, '.aiderrules'),
      aiRulesContent
    );

    // Claude Code
    await writeFile(
      path.join(rootPath, '.claude-rules'),
      aiRulesContent
    );

    // Gemini Code
    await writeFile(
      path.join(rootPath, '.gemini-rules'),
      aiRulesContent
    );

    // .gitignore（添加敏感信息）
    const gitignorePath = path.join(rootPath, '.gitignore');
    const gitignoreExists = await fileExists(gitignorePath);
    
    const gitignoreContent = `
# Vibe Video
.vv-secrets.json
.temp/
video-clip/*.mp4
first-frames/*.png
output/*.mp4
`;

    if (gitignoreExists) {
      // 追加到现有文件
      const existing = await vscode.workspace.fs.readFile(vscode.Uri.file(gitignorePath));
      const existingContent = Buffer.from(existing).toString('utf-8');
      if (!existingContent.includes('# Vibe Video')) {
        await writeFile(gitignorePath, existingContent + '\n' + gitignoreContent);
      }
    } else {
      await writeFile(gitignorePath, gitignoreContent);
    }
  }

  /**
   * 生成 AI 上下文文档
   */
  private async generateAIContext(rootPath: string): Promise<void> {
    const contextDir = path.join(rootPath, '.vv-context');

    // README.md
    await writeFile(
      path.join(contextDir, 'README.md'),
      await generateContextReadme()
    );

    // storyboard-guide.md
    await writeFile(
      path.join(contextDir, 'storyboard-guide.md'),
      await generateStoryboardGuide()
    );

    // shot-guide.md
    await writeFile(
      path.join(contextDir, 'shot-guide.md'),
      await generateShotGuide()
    );

    // prompt-examples.md
    await writeFile(
      path.join(contextDir, 'storyboard-prompt-examples.md'),
      await generatePromptExamples()
    );
  }

  /**
   * 创建示例剧本
   */
  private async createExampleScript(rootPath: string): Promise<void> {
    const scriptPath = path.join(rootPath, '剧本.md');
    
    // 只有在不存在时才创建
    if (!(await fileExists(scriptPath))) {
      await writeFile(scriptPath, await generateExampleScript());
    }
  }

  /**
   * 创建示例主体文件
   */
  private async createExampleSubjects(rootPath: string): Promise<void> {
    // 不再自动生成 README.md
  }

  /**
   * 检查是否已初始化
   */
  async checkIfInitialized(rootPath: string): Promise<boolean> {
    const configPath = path.join(rootPath, '.vv-project.json');
    return await fileExists(configPath);
  }
}

