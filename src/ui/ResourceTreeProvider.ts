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
export interface FirstFrameResourcePaths {
  image?: string;
  markdown?: string;
}

export class ResourceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly resourceType?: 'storyboard' | 'firstFrameResource' | 'clip' | 'stats',
    public readonly resourcePath?: string,
    public readonly quality?: 'excellent' | 'good' | 'fair' | 'needs-improvement',
    public readonly relatedPaths?: FirstFrameResourcePaths
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
    } else if (resourceType === 'firstFrameResource') {
      this.iconPath = new vscode.ThemeIcon('file-media');
      this.contextValue = 'firstFrame';
      if (resourcePath) {
        this.command = {
          command: 'vibevideo.openFirstFrameResource',
          title: '打开首帧资源',
          arguments: [this]
        };
      }
    } else if (resourceType === 'clip') {
      this.iconPath = new vscode.ThemeIcon('play');
      this.contextValue = 'clip';
      // 点击视频片段时打开视频文件
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开视频',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
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
    const firstFramesDir = path.join(this.workspaceRoot!, 'first-frames');
    const [imageFiles, markdownFiles] = await Promise.all([
      listFiles(firstFramesDir, '.png'),
      listFiles(firstFramesDir, '.md')
    ]);

    const resourceMap = new Map<
      string,
      {
        displayName: string;
        image?: string;
        markdown?: string;
      }
    >();

    const addFile = (file: string, type: 'image' | 'markdown') => {
      const fileName = path.basename(file, path.extname(file));
      const normalized = normalizeFirstFrameName(fileName);
      const existing = resourceMap.get(normalized) || {
        displayName: fileName
      };
      if (type === 'image') {
        existing.image = file;
        if (!existing.markdown) {
          existing.displayName = fileName;
        }
      } else {
        existing.markdown = file;
        existing.displayName = fileName; // 优先使用描述名
      }
      resourceMap.set(normalized, existing);
    };

    imageFiles.forEach(file => addFile(file, 'image'));
    markdownFiles.forEach(file => addFile(file, 'markdown'));

    if (resourceMap.size === 0) {
      return [
        new ResourceTreeItem(
          '暂无首帧资源',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    const items: ResourceTreeItem[] = [];
    const sortedEntries = Array.from(resourceMap.entries()).sort((a, b) =>
      a[1].displayName.localeCompare(b[1].displayName, 'zh-CN')
    );

    for (const [, entry] of sortedEntries) {
      const markers = [
        entry.markdown ? '📝' : '',
        entry.image ? '🖼️' : ''
      ]
        .filter(Boolean)
        .join(' ');
      const label = markers ? `${entry.displayName} ${markers}` : entry.displayName;
      items.push(
        new ResourceTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          'firstFrameResource',
          entry.image ?? entry.markdown,
          undefined,
          {
            image: entry.image,
            markdown: entry.markdown
          }
        )
      );
    }

    return items;
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
    
    const firstFramesDir = path.join(this.workspaceRoot!, 'first-frames');
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

  /**
   * 根据首帧文件推导分镜路径
   */
  async getStoryboardPathFromFirstFrame(firstFramePath: string): Promise<string | undefined> {
    if (!this.workspaceRoot) {
      return undefined;
    }

    const baseName = path.basename(firstFramePath, path.extname(firstFramePath));
    const normalized = normalizeFirstFrameName(baseName);
    const candidates = new Set<string>([
      baseName,
      normalized
    ]);

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      const storyboardPath = path.join(this.workspaceRoot, 'storyboards', `${candidate}.md`);
      if (await fileExists(storyboardPath)) {
        return storyboardPath;
      }
    }

    return undefined;
  }
}

function normalizeFirstFrameName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(\.md|\.png)$/i, '')
    .replace(/[-_]?first[-_]?frame$/i, '')
    .replace(/[-_]?首帧$/i, '')
    .trim();
}

