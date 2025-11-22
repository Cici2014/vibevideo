/**
 * FFmpeg 工具类
 * 用于检测、安装和管理 FFmpeg
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileExists } from './fileSystem';

const execAsync = promisify(exec);

export class FFmpegManager {
  private static ffmpegPath: string | null = null;
  private static installationAttempted = false;

  /**
   * 检测系统 PATH 中是否有 ffmpeg
   */
  private static async checkSystemFFmpeg(): Promise<string | null> {
    try {
      const command = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      const { stdout } = await execAsync(command + ' -version', { timeout: 5000 });
      if (stdout && stdout.includes('ffmpeg version')) {
        return command;
      }
    } catch (error) {
      // ffmpeg 不在 PATH 中
    }
    return null;
  }

  /**
   * 尝试从 npm 包安装 ffmpeg
   */
  private static async installFFmpegFromNpm(context: vscode.ExtensionContext): Promise<string | null> {
    try {
      // 尝试使用 @ffmpeg-installer/ffmpeg 包
      const extensionPath = context.extensionPath;
      const packagePath = path.join(extensionPath, 'node_modules', '@ffmpeg-installer', 'ffmpeg');
      
      // @ffmpeg-installer/ffmpeg 包的结构：
      // Windows: node_modules/@ffmpeg-installer/ffmpeg/ffmpeg.exe
      // Linux/Mac: node_modules/@ffmpeg-installer/ffmpeg/ffmpeg
      const ffmpegBinary = process.platform === 'win32' 
        ? path.join(packagePath, 'ffmpeg.exe')
        : path.join(packagePath, 'ffmpeg');
      
      // 检查二进制文件是否存在
      if (await fileExists(ffmpegBinary)) {
        return ffmpegBinary;
      }

      // 如果包不存在，尝试安装
      const installPath = path.join(extensionPath, 'node_modules');
      await this.ensureNodeModules(installPath);
      
      // 使用 npm 安装 @ffmpeg-installer/ffmpeg
      const { stdout, stderr } = await execAsync(
        `npm install @ffmpeg-installer/ffmpeg --no-save --prefix "${extensionPath}"`,
        { 
          timeout: 120000, // 2分钟超时
          cwd: extensionPath 
        }
      );

      // 再次检查安装后的二进制文件
      if (await fileExists(ffmpegBinary)) {
        return ffmpegBinary;
      }

      return null;
    } catch (error: any) {
      console.error('[FFmpeg] 从 npm 安装失败:', error);
      return null;
    }
  }

  /**
   * 确保 node_modules 目录存在
   */
  private static async ensureNodeModules(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 获取 FFmpeg 可执行文件路径
   * 优先级：系统 PATH > npm 包安装
   * 注意：此方法不显示进度提示，用于快速检查
   */
  static async getFFmpegPath(context: vscode.ExtensionContext): Promise<string | null> {
    // 如果已经找到，直接返回
    if (this.ffmpegPath) {
      return this.ffmpegPath;
    }

    // 1. 首先检查系统 PATH
    const systemPath = await this.checkSystemFFmpeg();
    if (systemPath) {
      this.ffmpegPath = systemPath;
      return systemPath;
    }

    // 2. 检查是否已通过 npm 安装（不自动安装）
    const extensionPath = context.extensionPath;
    const packagePath = path.join(extensionPath, 'node_modules', '@ffmpeg-installer', 'ffmpeg');
    const ffmpegBinary = process.platform === 'win32' 
      ? path.join(packagePath, 'ffmpeg.exe')
      : path.join(packagePath, 'ffmpeg');
    
    if (await fileExists(ffmpegBinary)) {
      this.ffmpegPath = ffmpegBinary;
      return ffmpegBinary;
    }

    return null;
  }

  /**
   * 确保 FFmpeg 已安装
   * 如果未安装，尝试安装；如果安装失败，提示用户
   */
  static async ensureFFmpegInstalled(context: vscode.ExtensionContext): Promise<string> {
    if (this.installationAttempted) {
      const path = await this.getFFmpegPath(context);
      if (!path) {
        throw new Error('FFmpeg 未安装。请使用您的 AI 编程助手帮助安装 FFmpeg。');
      }
      return path;
    }

    this.installationAttempted = true;

    // 使用进度提示来显示安装状态
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Vibe Video - FFmpeg 安装',
        cancellable: false
      },
      async (progress) => {
        // 首先检查系统 PATH
        progress.report({ message: '正在检查系统 FFmpeg...', increment: 0 });
        let ffmpegPath = await this.checkSystemFFmpeg();
        
        if (ffmpegPath) {
          this.ffmpegPath = ffmpegPath;
          progress.report({ message: '已找到系统 FFmpeg', increment: 100 });
          return ffmpegPath;
        }

        // 检查是否已通过 npm 安装
        progress.report({ message: '正在检查已安装的 FFmpeg...', increment: 20 });
        const extensionPath = context.extensionPath;
        const packagePath = path.join(extensionPath, 'node_modules', '@ffmpeg-installer', 'ffmpeg');
        const ffmpegBinary = process.platform === 'win32' 
          ? path.join(packagePath, 'ffmpeg.exe')
          : path.join(packagePath, 'ffmpeg');
        
        if (await fileExists(ffmpegBinary)) {
          this.ffmpegPath = ffmpegBinary;
          progress.report({ message: '已找到已安装的 FFmpeg', increment: 100 });
          return ffmpegBinary;
        }

        // 尝试自动安装
        progress.report({ message: '正在自动安装 FFmpeg（这可能需要几分钟）...', increment: 40 });
        const installedPath = await this.installFFmpegFromNpm(context);
        
        if (installedPath) {
          this.ffmpegPath = installedPath;
          progress.report({ message: 'FFmpeg 安装完成', increment: 100 });
          return installedPath;
        }

        // 如果自动安装失败，提示用户
        progress.report({ message: '自动安装失败', increment: 100 });
        const action = await vscode.window.showWarningMessage(
          'FFmpeg 未安装，自动安装失败。\n\n' +
          '请使用您的 AI 编程助手帮助安装 FFmpeg，或手动安装后重试。\n\n' +
          '安装方法：\n' +
          '- Windows: 使用包管理器如 Chocolatey (`choco install ffmpeg`) 或 Scoop (`scoop install ffmpeg`)\n' +
          '- macOS: 使用 Homebrew (`brew install ffmpeg`)\n' +
          '- Linux: 使用系统包管理器 (`apt install ffmpeg` 或 `yum install ffmpeg`)',
          '重试',
          '取消'
        );

        if (action === '重试') {
          this.installationAttempted = false;
          return await this.ensureFFmpegInstalled(context);
        }

        throw new Error('FFmpeg 未安装。请使用您的 AI 编程助手帮助安装 FFmpeg。');
      }
    );
  }

  /**
   * 验证 FFmpeg 是否可用
   */
  static async verifyFFmpeg(ffmpegPath: string): Promise<boolean> {
    try {
      // 如果 ffmpegPath 是系统命令（不包含路径分隔符），不需要加引号
      const needsQuotes = ffmpegPath.includes(path.sep) || ffmpegPath.includes('/');
      const command = needsQuotes ? `"${ffmpegPath}" -version` : `${ffmpegPath} -version`;
      
      const { stdout } = await execAsync(command, { timeout: 5000 });
      return typeof stdout === 'string' && stdout.includes('ffmpeg version');
    } catch (error) {
      return false;
    }
  }

  /**
   * 重置 FFmpeg 路径缓存（用于重新检测）
   */
  static reset(): void {
    this.ffmpegPath = null;
    this.installationAttempted = false;
  }
}

