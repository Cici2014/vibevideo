/**
 * 文件系统工具函数
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 确保目录存在，如果不存在则创建
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.access(dirPath);
  } catch {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 写入文件，自动创建父目录
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

/**
 * 读取文件
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.promises.readFile(filePath, 'utf-8');
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出目录中的所有文件
 */
export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(dirPath);
    if (extension) {
      return files.filter(f => f.endsWith(extension)).map(f => path.join(dirPath, f));
    }
    return files.map(f => path.join(dirPath, f));
  } catch {
    return [];
  }
}

/**
 * 获取工作区根目录
 */
export function getWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0].uri.fsPath;
}

/**
 * 检查是否是 Vibe Video 项目
 */
export async function isVVProject(rootPath: string): Promise<boolean> {
  const configPath = path.join(rootPath, '.vv-project.json');
  return await fileExists(configPath);
}

/**
 * 复制文件
 */
export async function copyFile(sourcePath: string, targetPath: string): Promise<void> {
  const targetDir = path.dirname(targetPath);
  await ensureDir(targetDir);
  await fs.promises.copyFile(sourcePath, targetPath);
}

