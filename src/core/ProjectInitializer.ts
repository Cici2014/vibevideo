/**
 * 项目初始化器
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { VVProjectConfig } from '../types';
import { ensureDir, writeFile, fileExists } from '../utils/fileSystem';
import {
  generateCursorRules,
  generateClineRules,
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
      'storyboards',
      'assets',
      'assets/clips',
      'assets/audio',
      'assets/references',
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

    // .cursorrules
    await writeFile(
      path.join(rootPath, '.cursorrules'),
      generateCursorRules()
    );

    // .clinerules
    await writeFile(
      path.join(rootPath, '.clinerules'),
      generateClineRules()
    );

    // .gitignore（添加敏感信息）
    const gitignorePath = path.join(rootPath, '.gitignore');
    const gitignoreExists = await fileExists(gitignorePath);
    
    const gitignoreContent = `
# Vibe Video
.vv-secrets.json
assets/clips/*.mp4
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
      generateContextReadme()
    );

    // storyboard-guide.md
    await writeFile(
      path.join(contextDir, 'storyboard-guide.md'),
      generateStoryboardGuide()
    );

    // shot-guide.md
    await writeFile(
      path.join(contextDir, 'shot-guide.md'),
      generateShotGuide()
    );

    // prompt-examples.md
    await writeFile(
      path.join(contextDir, 'prompt-examples.md'),
      generatePromptExamples()
    );
  }

  /**
   * 创建示例剧本
   */
  private async createExampleScript(rootPath: string): Promise<void> {
    const scriptPath = path.join(rootPath, '剧本.md');
    
    // 只有在不存在时才创建
    if (!(await fileExists(scriptPath))) {
      await writeFile(scriptPath, generateExampleScript());
    }
  }

  /**
   * 创建示例主体文件
   */
  private async createExampleSubjects(rootPath: string): Promise<void> {
    const subjectsDir = path.join(rootPath, 'subjects');

    // 创建 README
    const readmeContent = `# 主体库

这个目录用于存放主体/角色的定义和图片。

## 如何使用

### 1. 定义主体
创建一个 Markdown 文件（如 \`猪大哥.md\`），写入详细描述：

\`\`\`markdown
# 猪大哥

一只可爱的粉色小猪，戴着红色帽子，穿蓝色背心。
3D卡通风格，圆润的体型，大大的眼睛，友善的表情。
站立姿势，全身照，白色背景。
\`\`\`

### 2. 生成主体图
右键点击 .md 文件 → "生成主体图片"
或运行命令："Vibe Video: Generate All Subjects"

### 3. 在分镜中引用
\`\`\`markdown
# 01-草地玩耍

- **主体**: 猪大哥, 猪二哥, 猪小弟
- **场景**: 绿色草地，阳光明媚
- **构图**: 猪大哥在前跑，其他在后追

三只小猪在草地上玩耍...
\`\`\`

### 4. 合成初始帧
运行命令："Vibe Video: Compose All First Frames"
系统会自动将主体放入场景中。

## 提示

- 主体描述要详细（外观、服装、风格、姿势）
- 建议使用白色背景（便于合成）
- 强调风格一致性（如"3D卡通风格"）
- 可以多次生成，直到满意
`;
    
    await writeFile(path.join(subjectsDir, 'README.md'), readmeContent);

    // 创建示例主体（可选）
    const exampleSubject = `# 示例主体

一个现代风格的咖啡杯，白色陶瓷材质，简约设计。
写实风格，柔和的光线，白色背景，45度角视角。
`;
    
    await writeFile(path.join(subjectsDir, '示例主体.md'), exampleSubject);
  }

  /**
   * 检查是否已初始化
   */
  async checkIfInitialized(rootPath: string): Promise<boolean> {
    const configPath = path.join(rootPath, '.vv-project.json');
    return await fileExists(configPath);
  }
}

