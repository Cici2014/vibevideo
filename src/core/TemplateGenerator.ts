/**
 * 模板生成器 - 生成项目配置文件和 AI 上下文
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { VVProjectConfig } from '../types';
import { readFile, fileExists } from '../utils/fileSystem';

/**
 * 获取模板文件路径
 */
function getTemplatePath(templateName: string): string | undefined {
  // 首先尝试通过扩展上下文获取路径（如果可用）
  // 在扩展激活时，可以通过 context.extensionPath 获取
  
  // 尝试多个可能的扩展 ID
  const extensionIds = ['vibevideo.vibevideo', 'vibevideo'];
  let extension: vscode.Extension<any> | undefined;
  
  for (const id of extensionIds) {
    extension = vscode.extensions.getExtension(id);
    if (extension) {
      break;
    }
  }
  
  if (extension) {
    return path.join(extension.extensionPath, 'templates', templateName);
  }
  
  // 开发环境：从当前文件位置向上查找包含 templates 目录的位置
  // 这是最可靠的方法，直接查找 templates 目录
  try {
    const fs = require('fs');
    let currentDir = __dirname;
    
    // 向上查找最多 5 层，直到找到包含 templates 目录的位置
    for (let i = 0; i < 5; i++) {
      const templatesDir = path.join(currentDir, 'templates');
      const templatePath = path.join(templatesDir, templateName);
      
      // 检查模板文件是否存在
      if (fs.existsSync(templatePath)) {
        return templatePath;
      }
      
      // 检查 templates 目录是否存在（即使文件不存在）
      if (fs.existsSync(templatesDir) && fs.statSync(templatesDir).isDirectory()) {
        // 找到了 templates 目录，返回模板文件路径（即使文件可能不存在）
        return templatePath;
      }
      
      // 向上移动一层
      const parentDir = path.resolve(currentDir, '..');
      if (parentDir === currentDir) {
        // 已经到达根目录，停止查找
        break;
      }
      currentDir = parentDir;
    }
    
    // 如果没找到，尝试从 dist/core 或 src/core 向上两级
    const currentDir2 = __dirname;
    if (currentDir2.includes('dist') || currentDir2.includes('src')) {
      const projectRoot = path.resolve(currentDir2, '../../');
      const templatePath = path.join(projectRoot, 'templates', templateName);
      return templatePath;
    }
    
    return undefined;
  } catch (error) {
    console.warn('无法确定模板路径:', error);
    return undefined;
  }
}

/**
 * 从文件读取模板，如果文件不存在则返回默认内容
 */
async function loadTemplate(templateName: string, defaultContent: string): Promise<string> {
  const templatePath = getTemplatePath(templateName);
  if (templatePath && await fileExists(templatePath)) {
    try {
      return await readFile(templatePath);
    } catch (error) {
      console.warn(`无法读取模板文件 ${templateName}，使用默认内容:`, error);
      return defaultContent;
    }
  }
  return defaultContent;
}

/**
 * 同步版本：从文件读取模板，如果文件不存在则返回默认内容
 */
function loadTemplateSync(templateName: string, defaultContent: string): string {
  const templatePath = getTemplatePath(templateName);
  if (!templatePath) {
    return defaultContent;
  }
  
  try {
    const fs = require('fs');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`无法读取模板文件 ${templateName}，使用默认内容:`, error);
  }
  
  return defaultContent;
}

/**
 * 从文件读取必需的模板，如果文件不存在则抛出错误
 */
async function loadRequiredTemplate(templateName: string): Promise<string> {
  const templatePath = getTemplatePath(templateName);
  if (!templatePath) {
    // 尝试手动查找模板文件以提供更好的错误信息
    const fs = require('fs');
    const currentDir = __dirname;
    const possiblePaths: string[] = [];
    
    // 收集可能的路径用于错误信息
    let current = currentDir;
    for (let i = 0; i < 5; i++) {
      const testPath = path.join(current, 'templates', templateName);
      possiblePaths.push(testPath);
      current = path.resolve(current, '..');
      if (current === path.resolve(current, '..')) {
        break;
      }
    }
    
    throw new Error(
      `无法找到模板文件 ${templateName} 的路径。\n` +
      `当前目录: ${currentDir}\n` +
      `尝试过的路径:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`
    );
  }
  
  if (!(await fileExists(templatePath))) {
    const fs = require('fs');
    const templatesDir = path.dirname(templatePath);
    const dirExists = await fileExists(templatesDir);
    
    throw new Error(
      `模板文件 ${templateName} 不存在。\n` +
      `期望路径: ${templatePath}\n` +
      `templates 目录${dirExists ? '存在' : '不存在'}: ${templatesDir}\n` +
      `当前工作目录: ${process.cwd()}`
    );
  }
  
  try {
    return await readFile(templatePath);
  } catch (error) {
    throw new Error(`无法读取模板文件 ${templateName} (${templatePath}): ${error}`);
  }
}

/**
 * 同步版本：从文件读取必需的模板，如果文件不存在则抛出错误
 */
function loadRequiredTemplateSync(templateName: string): string {
  const templatePath = getTemplatePath(templateName);
  if (!templatePath) {
    // 尝试手动查找模板文件以提供更好的错误信息
    const fs = require('fs');
    const currentDir = __dirname;
    const possiblePaths: string[] = [];
    
    // 收集可能的路径用于错误信息
    let current = currentDir;
    for (let i = 0; i < 5; i++) {
      const testPath = path.join(current, 'templates', templateName);
      possiblePaths.push(testPath);
      current = path.resolve(current, '..');
      if (current === path.resolve(current, '..')) {
        break;
      }
    }
    
    throw new Error(
      `无法找到模板文件 ${templateName} 的路径。\n` +
      `当前目录: ${currentDir}\n` +
      `尝试过的路径:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`
    );
  }
  
  try {
    const fs = require('fs');
    if (!fs.existsSync(templatePath)) {
      const templatesDir = path.dirname(templatePath);
      const dirExists = fs.existsSync(templatesDir);
      
      throw new Error(
        `模板文件 ${templateName} 不存在。\n` +
        `期望路径: ${templatePath}\n` +
        `templates 目录${dirExists ? '存在' : '不存在'}: ${templatesDir}\n` +
        `当前工作目录: ${process.cwd()}`
      );
    }
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && error.message.includes('不存在')) {
      throw error;
    }
    throw new Error(`无法读取模板文件 ${templateName} (${templatePath}): ${error}`);
  }
}

/**
 * 获取统一的 AI 规则内容
 * 从 templates/AI-rules.md 读取
 */
async function getAIRulesContent(): Promise<string> {
  return await loadRequiredTemplate('AI-rules.md');
}

/**
 * 同步版本：获取统一的 AI 规则内容
 */
function getAIRulesContentSync(): string {
  return loadRequiredTemplateSync('AI-rules.md');
}

/**
 * 生成 .cursorrules 内容
 * 从统一的 AI-rules.md 读取
 */
export async function generateCursorRules(): Promise<string> {
  return await getAIRulesContent();
}

/**
 * 同步版本：生成 .cursorrules 内容
 */
export function generateCursorRulesSync(): string {
  return getAIRulesContentSync();
}

/**
 * 生成 .clinerules 内容（与 .cursorrules 相同）
 */
export async function generateClineRules(): Promise<string> {
  return await getAIRulesContent();
}

/**
 * 同步版本：生成 .clinerules 内容
 */
export function generateClineRulesSync(): string {
  return getAIRulesContentSync();
}

/**
 * 生成 .aiderrules 内容（Aider 工具使用）
 */
export async function generateAiderRules(): Promise<string> {
  return await getAIRulesContent();
}

/**
 * 同步版本：生成 .aiderrules 内容
 */
export function generateAiderRulesSync(): string {
  return getAIRulesContentSync();
}

/**
 * 生成 .claude-rules 内容（Claude Code 使用）
 */
export async function generateClaudeRules(): Promise<string> {
  return await getAIRulesContent();
}

/**
 * 同步版本：生成 .claude-rules 内容
 */
export function generateClaudeRulesSync(): string {
  return getAIRulesContentSync();
}

/**
 * 生成 .gemini-rules 内容（Gemini Code 使用）
 */
export async function generateGeminiRules(): Promise<string> {
  return await getAIRulesContent();
}

/**
 * 同步版本：生成 .gemini-rules 内容
 */
export function generateGeminiRulesSync(): string {
  return getAIRulesContentSync();
}

/**
 * 生成项目配置
 */
export function generateProjectConfig(projectName: string): VVProjectConfig {
  return {
    name: projectName,
    videoSize: {
      width: 1280,
      height: 720
    },
    fps: 30,
    createdAt: new Date().toISOString(),
    version: '0.1.0'
  };
}

/**
 * 生成示例剧本
 */
export async function generateExampleScript(): Promise<string> {
  return await loadRequiredTemplate('example-script.md');
}

/**
 * 生成 README 说明文档
 */
export async function generateContextReadme(): Promise<string> {
  return await loadRequiredTemplate('context-readme.md');
}

/**
 * 生成分镜指南
 */
export async function generateStoryboardGuide(): Promise<string> {
  return await loadRequiredTemplate('storyboard-guide.md');
}

/**
 * 生成镜头类型指南
 */
export async function generateShotGuide(): Promise<string> {
  return await loadRequiredTemplate('shot-guide.md');
}

/**
 * 生成提示词示例
 */
export async function generatePromptExamples(): Promise<string> {
  return await loadRequiredTemplate('prompt-examples.md');
}

