/**
 * 资源树视图提供者
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { StoryboardParser } from '../core/StoryboardParser';
import { listFiles, fileExists } from '../utils/fileSystem';
import { Storyboard } from '../types';

/**
 * 树节点项
 */
export class ResourceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly resourceType?: 'storyboard' | 'firstFrame' | 'clip' | 'stats',
    public readonly resourcePath?: string,
    public readonly quality?: 'excellent' | 'good' | 'fair' | 'needs-improvement'
  ) {
    super(label, collapsibleState);

    // 设置图标
    if (resourceType === 'storyboard') {
      this.iconPath = new vscode.ThemeIcon('note');
      this.contextValue = 'storyboard';
      
      // 根据质量设置装饰
      if (quality === 'excellent') {
        this.description = '优秀 🖼️';
      } else if (quality === 'good') {
        this.description = '✓';
      } else if (quality === 'fair') {
        this.description = '⚠️';
      } else if (quality === 'needs-improvement') {
        this.description = '💡';
      }

      // 设置命令：点击打开文件
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: 'Open Storyboard',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'firstFrame') {
      this.iconPath = new vscode.ThemeIcon('file-media');
    } else if (resourceType === 'clip') {
      this.iconPath = new vscode.ThemeIcon('play');
    } else if (resourceType === 'stats') {
      this.iconPath = new vscode.ThemeIcon('graph');
    }
  }
}

/**
 * 资源树数据提供者
 */
export class ResourceTreeProvider implements vscode.TreeDataProvider<ResourceTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ResourceTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ResourceTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ResourceTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private parser = new StoryboardParser();
  private workspaceRoot: string | undefined;

  constructor(workspaceRoot: string | undefined) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 刷新视图
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * 获取树节点
   */
  getTreeItem(element: ResourceTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * 获取子节点
   */
  async getChildren(element?: ResourceTreeItem): Promise<ResourceTreeItem[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    // 检查是否是 VV 项目
    const configPath = path.join(this.workspaceRoot, '.vv-project.json');
    if (!(await fileExists(configPath))) {
      return [
        new ResourceTreeItem(
          '未检测到 Vibe Video 项目',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    // 根节点
    if (!element) {
      return [
        new ResourceTreeItem('📝 分镜脚本', vscode.TreeItemCollapsibleState.Expanded),
        new ResourceTreeItem('🖼️ 初始帧', vscode.TreeItemCollapsibleState.Collapsed),
        new ResourceTreeItem('🎬 视频片段', vscode.TreeItemCollapsibleState.Collapsed),
        new ResourceTreeItem('📊 项目信息', vscode.TreeItemCollapsibleState.Collapsed)
      ];
    }

    // 子节点
    if (element.label.startsWith('📝')) {
      return await this.getStoryboardItems();
    } else if (element.label.startsWith('🖼️')) {
      return await this.getFirstFrameItems();
    } else if (element.label.startsWith('🎬')) {
      return await this.getClipItems();
    } else if (element.label.startsWith('📊')) {
      return await this.getStatsItems();
    }

    return [];
  }

  /**
   * 获取分镜脚本列表
   */
  private async getStoryboardItems(): Promise<ResourceTreeItem[]> {
    const storyboardsDir = path.join(this.workspaceRoot!, 'storyboards');
    const files = await listFiles(storyboardsDir, '.md');

    if (files.length === 0) {
      return [
        new ResourceTreeItem(
          '暂无分镜脚本',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    const items: ResourceTreeItem[] = [];

    for (const file of files.sort()) {
      try {
        const storyboard = await this.parser.parseMarkdown(file);
        const quality = this.parser.checkQuality(storyboard);
        
        const fileName = path.basename(file);
        let label = fileName;

        // 添加质量标记
        if (quality.rating === 'excellent') {
          label = `✅ ${fileName}`;
        } else if (quality.rating === 'good') {
          label = `${fileName}`;
        } else if (quality.rating === 'fair') {
          label = `⚠️ ${fileName}`;
        } else {
          label = `💡 ${fileName}`;
        }

        // 检查是否有首帧
        if (storyboard.firstFrame || storyboard.firstFramePrompt) {
          label += ' 🖼️';
        }

        items.push(
          new ResourceTreeItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            'storyboard',
            file,
            quality.rating
          )
        );
      } catch (error) {
        items.push(
          new ResourceTreeItem(
            `❌ ${path.basename(file)}`,
            vscode.TreeItemCollapsibleState.None
          )
        );
      }
    }

    return items;
  }

  /**
   * 获取初始帧列表
   */
  private async getFirstFrameItems(): Promise<ResourceTreeItem[]> {
    const firstFramesDir = path.join(this.workspaceRoot!, 'assets', 'first-frames');
    const files = await listFiles(firstFramesDir, '.png');

    if (files.length === 0) {
      return [
        new ResourceTreeItem(
          '暂无初始帧',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    return files.sort().map(file => {
      const fileName = path.basename(file);
      return new ResourceTreeItem(
        `✓ ${fileName}`,
        vscode.TreeItemCollapsibleState.None,
        'firstFrame',
        file
      );
    });
  }

  /**
   * 获取视频片段列表
   */
  private async getClipItems(): Promise<ResourceTreeItem[]> {
    const clipsDir = path.join(this.workspaceRoot!, 'assets', 'clips');
    const files = await listFiles(clipsDir, '.mp4');

    if (files.length === 0) {
      return [
        new ResourceTreeItem(
          '暂无视频片段',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    return files.sort().map(file => {
      const fileName = path.basename(file);
      return new ResourceTreeItem(
        `✓ ${fileName}`,
        vscode.TreeItemCollapsibleState.None,
        'clip',
        file
      );
    });
  }

  /**
   * 获取统计信息
   */
  private async getStatsItems(): Promise<ResourceTreeItem[]> {
    const storyboards = await this.getAllStoryboards();
    
    const totalStoryboards = storyboards.length;
    const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 5), 0);
    
    const firstFramesDir = path.join(this.workspaceRoot!, 'assets', 'first-frames');
    const firstFrames = await listFiles(firstFramesDir, '.png');
    
    const clipsDir = path.join(this.workspaceRoot!, 'assets', 'clips');
    const clips = await listFiles(clipsDir, '.mp4');

    return [
      new ResourceTreeItem(
        `分镜数量: ${totalStoryboards}`,
        vscode.TreeItemCollapsibleState.None,
        'stats'
      ),
      new ResourceTreeItem(
        `初始帧: ${firstFrames.length}/${totalStoryboards}`,
        vscode.TreeItemCollapsibleState.None,
        'stats'
      ),
      new ResourceTreeItem(
        `视频片段: ${clips.length}/${totalStoryboards}`,
        vscode.TreeItemCollapsibleState.None,
        'stats'
      ),
      new ResourceTreeItem(
        `总时长: ${totalDuration} 秒`,
        vscode.TreeItemCollapsibleState.None,
        'stats'
      ),
    ];
  }

  /**
   * 获取所有分镜
   */
  async getAllStoryboards(): Promise<Storyboard[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    const storyboardsDir = path.join(this.workspaceRoot, 'storyboards');
    const files = await listFiles(storyboardsDir, '.md');

    const storyboards: Storyboard[] = [];
    for (const file of files) {
      try {
        const sb = await this.parser.parseMarkdown(file);
        storyboards.push(sb);
      } catch (error) {
        // 忽略解析失败的文件
      }
    }

    return storyboards.sort((a, b) => a.id.localeCompare(b.id));
  }
}

