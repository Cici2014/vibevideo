# Vibe Video：像写代码一样制作视频的 VS Code 扩展

## 前言

在 AI 视频生成技术快速发展的今天，如何让视频制作变得更加简单、高效？传统的视频制作工具往往需要复杂的操作界面和陡峭的学习曲线。而作为开发者，我们更习惯用代码的方式来表达创意。

**Vibe Video** 正是这样一个项目：它让视频制作变得像写代码一样简单——用 Markdown 写剧本，用 AI 生成分镜，批量生成视频片段，一键合成。本文将深入探讨这个项目的设计理念、技术架构和核心实现。

## 项目背景

### 为什么需要 Vibe Video？

1. **传统视频制作的痛点**
   - 需要专业的视频编辑软件（如 Premiere、Final Cut Pro）
   - 学习成本高，操作复杂
   - 难以批量处理，效率低下
   - 版本控制困难，协作不便

2. **AI 视频生成的机遇**
   - 文生视频、图生视频技术日趋成熟
   - 通义万相等 API 提供了便捷的接入方式
   - 但缺乏统一的工作流和项目管理工具

3. **开发者的需求**
   - 希望用熟悉的工具（VS Code）和格式（Markdown）
   - 需要版本控制和 Git 友好的项目结构
   - 需要可编程、可批量处理的工作流

### 核心理念：轻量到底

Vibe Video 的设计哲学是"轻量到底"（Lightweight to the Core），采用"恰到好处"的平衡设计：

- **Markdown > JSON**：分镜脚本用 Markdown，直观易读，AI 天然理解
- **内容 > 格式**：不纠结格式细节，重点是写好提示词
- **约定优于配置**：通过标准化文件结构，让项目"自解释"
- **利用现有 AI 工具**：不重复造轮子，插件提供上下文，让 Cursor/Copilot 等工具理解项目

## 技术架构

### 整体架构

```
Vibe Video Extension
├── 核心模块 (Core)
│   ├── ProjectInitializer    # 项目初始化
│   ├── StoryboardParser       # Markdown 分镜解析
│   ├── SubjectManager         # 主体库管理
│   ├── SceneManager           # 场景库管理
│   └── ConfigManager          # 配置管理
├── 提供者模块 (Providers)
│   ├── ProviderManager        # Provider 管理器
│   └── TongyiWanxiangProvider # 通义万相实现
├── UI 模块
│   └── ResourceTreeProvider   # 资源树视图
└── 命令模块 (Commands)
    ├── generateVideos         # 视频生成
    ├── generateFirstFrames    # 首帧生成
    ├── generateSubjects       # 主体生成
    └── generateScenes          # 场景生成
```

### 技术栈

- **语言**：TypeScript 5.x
- **框架**：VS Code Extension API
- **构建工具**：esbuild
- **API 集成**：通义万相（DashScope）
- **生产依赖**：仅 1 个（通义万相 API）

### 项目结构设计

Vibe Video 采用标准化的项目结构，让项目"自解释"：

```
MyVideoProject/
├── 剧本.md                   # 用户编写的剧本
├── subjects/                 # 主体/角色库
│   ├── 主角.md               # 主体描述
│   └── 主角.png              # 生成的主体图片
├── scenes/                   # 场景库
│   ├── 城市街道.md
│   └── 城市街道.png
├── storyboards/              # 分镜脚本（Markdown）
│   ├── 01-opening.md
│   └── ...
├── first-frames/             # 首帧（描述 + 图片）
│   ├── 01-opening-first-frame.md
│   └── 01-opening-first-frame.png
├── video-clip/               # 生成的视频片段
│   └── 01-opening.mp4
├── ref-img/                  # 参考图（可选）
├── .cursorrules              # AI 规则文件（自动生成）
└── .vv-project.json          # 项目配置（自动生成）
```

## 核心实现

### 1. 项目初始化

`ProjectInitializer` 负责创建标准化的项目结构：

```typescript
async initialize(rootPath: string): Promise<void> {
  // 1. 创建文件夹结构
  await this.createDirectories(rootPath);
  
  // 2. 生成配置文件
  await this.generateConfigFiles(rootPath, projectName);
  
  // 3. 生成 AI 上下文文件
  await this.generateAIContext(rootPath);
  
  // 4. 创建示例剧本
  await this.createExampleScript(rootPath);
}
```

关键特性：
- 自动生成 `.cursorrules`、`.clinerules` 等 AI 规则文件
- 创建 `.vv-context/` 目录，包含分镜指南、提示词示例等
- 生成示例剧本，帮助用户快速上手

### 2. Markdown 分镜解析

`StoryboardParser` 实现了灵活的 Markdown 解析，支持多种格式：

```typescript
async parseMarkdown(filePath: string): Promise<Storyboard> {
  const content = await readFile(filePath);
  
  // 提取元数据
  const duration = this.extractDuration(content);
  const firstFrame = this.extractFirstFrame(content);
  const videoPrompt = this.extractVideoPrompt(content);
  const referenceImages = this.extractReferenceImages(content);
  
  return {
    id: fileName,
    title,
    description,
    duration,
    firstFrame,
    videoPrompt,
    referenceImages,
    filePath
  };
}
```

解析特点：
- **宽松解析**：支持多种格式变体（中文/英文、冒号/中文冒号等）
- **容错性强**：即使格式不完全规范也能解析
- **提取关键信息**：时长、首帧、提示词、参考图等

示例分镜文件：

```markdown
# 开场镜头

- **时长**: 5秒
- **场景**: 城市街道
- **主体**: 主角
- **视频提示词**: 镜头缓慢推进，展现城市街道的繁华景象
- **参考图**: ref-img/product.jpg
```

### 3. 视频生成流程

Vibe Video 采用"图生视频"的方式，提供更高的质量和可控性：

```typescript
async imageToVideo(imagePath: string, prompt: string, options?: VideoOptions): Promise<string> {
  // 1. 将本地图片转换为 base64
  const imageBase64 = await imageToBase64(imagePath);
  
  // 2. 调用通义万相 API
  const resolution = options?.resolution || '1080P';
  const taskId = await this.client.imageToVideo(imageBase64, prompt, resolution);
  
  // 3. 轮询任务状态
  // 4. 下载生成的视频
  return videoPath;
}
```

工作流程：
1. **生成首帧图片**：基于分镜脚本生成第一帧画面
2. **图生视频**：以首帧为起点，生成视频片段
3. **批量处理**：支持批量生成所有分镜的视频
4. **状态管理**：通过轮询 API 跟踪生成进度

### 4. 主体和场景管理

为了确保视频中角色和场景的一致性，Vibe Video 引入了主体库和场景库：

**主体库（Subject Library）**：
- 每个主体有独立的描述文件（Markdown）
- 生成的主体图片背景为纯白色，便于合成
- 在生成首帧时，可以组合主体和场景

**场景库（Scene Library）**：
- 场景可以复用，提高效率
- 支持场景描述和生成的场景图片

```typescript
// 生成首帧时，可以组合主体和场景
async composeFirstFrame(
  subjectId: string,
  sceneId: string,
  layout: string
): Promise<string> {
  // 读取主体和场景图片
  const subjectImage = await loadImage(subjectPath);
  const sceneImage = await loadImage(scenePath);
  
  // 合成首帧（根据布局描述）
  return composedImagePath;
}
```

### 5. AI 上下文生成

为了让 Cursor AI 等工具理解项目结构，Vibe Video 自动生成 `.cursorrules` 文件：

```typescript
async generateCursorRules(): Promise<string> {
  // 读取模板
  const template = await readTemplate('AI-rules.md');
  
  // 注入项目特定信息
  return template
    .replace('{{PROJECT_NAME}}', projectName)
    .replace('{{PROJECT_STRUCTURE}}', getProjectStructure());
}
```

`.cursorrules` 文件包含：
- 项目结构说明
- 分镜脚本格式规范
- 提示词编写指南
- 工作流程说明

这样，当用户在 Cursor AI Chat 中输入"根据剧本.md 生成项目"时，AI 就能理解项目结构并生成正确的文件。

## 使用示例

### 1. 初始化项目

```bash
Ctrl+Shift+P → "Vibe Video: Initialize Project"
```

这会创建标准化的项目结构，并生成必要的配置文件和 AI 规则文件。

### 2. 编写剧本

编辑 `剧本.md`：

```markdown
# 我的视频剧本

## 第一幕：开场

主角走在繁华的城市街道上，镜头缓慢推进...

## 第二幕：产品展示

主角拿出产品，镜头聚焦在产品上...
```

### 3. 使用 AI 生成项目结构

在 Cursor AI Chat 中输入：

```
根据剧本.md 生成项目
```

AI 会自动：
1. 提取主体（主角等）
2. 提取场景（城市街道等）
3. 拆分分镜（5秒/10秒单元）
4. 生成分镜脚本（Markdown）
5. 生成首帧描述

### 4. 生成资源

使用侧边栏或命令：
- `Vibe Video: Generate All Subjects` - 生成所有主体图片
- `Vibe Video: Generate All Scenes` - 生成所有场景图片
- `Vibe Video: Generate First Frames` - 生成所有首帧
- `Vibe Video: Generate All Videos` - 生成所有视频片段

### 5. 查看和编辑

侧边栏资源树提供可视化管理：
- 查看所有资源（主体、场景、分镜、视频）
- 右键菜单快速生成单个资源
- 质量检查和友好建议

## 技术亮点

### 1. 灵活的 Markdown 解析

`StoryboardParser` 使用正则表达式实现灵活的解析，支持多种格式变体：

```typescript
// 支持多种时长格式
const patterns = [
  /[*-]\s*\*?\*?时长\*?\*?[：:]\s*(\d+)\s*秒/i,
  /[*-]\s*\*?\*?duration\*?\*?[：:]\s*(\d+)/i,
  /#.*\((\d+)\s*秒\)/,
];
```

### 2. 异步任务管理

视频生成是异步的，需要轮询 API 获取状态：

```typescript
async function pollTaskStatus(taskId: string): Promise<TaskStatus> {
  while (true) {
    const status = await provider.checkStatus(taskId);
    
    if (status.status === 'completed') {
      return status;
    } else if (status.status === 'failed') {
      throw new Error('任务失败');
    }
    
    await sleep(2000); // 等待 2 秒后重试
  }
}
```

### 3. 资源树视图

使用 VS Code 的 TreeView API 实现资源浏览：

```typescript
export class ResourceTreeProvider implements vscode.TreeDataProvider<ResourceTreeItem> {
  getChildren(element?: ResourceTreeItem): ResourceTreeItem[] {
    if (!element) {
      // 返回根节点
      return [subjectsRoot, scenesRoot, storyboardsRoot, ...];
    }
    // 返回子节点
    return this.getChildrenForElement(element);
  }
}
```

### 4. 配置管理

使用 VS Code 的配置 API 管理设置：

```typescript
export class ConfigManager {
  getDashScopeApiKey(): string {
    return vscode.workspace.getConfiguration('vibevideo')
      .get<string>('dashscope.apiKey', '');
  }
  
  getVideoResolution(): string {
    return vscode.workspace.getConfiguration('vibevideo')
      .get<string>('video.resolution', '720P');
  }
}
```

## 设计决策

### 为什么选择 Markdown？

1. **直观易读**：比 JSON 更友好
2. **AI 友好**：AI 工具天然理解 Markdown
3. **Git 友好**：易于版本控制和协作
4. **灵活性强**：支持多种格式变体

### 为什么选择图生视频？

1. **质量更高**：基于首帧生成，质量更稳定
2. **可控性强**：可以精确控制第一帧画面
3. **支持合成**：可以组合主体和场景生成首帧

### 为什么固定分镜时长为 5秒/10秒？

1. **批量处理**：统一时长便于批量生成
2. **成本控制**：固定时长便于估算成本
3. **简化流程**：减少配置复杂度

## 未来展望

### 已实现功能

- ✅ 项目初始化
- ✅ Markdown 分镜解析
- ✅ 主体库和场景库管理
- ✅ 首帧生成（文生图）
- ✅ 视频生成（图生视频）
- ✅ 多图合成（主体+场景）
- ✅ 质量检查
- ✅ 侧边栏资源视图
- ✅ 通义万相 API 集成

### 计划中功能

- 🚧 视频合成（ffmpeg 合成最终视频）
- 🚧 并行生成优化
- 🚧 更多 AI Provider 支持（Replicate、OpenAI Sora）
- 🚧 Claude Code Skills 支持

## 总结

Vibe Video 是一个"轻量到底"的 VS Code 扩展，它让视频制作变得像写代码一样简单。通过标准化的项目结构、灵活的 Markdown 解析和智能的 AI 集成，它提供了一个高效、可迭代的视频制作工作流。

**核心价值**：
- 🎯 **简单**：用 Markdown 写剧本，用 AI 生成分镜
- 🚀 **高效**：批量生成，自动化流程
- 🔧 **可控**：每个步骤都可以手动编辑和迭代
- 💰 **低成本**：利用用户已有的 AI 工具订阅

**适用场景**：
- 产品宣传视频
- 教育视频
- 短视频内容
- 任何需要批量生成视频的场景

如果你也想"像写代码一样制作视频"，不妨试试 Vibe Video！

---

**项目地址**：[GitHub](https://github.com/Cici2014/vibevideo)

**VS Code 市场**：[Vibe Video Extension](https://marketplace.visualstudio.com/vscode)

**许可证**：MIT

