/**
 * 资源树视图提供者
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { StoryboardParser } from '../core/StoryboardParser';
import { listFiles, fileExists, copyFile, ensureDir } from '../utils/fileSystem';
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
    public readonly resourceType?: 'storyboard' | 'firstFrameResource' | 'firstFrameMarkdown' | 'firstFrameImage' | 'clip' | 'stats' | 'subject' | 'subjectMarkdown' | 'subjectImage' | 'scene' | 'sceneMarkdown' | 'sceneImage' | 'referenceImage' | 'script',
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
        this.description = '优秀';
      } else if (quality === 'good') {
        this.description = '';
      } else if (quality === 'fair') {
        this.description = '';
      } else if (quality === 'needs-improvement') {
        this.description = '';
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
    } else if (resourceType === 'firstFrameMarkdown') {
      this.iconPath = new vscode.ThemeIcon('markdown');
      this.contextValue = 'firstFrameMarkdown';
      // 首帧描述保留"合成首帧"菜单（通过 contextValue）
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开首帧描述',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'firstFrameImage') {
      this.iconPath = new vscode.ThemeIcon('file-media');
      this.contextValue = 'firstFrameImage';
      // 首帧图片点击打开图片
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开首帧图片',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'clip') {
      this.iconPath = new vscode.ThemeIcon('play');
      this.contextValue = 'clip';
      // 点击视频片段时打开视频文件（会显示音频提示）
      if (resourcePath) {
        this.command = {
          command: 'vibevideo.openVideoClip',
          title: '打开视频',
          arguments: [resourcePath]
        };
      }
    } else if (resourceType === 'stats') {
      this.iconPath = new vscode.ThemeIcon('graph');
    } else if (resourceType === 'subject') {
      this.iconPath = new vscode.ThemeIcon('person');
      this.contextValue = 'subject';
      // 如果有资源路径或相关路径，设置打开命令
      if (resourcePath || relatedPaths) {
        this.command = {
          command: 'vibevideo.openSubjectResource',
          title: '打开主体资源',
          arguments: [this]
        };
      }
    } else if (resourceType === 'subjectMarkdown') {
      this.iconPath = new vscode.ThemeIcon('markdown');
      this.contextValue = 'subjectMarkdown';
      // 主体描述保留"生成主体图片"菜单（通过 contextValue）
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开主体描述',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'subjectImage') {
      this.iconPath = new vscode.ThemeIcon('file-media');
      this.contextValue = 'subjectImage';
      // 主体图片点击打开图片
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开主体图片',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'scene') {
      this.iconPath = new vscode.ThemeIcon('symbol-color');
      this.contextValue = 'scene';
      // 如果有资源路径或相关路径，设置打开命令
      if (resourcePath || relatedPaths) {
        this.command = {
          command: 'vibevideo.openSceneResource',
          title: '打开场景资源',
          arguments: [this]
        };
      }
    } else if (resourceType === 'sceneMarkdown') {
      this.iconPath = new vscode.ThemeIcon('markdown');
      this.contextValue = 'sceneMarkdown';
      // 场景描述保留"生成场景图片"菜单（通过 contextValue）
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开场景描述',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'sceneImage') {
      this.iconPath = new vscode.ThemeIcon('file-media');
      this.contextValue = 'sceneImage';
      // 场景图片点击打开图片
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开场景图片',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'referenceImage') {
      this.iconPath = new vscode.ThemeIcon('file-media');
      this.contextValue = 'referenceImage';
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开参考图',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    } else if (resourceType === 'script') {
      this.iconPath = new vscode.ThemeIcon('book');
      this.contextValue = 'script';
      if (resourcePath) {
        this.command = {
          command: 'vscode.open',
          title: '打开剧本',
          arguments: [vscode.Uri.file(resourcePath)]
        };
      }
    }
  }
}

/**
 * 资源树数据提供者（支持拖放）
 */
export class ResourceTreeProvider implements vscode.TreeDataProvider<ResourceTreeItem>, vscode.TreeDragAndDropController<ResourceTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ResourceTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ResourceTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ResourceTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  // 拖放支持的MIME类型
  readonly dropMimeTypes = ['text/uri-list'];
  readonly dragMimeTypes = ['application/vnd.code.tree.vvResources'];

  private parser = new StoryboardParser();
  private workspaceRoot: string | undefined;
  private fileWatchers: vscode.FileSystemWatcher[] = [];

  constructor(workspaceRoot: string | undefined) {
    this.workspaceRoot = workspaceRoot;
    this.setupFileWatchers();
  }

  /**
   * 刷新视图
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * 设置文件系统监听器
   */
  private setupFileWatchers(): void {
    if (!this.workspaceRoot) {
      return;
    }

    // 需要监听的目录列表
    const watchDirs = [
      'storyboards',      // 分镜脚本
      'subjects',         // 主体
      'scenes',           // 场景
      'ref-img',          // 参考图
      'first-frames',     // 首帧
      'video-clip'        // 视频片段
    ];

    // 监听各个目录的文件变化
    watchDirs.forEach(dir => {
      const pattern = new vscode.RelativePattern(
        vscode.Uri.file(this.workspaceRoot!),
        `${dir}/**`
      );
      
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      
      // 监听文件创建、删除和修改
      watcher.onDidCreate(() => {
        this.refresh();
      });
      
      watcher.onDidDelete(() => {
        this.refresh();
      });
      
      watcher.onDidChange(() => {
        this.refresh();
      });
      
      this.fileWatchers.push(watcher);
    });

    // 监听根目录下的剧本文件（.md 文件）
    const rootPattern = new vscode.RelativePattern(
      vscode.Uri.file(this.workspaceRoot!),
      '*.md'
    );
    
    const rootWatcher = vscode.workspace.createFileSystemWatcher(rootPattern);
    rootWatcher.onDidCreate(() => this.refresh());
    rootWatcher.onDidDelete(() => this.refresh());
    rootWatcher.onDidChange(() => this.refresh());
    this.fileWatchers.push(rootWatcher);
  }

  /**
   * 清理文件监听器
   */
  dispose(): void {
    this.fileWatchers.forEach(watcher => watcher.dispose());
    this.fileWatchers = [];
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
      // 创建一个可点击的初始化按钮节点
      const initButton = new ResourceTreeItem(
        '初始化 Vibe Video 项目',
        vscode.TreeItemCollapsibleState.None
      );
      initButton.iconPath = new vscode.ThemeIcon('add');
      initButton.command = {
        command: 'vibevideo.initProject',
        title: '初始化项目'
      };
      initButton.tooltip = '点击初始化 Vibe Video 项目';
      return [initButton];
    }

    // 根节点 - 按以下顺序显示（顺序固定，不可更改）
    if (!element) {
      return [
        new ResourceTreeItem('📊 项目信息', vscode.TreeItemCollapsibleState.Collapsed),
        new ResourceTreeItem('📄 剧本', vscode.TreeItemCollapsibleState.Collapsed),
        (() => {
          const referenceImagesRoot = new ResourceTreeItem('📸 参考图', vscode.TreeItemCollapsibleState.Collapsed);
          // 为分组节点设置 contextValue，以便在该分组右侧显示"添加图片"内联按钮
          referenceImagesRoot.contextValue = 'referenceImagesRoot';
          return referenceImagesRoot;
        })(),
        (() => {
          const subjectsRoot = new ResourceTreeItem('🎭 主体', vscode.TreeItemCollapsibleState.Collapsed);
          // 为分组节点设置 contextValue，以便在该分组右侧显示"生成全部"内联按钮
          subjectsRoot.contextValue = 'subjectsRoot';
          return subjectsRoot;
        })(),
        (() => {
          const scenesRoot = new ResourceTreeItem('🌆 场景', vscode.TreeItemCollapsibleState.Collapsed);
          // 为分组节点设置 contextValue，以便在该分组右侧显示"生成全部"内联按钮
          scenesRoot.contextValue = 'scenesRoot';
          return scenesRoot;
        })(),
        (() => {
          const firstFramesRoot = new ResourceTreeItem('🖼️ 分镜首帧', vscode.TreeItemCollapsibleState.Collapsed);
          // 为分组节点设置 contextValue，以便在该分组右侧显示"生成全部"内联按钮
          firstFramesRoot.contextValue = 'firstFramesRoot';
          return firstFramesRoot;
        })(),
        (() => {
          const storyboardsRoot = new ResourceTreeItem('📝 分镜脚本', vscode.TreeItemCollapsibleState.Expanded);
          // 为分组节点设置 contextValue，以便在该分组右侧显示"生成全部视频"内联按钮
          storyboardsRoot.contextValue = 'storyboardsRoot';
          return storyboardsRoot;
        })(),
        new ResourceTreeItem('🎬 视频片段', vscode.TreeItemCollapsibleState.Collapsed)
      ];
    }

    // 子节点
    if (element.label.startsWith('📊')) {
      return await this.getStatsItems();
    } else if (element.label.startsWith('📄')) {
      return await this.getScriptItems();
    } else if (element.label.startsWith('📝')) {
      return await this.getStoryboardItems();
    } else if (element.label.startsWith('🎭')) {
      return await this.getSubjectItems();
    } else if (element.label.startsWith('🌆')) {
      return await this.getSceneItems();
    } else if (element.label.startsWith('📸')) {
      return await this.getReferenceImageItems();
    } else if (element.label.startsWith('🖼️')) {
      return await this.getFirstFrameItems();
    } else if (element.label.startsWith('🎬')) {
      return await this.getClipItems();
    }

    return [];
  }

  /**
   * 获取剧本列表
   */
  private async getScriptItems(): Promise<ResourceTreeItem[]> {
    // 查找项目根目录下的剧本文件
    // 优先查找 剧本.md，也支持其他 .md 文件作为剧本
    const scriptPath = path.join(this.workspaceRoot!, '剧本.md');
    
    if (await fileExists(scriptPath)) {
      return [
        new ResourceTreeItem(
          '剧本.md',
          vscode.TreeItemCollapsibleState.None,
          'script',
          scriptPath
        )
      ];
    }

    // 如果没有找到 剧本.md，查找根目录下其他可能的剧本文件
    const rootFiles = await listFiles(this.workspaceRoot!, '.md');
    // 排除 storyboards 目录和其他已知目录中的文件
    const scriptFiles = rootFiles.filter(file => {
      const fileDir = path.dirname(file);
      const normalizedFileDir = path.normalize(fileDir);
      const normalizedRoot = path.normalize(this.workspaceRoot!);
      
      // 只返回根目录下的文件（不在子目录中）
      if (normalizedFileDir !== normalizedRoot) {
        return false;
      }
      
      // 排除隐藏文件和配置文件
      const fileName = path.basename(file);
      if (fileName.startsWith('.') || fileName === 'README.md') {
        return false;
      }
      
      return true;
    });

    if (scriptFiles.length === 0) {
      return [
        new ResourceTreeItem(
          '暂无剧本文件',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    return scriptFiles.sort().map(file => {
      const fileName = path.basename(file);
      return new ResourceTreeItem(
        fileName,
        vscode.TreeItemCollapsibleState.None,
        'script',
        file
      );
    });
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
        const label = fileName;

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
            path.basename(file),
            vscode.TreeItemCollapsibleState.None
          )
        );
      }
    }

    return items;
  }

  /**
   * 获取主体列表
   */
  private async getSubjectItems(): Promise<ResourceTreeItem[]> {
    const subjectsDir = path.join(this.workspaceRoot!, 'subjects');
    const [mdFiles, pngFiles] = await Promise.all([
      listFiles(subjectsDir, '.md'),
      listFiles(subjectsDir, '.png')
    ]);

    const resourceMap = new Map<
      string,
      {
        displayName: string;
        md?: string;
        png?: string;
      }
    >();

    const addFile = (file: string, type: 'md' | 'png') => {
      const fileName = path.basename(file, path.extname(file));
      const fullFileName = path.basename(file);
      const existing = resourceMap.get(fileName) || {
        displayName: fullFileName
      };
      if (type === 'md') {
        existing.md = file;
        existing.displayName = fullFileName; // 优先使用描述名，保留后缀
      } else {
        existing.png = file;
        if (!existing.md) {
          existing.displayName = fullFileName;
        }
      }
      resourceMap.set(fileName, existing);
    };

    mdFiles.forEach(file => addFile(file, 'md'));
    pngFiles.forEach(file => addFile(file, 'png'));

    const items: ResourceTreeItem[] = [];

    if (resourceMap.size === 0) {
      items.push(
        new ResourceTreeItem(
          '暂无主体',
          vscode.TreeItemCollapsibleState.None
        )
      );
      return items;
    }

    const sortedEntries = Array.from(resourceMap.entries()).sort((a, b) =>
      a[1].displayName.localeCompare(b[1].displayName, 'zh-CN')
    );

    for (const [, entry] of sortedEntries) {
      // 主体描述和主体图片分开显示为两个独立的 item
      if (entry.md) {
        const mdFileName = path.basename(entry.md);
        items.push(
          new ResourceTreeItem(
            mdFileName,
            vscode.TreeItemCollapsibleState.None,
            'subjectMarkdown',
            entry.md,
            undefined,
            {
              markdown: entry.md,
              image: entry.png
            }
          )
        );
      }
      if (entry.png) {
        const pngFileName = path.basename(entry.png);
        items.push(
          new ResourceTreeItem(
            pngFileName,
            vscode.TreeItemCollapsibleState.None,
            'subjectImage',
            entry.png,
            undefined,
            {
              markdown: entry.md,
              image: entry.png
            }
          )
        );
      }
    }

    return items;
  }

  /**
   * 获取场景列表
   */
  private async getSceneItems(): Promise<ResourceTreeItem[]> {
    const scenesDir = path.join(this.workspaceRoot!, 'scenes');
    const [mdFiles, pngFiles] = await Promise.all([
      listFiles(scenesDir, '.md'),
      listFiles(scenesDir, '.png')
    ]);

    const resourceMap = new Map<
      string,
      {
        displayName: string;
        md?: string;
        png?: string;
      }
    >();

    const addFile = (file: string, type: 'md' | 'png') => {
      const fileName = path.basename(file, path.extname(file));
      const fullFileName = path.basename(file);
      const existing = resourceMap.get(fileName) || {
        displayName: fullFileName
      };
      if (type === 'md') {
        existing.md = file;
        existing.displayName = fullFileName; // 优先使用描述名，保留后缀
      } else {
        existing.png = file;
        if (!existing.md) {
          existing.displayName = fullFileName;
        }
      }
      resourceMap.set(fileName, existing);
    };

    mdFiles.forEach(file => addFile(file, 'md'));
    pngFiles.forEach(file => addFile(file, 'png'));

    const items: ResourceTreeItem[] = [];

    if (resourceMap.size === 0) {
      items.push(
        new ResourceTreeItem(
          '暂无场景',
          vscode.TreeItemCollapsibleState.None
        )
      );
      return items;
    }

    const sortedEntries = Array.from(resourceMap.entries()).sort((a, b) =>
      a[1].displayName.localeCompare(b[1].displayName, 'zh-CN')
    );

    for (const [, entry] of sortedEntries) {
      // 场景描述和场景图片分开显示为两个独立的 item
      if (entry.md) {
        const mdFileName = path.basename(entry.md);
        items.push(
          new ResourceTreeItem(
            mdFileName,
            vscode.TreeItemCollapsibleState.None,
            'sceneMarkdown',
            entry.md,
            undefined,
            {
              markdown: entry.md,
              image: entry.png
            }
          )
        );
      }
      if (entry.png) {
        const pngFileName = path.basename(entry.png);
        items.push(
          new ResourceTreeItem(
            pngFileName,
            vscode.TreeItemCollapsibleState.None,
            'sceneImage',
            entry.png,
            undefined,
            {
              markdown: entry.md,
              image: entry.png
            }
          )
        );
      }
    }

    return items;
  }

  /**
   * 获取参考图列表
   */
  private async getReferenceImageItems(): Promise<ResourceTreeItem[]> {
    const refImgDir = path.join(this.workspaceRoot!, 'ref-img');
    const [pngFiles, jpgFiles, jpegFiles] = await Promise.all([
      listFiles(refImgDir, '.png'),
      listFiles(refImgDir, '.jpg'),
      listFiles(refImgDir, '.jpeg')
    ]);

    const imageFiles = [...pngFiles, ...jpgFiles, ...jpegFiles];

    if (imageFiles.length === 0) {
      return [
        new ResourceTreeItem(
          '暂无参考图',
          vscode.TreeItemCollapsibleState.None
        )
      ];
    }

    return imageFiles.sort().map(file => {
      const fileName = path.basename(file);
      return new ResourceTreeItem(
        fileName,
        vscode.TreeItemCollapsibleState.None,
        'referenceImage',
        file
      );
    });
  }

  /**
   * 获取分镜首帧列表
   */
  private async getFirstFrameItems(): Promise<ResourceTreeItem[]> {
    const firstFramesDir = path.join(this.workspaceRoot!, 'first-frames');
    const [imageFiles, markdownFiles] = await Promise.all([
      listFiles(firstFramesDir, '.png'),
      listFiles(firstFramesDir, '.md')
    ]);

    const items: ResourceTreeItem[] = [];

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
      const fullFileName = path.basename(file);
      const normalized = normalizeFirstFrameName(fileName);
      const existing = resourceMap.get(normalized) || {
        displayName: fullFileName
      };
      if (type === 'image') {
        existing.image = file;
        if (!existing.markdown) {
          existing.displayName = fullFileName;
        }
      } else {
        existing.markdown = file;
        existing.displayName = fullFileName; // 优先使用描述名，保留后缀
      }
      resourceMap.set(normalized, existing);
    };

    imageFiles.forEach(file => addFile(file, 'image'));
    markdownFiles.forEach(file => addFile(file, 'markdown'));

    if (resourceMap.size === 0) {
      items.push(
        new ResourceTreeItem(
          '暂无首帧资源',
          vscode.TreeItemCollapsibleState.None
        )
      );
      return items;
    }

    const sortedEntries = Array.from(resourceMap.entries()).sort((a, b) =>
      a[1].displayName.localeCompare(b[1].displayName, 'zh-CN')
    );

    for (const [, entry] of sortedEntries) {
      // 首帧描述和首帧图片分开显示为两个独立的 item
      if (entry.markdown) {
        const mdFileName = path.basename(entry.markdown);
        items.push(
          new ResourceTreeItem(
            mdFileName,
            vscode.TreeItemCollapsibleState.None,
            'firstFrameMarkdown',
            entry.markdown,
            undefined,
            {
              image: entry.image,
              markdown: entry.markdown
            }
          )
        );
      }
      if (entry.image) {
        const imageFileName = path.basename(entry.image);
        items.push(
          new ResourceTreeItem(
            imageFileName,
            vscode.TreeItemCollapsibleState.None,
            'firstFrameImage',
            entry.image,
            undefined,
            {
              image: entry.image,
              markdown: entry.markdown
            }
          )
        );
      }
    }

    return items;
  }

  /**
   * 获取视频片段列表
   */
  private async getClipItems(): Promise<ResourceTreeItem[]> {
    const clipsDir = path.join(this.workspaceRoot!, 'video-clip');
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
        fileName,
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
    
    const clipsDir = path.join(this.workspaceRoot!, 'video-clip');
    const clips = await listFiles(clipsDir, '.mp4');

    return [
      new ResourceTreeItem(
        `分镜数量: ${totalStoryboards}`,
        vscode.TreeItemCollapsibleState.None,
        'stats'
      ),
      new ResourceTreeItem(
        `分镜首帧: ${firstFrames.length}/${totalStoryboards}`,
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

  /**
   * 根据视频片段文件推导分镜路径
   */
  async getStoryboardPathFromClip(clipPath: string): Promise<string | undefined> {
    if (!this.workspaceRoot) {
      return undefined;
    }

    // 视频片段文件名格式: ${storyboard.id}.mp4
    const baseName = path.basename(clipPath, path.extname(clipPath));
    if (!baseName) {
      return undefined;
    }

    const storyboardPath = path.join(this.workspaceRoot, 'storyboards', `${baseName}.md`);
    if (await fileExists(storyboardPath)) {
      return storyboardPath;
    }

    return undefined;
  }

  /**
   * 处理拖拽事件
   */
  async handleDrag(source: ResourceTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    // 如果拖拽的是参考图节点，可以在这里设置拖拽数据
    // 目前主要支持从外部文件系统拖入，所以这里不需要特殊处理
  }

  /**
   * 处理拖放事件
   */
  async handleDrop(target: ResourceTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    if (!this.workspaceRoot) {
      return;
    }

    // 如果没有目标节点，不支持拖放
    if (!target) {
      return;
    }

    // 确定目标目录和允许的文件类型
    let targetDir: string | undefined;
    let allowedExtensions: string[] = [];
    let resourceTypeName = '';

    // 根据目标节点类型确定目标目录
    if (target.label.startsWith('📸') || target.resourceType === 'referenceImage') {
      // 参考图
      targetDir = path.join(this.workspaceRoot, 'ref-img');
      allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
      resourceTypeName = '参考图';
    } else if (target.label.startsWith('📄') || target.resourceType === 'script') {
      // 剧本
      targetDir = this.workspaceRoot;
      allowedExtensions = ['.md'];
      resourceTypeName = '剧本';
    } else if (target.label.startsWith('📝') || target.resourceType === 'storyboard') {
      // 分镜脚本
      targetDir = path.join(this.workspaceRoot, 'storyboards');
      allowedExtensions = ['.md'];
      resourceTypeName = '分镜脚本';
    } else if (target.label.startsWith('🖼️') || target.resourceType === 'firstFrameMarkdown' || target.resourceType === 'firstFrameImage') {
      // 首帧
      targetDir = path.join(this.workspaceRoot, 'first-frames');
      allowedExtensions = ['.md', '.png'];
      resourceTypeName = '首帧';
    } else if (target.label.startsWith('🎭') || target.resourceType === 'subjectMarkdown' || target.resourceType === 'subjectImage') {
      // 主体
      targetDir = path.join(this.workspaceRoot, 'subjects');
      allowedExtensions = ['.md', '.png'];
      resourceTypeName = '主体';
    } else if (target.label.startsWith('🌆') || target.resourceType === 'sceneMarkdown' || target.resourceType === 'sceneImage') {
      // 场景
      targetDir = path.join(this.workspaceRoot, 'scenes');
      allowedExtensions = ['.md', '.png'];
      resourceTypeName = '场景';
    } else if (target.label.startsWith('🎬') || target.resourceType === 'clip') {
      // 视频片段
      targetDir = path.join(this.workspaceRoot, 'video-clip');
      allowedExtensions = ['.mp4'];
      resourceTypeName = '视频片段';
    } else {
      // 不支持拖放到此节点
      return;
    }

    // 尝试从文件系统获取拖放的文件
    const files = await dataTransfer.get('text/uri-list')?.asString();
    if (!files) {
      return;
    }

    // 解析URI列表
    const uris = files.split('\n').filter(line => line.trim().length > 0);
    let successCount = 0;
    let errorCount = 0;
    
    for (const uriStr of uris) {
      try {
        const uri = vscode.Uri.parse(uriStr.trim());
        if (uri.scheme === 'file') {
          const filePath = uri.fsPath;
          const ext = path.extname(filePath).toLowerCase();
          
          // 检查文件扩展名是否允许
          if (allowedExtensions.includes(ext)) {
            const fileName = path.basename(filePath);
            const targetPath = path.join(targetDir!, fileName);
            
            // 如果文件已存在，询问是否覆盖
            if (await fileExists(targetPath)) {
              const result = await vscode.window.showWarningMessage(
                `文件 ${fileName} 已存在，是否覆盖？`,
                '覆盖',
                '跳过',
                '取消'
              );
              
              if (result === '取消') {
                return; // 取消整个操作
              } else if (result === '跳过') {
                continue; // 跳过当前文件
              }
            }
            
            // 确保目标目录存在
            await ensureDir(targetDir!);
            
            // 复制文件
            await copyFile(filePath, targetPath);
            successCount++;
          }
        }
      } catch (error) {
        console.error('处理拖放文件时出错:', error);
        errorCount++;
      }
    }

    // 刷新视图
    if (successCount > 0) {
      this.refresh();
      if (errorCount > 0) {
        vscode.window.showInformationMessage(`已添加 ${successCount} 个${resourceTypeName}，${errorCount} 个失败`);
      } else {
        vscode.window.showInformationMessage(`已添加 ${successCount} 个${resourceTypeName}`);
      }
    }
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

