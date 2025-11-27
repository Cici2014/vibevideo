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
 * 如果目标文件已存在，则将其重命名为 .o-n 备份格式
 */
export async function backupExistingFile(filePath: string): Promise<string | undefined> {
  if (!(await fileExists(filePath))) {
    return undefined;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  let index = 1;
  let backupPath = path.join(dir, `${baseName}.o-${index}${ext}`);

  while (await fileExists(backupPath)) {
    index++;
    backupPath = path.join(dir, `${baseName}.o-${index}${ext}`);
  }

  await fs.promises.rename(filePath, backupPath);
  return backupPath;
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

/**
 * 重命名文件
 */
export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const targetDir = path.dirname(newPath);
  await ensureDir(targetDir);
  await fs.promises.rename(oldPath, newPath);
}

/**
 * 删除文件
 */
export async function deleteFile(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath);
}

/**
 * 生成唯一的文件名（如果文件已存在，添加 - 副本 后缀）
 * 例如：name.png -> name - 副本.png（如果 name.png 已存在）
 *      name - 副本.png -> name - 副本 (2).png（如果 name - 副本.png 已存在）
 */
export async function generateUniqueFileName(targetDir: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const nameWithoutExt = path.basename(fileName, ext);
  const targetPath = path.join(targetDir, fileName);

  // 如果文件不存在，直接返回原文件名
  if (!(await fileExists(targetPath))) {
    return fileName;
  }

  // 检查是否是 "name - 副本" 或 "name - 副本 (n)" 格式
  const copyPattern = /^(.+) - 副本(?: \((\d+)\))?$/;
  const match = nameWithoutExt.match(copyPattern);

  if (match) {
    // 源文件名已经是副本格式，需要生成新的副本
    const baseName = match[1];
    // 查找目标目录中已有的最大副本编号
    const files = await fs.promises.readdir(targetDir);
    let maxNum = 0;
    const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedExt = ext.replace('.', '\\.');
    const pattern = new RegExp(`^${escapedBaseName} - 副本(?: \\((\\d+)\\))?${escapedExt}$`);
    
    for (const file of files) {
      const fileMatch = file.match(pattern);
      if (fileMatch) {
        const num = fileMatch[1] ? parseInt(fileMatch[1], 10) : 1;
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    // 生成新的副本编号
    let nextNum = maxNum + 1;
    let newFileName = `${baseName} - 副本 (${nextNum})${ext}`;
    let newPath = path.join(targetDir, newFileName);

    // 如果新文件名已存在，继续递增
    while (await fileExists(newPath)) {
      nextNum++;
      newFileName = `${baseName} - 副本 (${nextNum})${ext}`;
      newPath = path.join(targetDir, newFileName);
    }

    return newFileName;
  } else {
    // 不是副本格式，添加 " - 副本" 后缀
    let newFileName = `${nameWithoutExt} - 副本${ext}`;
    let newPath = path.join(targetDir, newFileName);

    // 如果 " - 副本" 格式已存在，添加数字
    if (await fileExists(newPath)) {
      // 查找目标目录中已有的最大副本编号
      const files = await fs.promises.readdir(targetDir);
      let maxNum = 1; // 已经有 " - 副本" 了，所以从 2 开始
      const escapedName = nameWithoutExt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedExt = ext.replace('.', '\\.');
      const pattern = new RegExp(`^${escapedName} - 副本(?: \\((\\d+)\\))?${escapedExt}$`);
      
      for (const file of files) {
        const fileMatch = file.match(pattern);
        if (fileMatch) {
          const num = fileMatch[1] ? parseInt(fileMatch[1], 10) : 1;
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }

      let num = maxNum + 1;
      newFileName = `${nameWithoutExt} - 副本 (${num})${ext}`;
      newPath = path.join(targetDir, newFileName);

      // 继续递增直到找到不存在的文件名
      while (await fileExists(newPath)) {
        num++;
        newFileName = `${nameWithoutExt} - 副本 (${num})${ext}`;
        newPath = path.join(targetDir, newFileName);
      }
    }

    return newFileName;
  }
}

