# Vibe Video 插件实施计划（修订版）

> ⚠️ **重要说明**：本计划已根据核心问题"视频如何生成"进行修订。
> 详细对比分析见 `video-generation-options.md`

## 📋 项目概述

Vibe Video 采用**"恰到好处"的平衡设计**。插件的核心作用分为三层：

### 1️⃣ 轻量级部分（借助现有工具）
- **分镜脚本生成**：利用 Cursor AI / Copilot（通过 `.cursorrules` 提供上下文）
- **项目组织**：标准化文件结构和命名规范
- **资源浏览**：侧边栏展示项目状态

### 2️⃣ 必要的复杂性（无法避免）
- **视频生成**：调用视频 AI 的 API（通义万相）
  - ⚠️ AI 编程工具**不能生成视频**，必须调用专门的视频 AI
  - ✅ 但保持简单：单一 Provider（通义万相）+ 基础轮询
  - ⭐ **支持图生视频**：提供初始帧 → 更高质量、更可控
    - 文生图 API：生成初始帧
    - 图生视频 API：基于首帧生成视频
    - 详见 `image-to-video-workflow.md`

### 3️⃣ 可选功能
- **视频合成**：使用 ffmpeg 合成最终视频

**核心理念**：
- 不过度设计（避免原重型方案的复杂性）
- 不过度简化（确保核心功能可用）
- **开发时间：5-6周**（而不是3-4个月）

---

## 🎯 核心设计哲学

### 1. 利用现有 AI 工具
用户使用 Cursor、GitHub Copilot Chat、Claude 等工具时，插件提供的上下文帮助 AI 理解：
- 这是一个视频项目
- 如何生成分镜脚本
- 文件应该保存在哪里
- 使用什么格式

### 2. 约定优于配置
通过**标准文件夹结构**和**命名规范**，让项目自解释，AI 可以自动理解项目意图。

### 3. 轻量级技术栈
```
VS Code Extension
├── TypeScript 5.x
├── VS Code Extension API
├── 简单的 TreeView（资源浏览）
└── 可选：ffmpeg（视频合成）

配置文件（供AI理解）
├── .cursorrules / .clinerules
├── .vv-context/
│   ├── storyboard-schema.json
│   ├── prompts-template.md
│   └── project-guide.md
└── .vv-project.json（项目元信息）
```

---

## 🏗️ 项目结构设计

### 标准项目结构
当用户执行 `Vibe Video: Initialize Project` 时，创建：

```
MyVideoProject/
├── 剧本.md                      # 用户的原始剧本（任意格式）
│
├── .vv-project.json            # 项目元信息（视频尺寸、帧率等）
│
├── .cursorrules                # Cursor AI 上下文规则
├── .clinerules                 # Cline 上下文规则  
│
├── .vv-context/                # AI 助手参考文档
│   ├── README.md               # 项目说明（给AI看）
│   ├── storyboard-schema.json  # 分镜JSON格式规范
│   ├── shot-guide.md           # 镜头类型参考
│   └── prompt-examples.md      # 提示词示例
│
├── storyboards/                # 分镜脚本（AI生成）⭐ 用Markdown
│   ├── 01-opening.md
│   ├── 02-product-intro.md
│   └── ...
│
├── assets/                     # 资源文件
│   ├── subjects/               # 用户提供的素材（产品图、角色照片等）
│   ├── first-frames/           # AI生成的初始帧 ⭐ 新增
│   │   ├── 01-opening.png
│   │   ├── 02-product.png
│   │   └── ...
│   ├── audio/                  # 音频文件
│   ├── clips/                  # 生成的视频片段
│   │   ├── 01-opening.mp4
│   │   └── ...
│   └── references/             # 参考图（风格、构图等）
│
└── output/                     # 最终输出
    └── final.mp4
```

### 核心文件说明

#### `.cursorrules` / `.clinerules`
告诉 AI 助手这是一个视频项目，包含：
- 项目类型和目标
- 文件组织约定
- 分镜脚本生成规范
- 命名规则

#### 分镜格式（Markdown）⭐
分镜脚本用 Markdown 编写，更直观易读：
```markdown
# 场景标题

- **时长**: 5秒
- **首帧**: assets/subjects/character.png

详细的视觉描述...
包含：场景、主体、光线、运镜、动作、氛围
```

详见 `storyboard-markdown-format.md`

---

## 🗂️ 核心模块设计（简化版）

### 模块 1: 项目初始化器 (ProjectInitializer)
**职责**：
- 创建标准文件夹结构
- 生成 AI 上下文文件（.cursorrules等）
- 创建示例文件

**接口**：
```typescript
interface ProjectInitializer {
  initialize(workspaceRoot: string): Promise<void>;
  checkIfVVProject(path: string): boolean;
}
```

### 模块 2: 资源浏览器 (ResourceTreeProvider)
**职责**：
- 在侧边栏显示项目资源树
- 支持点击打开文件
- 提供上下文菜单

**功能**：
- 显示分镜脚本列表
- 显示视频片段
- 统计信息（总时长、进度等）

### 模块 3: 分镜解析器 (StoryboardParser) ⭐ 简化
**职责**：
- 解析 Markdown 文件，提取标题、描述、元数据
- 超简单：字符串处理，无需复杂库
- 宽松解析：支持多种格式，容错性强

**质量检查**（可选）：
- 描述长度建议
- 关键词建议（运镜、光线）
- 友好提示，不阻止使用

**重要**：Markdown 天然易读，无需复杂验证！
详见 `storyboard-markdown-format.md`

### 模块 4: 视频合成器 (VideoComposer) - 可选
**职责**：
- 按顺序合成 `assets/clips/` 中的视频
- 添加背景音乐
- 简单转场（淡入淡出）

**技术**：ffmpeg 命令行调用

---

## 🚀 实施计划（轻量版）

## 阶段 1: 核心脚手架（1周）
**目标**：项目初始化 + AI 上下文生成

### Task 1.1: 项目结构搭建（1-2天）
```typescript
src/
├── core/
│   ├── ProjectInitializer.ts    // 项目初始化
│   ├── TemplateGenerator.ts      // 生成.cursorrules等
│   └── StoryboardValidator.ts    // JSON验证
├── ui/
│   └── ResourceTreeProvider.ts   // 侧边栏
├── utils/
│   ├── fileSystem.ts
│   └── schema.ts                 // JSON Schema定义
└── extension.ts
```

### Task 1.2: 模板文件准备（1-2天）
创建内置模板（作为字符串或独立文件）：

**`.cursorrules` 模板**（Markdown 版 - 更简单）⭐：
```
这是一个 Vibe Video 视频项目。

## 你的任务
当用户要求"生成分镜"时：
1. 阅读 `剧本.md`
2. 将剧本拆分成多个 5-10 秒的场景
3. 为每个场景生成一个 **Markdown 文件**，保存到 `storyboards/`

## 分镜格式（Markdown）⭐

基础格式（最简单）：
```markdown
# 场景标题

详细的视觉描述...
包含：场景、主体、光线、运镜、动作、氛围
```

推荐格式（带元数据）：
```markdown
# 场景标题

- **时长**: 5秒
- **首帧**: assets/subjects/character.png

详细的视觉描述...
```

或者（AI生成首帧）：
```markdown
# 场景标题

- **生成首帧**: 25岁女性，短发，休闲装，城市背景

详细的视觉描述...
```

## 重点：写好描述！（这是最重要的）
每个描述必须包含：
1. 场景/环境 - 在哪里？什么背景？
2. 主体 - 画面的主要对象
3. 光线 - 什么样的光？从哪来？
4. 运镜 - 镜头如何移动？（推/拉/摇/移/固定）
5. 动作 - 画面中有什么在动？
6. 氛围 - 情绪和感觉（可选）

## 好描述示例
```markdown
# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
```

## 命名规则（随意）
- `01-opening.md` ✓
- `scene1.md` ✓
- `开场.md` ✓

Markdown 格式很灵活，重点是内容质量！
描述质量直接决定视频质量。
```

**Markdown 解析逻辑**（超简单）：
```typescript
interface Storyboard {
  id: string;           // 从文件名提取
  title: string;        // 从 # 标题提取
  description: string;  // 正文内容
  duration?: number;    // 从元数据提取
  firstFrame?: string;  // 从元数据提取
  firstFramePrompt?: string;
}

function parseMarkdownStoryboard(filePath: string): Storyboard {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');
  
  // 提取标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName;
  
  // 提取元数据（宽松匹配）
  const duration = extractDuration(content);  // "时长: 5秒" 或 "duration: 5"
  const firstFrame = extractFirstFrame(content);  // "首帧:", "firstFrame:" 等
  
  // 提取描述（去掉元数据）
  const description = extractDescription(content);
  
  return { id: fileName, title, description, duration, firstFrame };
}
```

说明：
- 无需 JSON Schema
- 无需严格验证
- 宽松解析，容错性强
- 重点是内容，不是格式

### Task 1.3: 实现项目初始化命令（2-3天）
- [ ] 命令：`Vibe Video: Initialize Project`
- [ ] 创建文件夹结构
- [ ] 生成 `.cursorrules` / `.clinerules`
- [ ] 生成 `.vv-context/` 中的所有参考文档
- [ ] 创建示例 `剧本.md`（如果不存在）
- [ ] 创建 `.vv-project.json`

### Task 1.4: Markdown 解析功能（1天）⭐ 简化
- [ ] 实现 StoryboardParser（Markdown 解析）
  - 提取标题（# 标题）
  - 提取元数据（时长、首帧等）
  - 提取描述（正文内容）
  - 宽松解析，支持多种格式
- [ ] 质量检查（建议，不强制）
  - 描述长度检查（建议 >100 字）
  - 关键词检查（是否提到运镜、光线）
- [ ] 命令：`Vibe Video: Check Storyboards`
- [ ] 显示结果：
  - ✅ 优秀
  - ⚠️ 可用但有建议
  - 💡 建议改进

**重点**：Markdown 天然易读，无需复杂验证！超简单！

---

## 阶段 1.5: 视频 API 集成（1周）⭐ 关键

**目标**：实现视频生成的核心功能

### Task 1.5.1: 设计 Provider 接口（1天）
- [ ] 定义 VideoAIProvider 接口
  ```typescript
  interface VideoAIProvider {
    name: string;
    generateVideo(prompt: string, options: VideoOptions): Promise<string>; // 返回任务ID
    checkStatus(taskId: string): Promise<TaskStatus>;
    downloadVideo(taskId: string, savePath: string): Promise<void>;
  }
  ```
- [ ] 定义配置结构（API Key、模型选择等）

### Task 1.5.2: 实现通义万相 Provider（4-5天）⭐ MVP 首选
**为什么选通义万相**：
- ✅ 国内服务，网络稳定
- ✅ 中文支持优秀（原生中文模型）
- ✅ 有官方 Node.js SDK
- ✅ 价格透明，新用户有免费额度
- ✅ 支付方便（支付宝/微信）
- ✅ **支持图生视频**（更高质量）⭐
- 详细对比见 `api-comparison.md`

**实现步骤**：
- [ ] 安装 `@alicloud/wan2-sdk`
- [ ] 创建 TongyiWanxiangProvider 类
- [ ] 实现 API 认证（AccessKey ID/Secret）

**文生图功能**（生成初始帧）：
- [ ] 实现 `textToImage()` 方法
- [ ] 支持自定义尺寸（匹配视频比例）
- [ ] 支持风格参数

**视频生成功能**：
- [ ] 实现 `textToVideo()` 方法（纯文生视频）
- [ ] 实现 `imageToVideo()` 方法（图生视频）⭐
- [ ] 自动判断：有首帧用图生视频，无首帧用文生视频

**通用功能**：
- [ ] 实现异步任务轮询
- [ ] 实现资源下载（图片/视频）
- [ ] 错误处理和重试

**参考文档**：
- [文生图 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2976416)
- [图生视频-基于首帧 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2862677)

**备注**：保持 Provider 接口设计，V1.1 可以轻松添加 Replicate 支持

### Task 1.5.3: API 配置界面（2天）
- [ ] 命令：`Vibe Video: Configure Video AI`
- [ ] 使用 QuickPick 选择 Provider（MVP只显示"通义万相"）
- [ ] 输入框输入 Access Key ID
- [ ] 输入框输入 Access Key Secret（密码模式）
- [ ] 保存到 VS Code Secret Storage（安全）
- [ ] 提供获取 Key 的引导链接（阿里云控制台）
- [ ] 测试连接功能

### Task 1.5.4: 批量生成命令（2-3天）
- [ ] 命令：`Vibe Video: Generate All Videos`
- [ ] 读取所有分镜 JSON
- [ ] 验证分镜格式
- [ ] 批量调用 Provider（带队列管理）
- [ ] 使用 VS Code Progress API 显示进度
- [ ] 显示成功/失败统计
- [ ] 通知用户完成

### Task 1.5.5: 生成初始帧命令（2-3天）⭐ 新增
- [ ] 命令：`Vibe Video: Generate First Frames`
- [ ] 扫描所有分镜 JSON
- [ ] 识别有 `firstFramePrompt` 的分镜
- [ ] 批量调用文生图 API
- [ ] 保存到 `assets/first-frames/{id}.png`
- [ ] 自动更新 JSON：
  - 添加 `firstFrame` 路径
  - 移除 `firstFramePrompt`
- [ ] 显示生成进度
- [ ] 详见 `image-to-video-workflow.md`

### Task 1.5.6: 单个分镜生成（1天）
- [ ] 在侧边栏/TreeView 中右键
- [ ] 菜单："生成初始帧"（如果有 firstFramePrompt）
- [ ] 菜单："生成视频"
- [ ] 调用 Provider 生成
- [ ] 显示进度

### 技术要点
```typescript
// 完整实现示例 - 通义万相（支持图生视频）⭐
import Wan2 from '@alicloud/wan2-sdk';
import fs from 'fs';

class TongyiWanxiangProvider implements VideoAIProvider {
  private client: Wan2;
  
  constructor(accessKeyId: string, accessKeySecret: string) {
    this.client = new Wan2({
      accessKeyId,
      accessKeySecret,
    });
  }
  
  // 文生图（生成初始帧）⭐
  async textToImage(prompt: string, options?: ImageOptions): Promise<string> {
    const result = await this.client.textToImage({
      prompt,
      size: options?.size || '1280x720',  // 匹配视频比例
      style: options?.style || 'realistic'
    });
    return result.taskId;
  }
  
  // 图生视频（基于首帧）⭐
  async imageToVideo(imagePath: string, prompt: string, options: VideoOptions): Promise<string> {
    // 读取图片
    const imageBuffer = await fs.promises.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    // 调用图生视频 API
    const result = await this.client.imageToVideo({
      image: imageBase64,
      prompt,  // 动作描述
      duration: options.duration || 5,
      motion: options.motion || 'medium',  // 运动幅度
      resolution: options.resolution || '1280x720',
    });
    return result.taskId;
  }
  
  // 纯文生视频（无首帧）
  async textToVideo(prompt: string, options: VideoOptions): Promise<string> {
    const result = await this.client.textToVideo({
      prompt,
      duration: options.duration || 5,
      resolution: options.resolution || '1280x720',
    });
    return result.taskId;
  }
  
  // 智能生成视频（自动判断）⭐
  async generateVideo(storyboard: Storyboard): Promise<string> {
    if (storyboard.firstFrame) {
      // 有首帧：使用图生视频
      return await this.imageToVideo(
        storyboard.firstFrame,
        storyboard.description,
        { duration: storyboard.duration }
      );
    } else {
      // 无首帧：使用纯文生视频
      return await this.textToVideo(
        storyboard.description,
        { duration: storyboard.duration }
      );
    }
  }
  
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const result = await this.client.queryTask(taskId);
    return {
      status: result.status,
      progress: result.progress,
      url: result.url,  // 图片或视频 URL
    };
  }
  
  async downloadResource(taskId: string, savePath: string): Promise<void> {
    const status = await this.checkStatus(taskId);
    if (status.status !== 'completed') {
      throw new Error('资源尚未生成完成');
    }
    
    const response = await fetch(status.url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(savePath, buffer);
  }
}
```

---

## 阶段 2: 资源管理与预览（1周）

### Task 2.1: 侧边栏视图（2-3天）
- [ ] 实现 ResourceTreeProvider
- [ ] 树形结构（友好的验证状态 + 初始帧）：
  ```
  Vibe Video
  ├── 📝 分镜脚本 (5) ⭐ Markdown
  │   ├── ✅ 01-opening.md (优秀, 有首帧 🖼️)
  │   ├── ✅ 02-product.md (纯文本)
  │   ├── ⚠️  03-scene.md (描述较短, 有首帧 🖼️)
  │   ├── 💡 04-transition.md (建议生成首帧)
  │   └── 05-ending.md
  │
  ├── 🖼️  初始帧 (3/5) ⭐ 新增
  │   ├── 01-opening.png ✓
  │   ├── 02-scene.png (待生成)
  │   └── 03-action.png ✓
  │
  ├── 🎬 视频片段 (3/5)
  │   ├── 01-opening.mp4 ✓
  │   ├── 02-product.mp4 ✓
  │   └── 03-scene.mp4 (生成中...)
  │
  └── 📊 项目信息
      ├── 总时长: 45秒
      ├── 初始帧进度: 3/5
      └── 视频进度: 3/5
  
  图标说明：
  ✅ = 优秀
  💡 = 有建议
  ⚠️ = 描述较短
  🖼️ = 有初始帧（图生视频）
  ```
- [ ] 点击打开 Markdown 文件（在编辑器中）
- [ ] Hover 显示预览和建议
- [ ] 初始帧缩略图显示

### Task 2.2: 右键菜单（1天）
- [ ] 在分镜 Markdown 上右键 ⭐
  - "在编辑器中打开" → 直接编辑 Markdown
  - "检查质量" → 显示建议
  - "优化描述" → 在 AI Chat 中打开优化提示
  - "复制描述" → 复制正文内容
  - "重新生成此视频"
- [ ] 在视频文件上右键
  - "在默认播放器中打开"
  - "查看对应的分镜脚本"
  - "显示文件信息"

**"优化描述"功能**：
自动在 AI Chat 中填充：
```
请优化这个分镜描述，确保包含：
1. 场景/环境
2. 主体
3. 光线（重点）
4. 运镜方式（重点）
5. 动作/运动
6. 氛围

当前内容：
[自动填充 Markdown 内容]
```

### Task 2.3: 统计与提示（1-2天）
- [ ] 状态栏显示：项目状态
- [ ] 命令：`Vibe Video: Show Project Stats`
  - 分镜数量
  - 已生成视频数量
  - 总时长
  - 缺失的资源

---

## 阶段 3: 视频合成（可选，1周）

### Task 3.1: ffmpeg 集成（2-3天）
- [ ] 检测系统 ffmpeg
- [ ] 如果没有，提供安装指引
- [ ] 封装 ffmpeg 调用

### Task 3.2: 基础合成功能（2-3天）
- [ ] 命令：`Vibe Video: Compose Final Video`
- [ ] 读取 `assets/clips/` 按顺序合成
- [ ] 显示进度条
- [ ] 保存到 `output/final.mp4`

### Task 3.3: 音频支持（1-2天）
- [ ] 支持背景音乐
- [ ] 从分镜JSON读取音频配置
- [ ] 简单的音频混合

---

## 阶段 4: 文档与发布（3-5天）

### Task 4.1: 用户文档
- [ ] 编写详细的 README
- [ ] 快速开始指南
- [ ] AI 助手使用技巧
- [ ] 常见问题

### Task 4.2: 示例项目
- [ ] 创建一个完整的示例
  - 剧本
  - 分镜脚本
  - 参考图
- [ ] 可以作为模板使用

### Task 4.3: 发布准备
- [ ] 完善 package.json
- [ ] 添加图标和截图
- [ ] 编写 CHANGELOG
- [ ] 测试安装流程

---

## 🛠️ 技术难点与解决方案（轻量版）

### 难点 1: AI 上下文的有效性
**挑战**：
- 如何确保 AI 助手正确理解项目结构
- 不同 AI 工具（Cursor、Copilot、Claude）的行为差异

**解决方案**：
- 提供多种格式的上下文文件（.cursorrules、.clinerules等）
- 在 `.vv-context/README.md` 中用自然语言详细说明
- 提供丰富的示例和模板
- 在插件中提供"复制为提示词"功能

### 难点 2: JSON Schema 验证
**挑战**：
- AI 生成的 JSON 可能不完全符合规范
- 需要提供友好的错误提示

**解决方案**：
- 使用 Ajv 进行严格验证
- 提供详细的错误信息和修复建议
- 支持"自动修复"常见错误（如格式化、添加缺失字段）
- 在文档中提供"最佳实践"指南

### 难点 3: 文件组织
**挑战**：
- 用户可能不按规范命名文件
- 分镜和视频的对应关系

**解决方案**：
- 宽松的文件名匹配（支持不同命名风格）
- 通过 ID 字段关联分镜和视频
- 提供"整理项目"命令，自动重命名和组织文件
- 侧边栏中高亮显示不匹配的文件

### 难点 4: 跨平台兼容性
**挑战**：
- 路径分隔符（Windows vs Unix）
- ffmpeg 的安装和调用

**解决方案**：
- 使用 Node.js 的 `path` 模块统一处理路径
- 提供平台特定的 ffmpeg 安装指引
- 在无 ffmpeg 时优雅降级（仅提供脚手架功能）

---

## 📦 依赖项清单（修订版）

### 生产依赖（极简）⭐
```json
{
  "@alicloud/wan2-sdk": "^1.0.0"       // 通义万相官方SDK
}
```

**说明**：
- ✅ 只需要 1 个依赖！
- ❌ 不需要 ajv（无需复杂验证）
- ❌ 不需要 gray-matter（简单字符串处理）
- ❌ 不需要其他解析库
- Markdown 解析：原生 `fs` + 正则即可

### 可选依赖
```json
{
  "fluent-ffmpeg": "^2.1.2",           // ffmpeg封装（视频合成功能）
  "replicate": "^0.25.0"               // Replicate SDK（V1.1添加，供国际用户）
}
```

### 开发依赖（已有）
- TypeScript 5.x
- ESLint
- esbuild
- VS Code Test 套件

**修订说明**：
- ✅ MVP 使用通义万相（国内服务，中文支持好）
- ✅ Replicate 作为可选依赖（V1.1添加）
- ❌ 仍不需要 gray-matter（不解析 Markdown）
- ❌ 不需要复杂的 Webview（使用 VS Code 原生 UI）
- 相比原重型方案，依赖仍然很少

**为什么选通义万相？**
详见 `api-comparison.md`，主要原因：
- 国内网络稳定
- 中文支持优秀
- 价格透明，有免费额度
- 支付方便

---

## 🧪 测试策略（轻量版）

### 单元测试
- ProjectInitializer: 测试文件夹创建和模板生成
- StoryboardValidator: 测试 JSON 验证逻辑
- FileSystem 工具: Mock 文件操作

### 集成测试
- 完整初始化流程
- 验证生成的文件结构和内容
- TreeView 数据加载

### 手动测试
- 在真实项目中使用 Cursor AI 生成分镜
- 验证 AI 是否理解 .cursorrules
- 测试不同操作系统（Windows, macOS, Linux）

### 性能测试
- 大型项目（100+ 分镜）的侧边栏加载
- JSON 验证性能

---

## 📊 里程碑时间线（最终版）

⚠️ **重要更新**：
1. 视频生成使用通义万相 API（详见 `api-comparison.md`）
2. 支持图生视频功能（详见 `image-to-video-workflow.md`）⭐

```
Week 1:    阶段1 - 核心脚手架（项目初始化 + AI上下文）
Week 2-3:  阶段1.5 - 通义万相API集成 ⭐
           - 文生图（生成初始帧）
           - 图生视频（基于首帧，更高质量）
           - 纯文生视频（无首帧时）
Week 4:    阶段2 - 资源管理与预览（侧边栏 + 验证 + 首帧预览）
Week 5:    阶段3 - 视频合成（ffmpeg）
Week 6:    阶段4 - 文档与发布
Total:     6周完成可用版本
```

**说明**：
- ✅ Cursor AI 生成分镜脚本（轻量）
- ✅ **图生视频**：提供初始帧，视频质量更高、更可控 ⭐
- ✅ 文生图：AI 生成初始帧，或用户提供自己的素材
- ✅ 通义万相：国内服务，网络稳定，中文支持好
- ✅ 比原重型方案（3-4个月）快很多
- ✅ 提供手动辅助工具给不想配置API的用户

---

## 🎓 学习资源

### VS Code 扩展开发
- [官方文档](https://code.visualstudio.com/api)
- [扩展示例](https://github.com/microsoft/vscode-extension-samples)
- [TreeView 指南](https://code.visualstudio.com/api/extension-guides/tree-view)

### JSON Schema
- [JSON Schema 官方文档](https://json-schema.org/)
- [Ajv 文档](https://ajv.js.org/)

### 视频处理（可选）
- [ffmpeg 文档](https://ffmpeg.org/documentation.html)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)

---

## ✅ 下一步行动

### 立即行动
1. **审查本计划**：确认这个轻量级方案符合预期
2. **创建模板文件**：先手写一份完整的 `.cursorrules` 和 schema
3. **手动测试**：在一个测试项目中，用 Cursor AI 验证这些规则是否有效

### 第一周行动
1. **搭建项目结构**（Day 1-2）
   - 创建核心模块文件
   - 定义 TypeScript 接口
   
2. **实现模板生成**（Day 2-3）
   - 将手写的模板集成到代码中
   - 实现 TemplateGenerator
   
3. **实现初始化命令**（Day 3-5）
   - ProjectInitializer 核心逻辑
   - 测试文件夹创建

### 验证标准
每个阶段完成后，应该能够：
- ✅ 阶段1: 运行命令创建完整项目结构，Cursor AI 能理解并生成分镜
- ✅ 阶段2: 在侧边栏看到所有资源，验证 JSON 格式
- ✅ 阶段3: 合成视频（如果实现）
- ✅ 阶段4: 发布到 Marketplace，他人可以安装使用

---

## 📝 核心优势总结（修订版）

### 与原方案对比

| 方面 | 原方案（重型） | 修订方案（平衡） |
|-----|-------------|-------------|
| **分镜生成** | 自己解析 Markdown + 复杂提示词工程 | ✅ 利用 Cursor AI（轻量） |
| **视频生成** | 多个 Provider + 过度抽象 | ✅ 简单接口 + Replicate（必要但简单） |
| **复杂度** | 高（过度设计） | 中（恰到好处） |
| **开发时间** | 3-4个月 | **5-6周** |
| **成本** | 用户需要视频 API 费用 | 用户需要视频 API 费用（相同） |
| **维护负担** | 大（多平台、复杂逻辑） | 小（单平台、简单逻辑） |
| **灵活性** | 受限于集成的 Provider | ✅ 分镜生成灵活 + 视频生成可扩展 |
| **用户体验** | 全自动（黑盒） | ✅ 半自动（可控） |

### 这个方案的独特价值

1. **分层的"轻量"设计**
   - ✅ 分镜生成：用 Cursor AI（真正轻量，无需插件参与）
   - ⚠️ 视频生成：调用 API（必要的复杂性，但保持简单）
   - ✅ 视频合成：ffmpeg（轻量）

2. **Markdown > JSON**（格式选择）⭐ 重要
   - 分镜脚本用 **Markdown**，不是 JSON
   - 直观易读，易于编辑
   - AI 天然理解，无需复杂验证
   - Git 友好，协作方便
   - 详见 `storyboard-markdown-format.md`

3. **内容 > 格式**（关键理念）⭐
   - 不纠结格式细节
   - 重点是教用户写好提示词
   - 验证是辅助性的，不是强制性的
   - 宽松解析，容错性强

4. **图生视频**（质量提升）⭐ 新增
   - 支持初始帧：提升视频质量和可控性
   - 文生图 + 图生视频：完整的工作流
   - 灵活：可选功能，不强制使用
   - 详见 `image-to-video-workflow.md`

5. **约定优于配置**：通过标准化的文件结构，让项目"自解释"

6. **快速迭代**：6周而不是3-4个月，快速验证想法

7. **实用性优先**：
   - 不追求完美的抽象设计
   - 专注于核心用户价值（批量生成视频）
   - 提供手动备选方案（"复制提示词"）
   - 友好的提示，不是严格的错误

8. **教育性**：通过详细的上下文文档，用户学习如何更好地使用 AI 生成内容

---

## 🎯 成功指标

### MVP 成功标准
- [ ] 用户可以在 1 分钟内初始化一个项目
- [ ] Cursor AI 能够根据 `.cursorrules` 正确生成分镜脚本
- [ ] 验证功能能捕获常见错误（但不阻止使用）
- [ ] 侧边栏清晰展示项目状态
- [ ] **支持图生视频**：能生成初始帧并用于视频生成 ⭐
- [ ] 图生视频效果明显优于纯文生视频

### 长期成功指标
- [ ] 用户反馈：流程是否顺畅
- [ ] AI 生成质量：分镜是否符合预期
- [ ] 社区贡献：是否有人分享模板和最佳实践
- [ ] 下载量：VS Code Marketplace 安装数

---

## 🚧 未来扩展方向（可选）

如果基础版本成功，可以考虑：

1. **图片编辑功能**⭐
   - 集成通义万相图片编辑 API
   - 调整初始帧（更换背景、调整构图）
   - 批量编辑（统一风格）
   - 参考：[图片编辑 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2865250)

2. **角色一致性**⭐
   - 提取主角特征
   - 在不同场景保持一致
   - 角色模板库

3. **AI 提示词优化助手**
   - 分析用户的分镜描述
   - 提供优化建议
   - 模板库（不同风格的描述范例）

4. **视频质量评估**
   - 简单的视频分析（时长、分辨率检查）
   - 一致性检查（风格、色调）
   - 初始帧与生成视频的对比

5. **协作功能**
   - 分镜评审流程
   - 版本比较
   - 团队模板共享

6. **多 Provider 支持**（V2.0）
   - 添加 Replicate（国际用户）
   - 添加 Runway、Pika（高质量选择）
   - 但保持作为可选功能，不影响核心流程

---

## 📮 反馈与迭代

建议在每个阶段完成后：
1. 自己实际使用一次（dogfooding）
2. 邀请 1-2 位朋友试用
3. 收集反馈，快速迭代
4. 在社区（如 Reddit、Twitter）分享进展

**记住**：这是一个轻量级工具，核心是帮助用户"组织"和"规范化"，而不是"自动化一切"。保持简单和专注是成功的关键。

---

## 💡 用户工作流示例

为了更清楚地说明这个方案，这里是一个完整的用户使用流程：

### 步骤 1: 创建项目
```
用户：打开 VS Code，创建文件夹 MyVideoProject
用户：创建 剧本.md，写下视频脚本（任意格式）
用户：Ctrl+Shift+P → "Vibe Video: Initialize Project"
插件：生成完整的项目结构和所有配置文件
```

### 步骤 2: 使用 AI 生成分镜 ⭐ Markdown
```
用户：打开 Cursor AI Chat（Ctrl+L）
用户：输入"根据剧本.md 生成分镜脚本"
AI：  读取 剧本.md 和 .cursorrules
AI：  理解：要生成 **Markdown 文件**
AI：  生成 storyboards/01-opening.md
AI：  生成 storyboards/02-product.md
AI：  ... (所有分镜)

每个文件内容示例：
---
# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光...
---
```

### 步骤 3: 检查和优化（可选）
```
插件：侧边栏自动显示所有分镜 ⭐ Markdown
      ✅ 01-opening.md (优秀)
      ⚠️  02-product.md (描述较短)
      💡 03-scene.md (建议添加运镜)
      
用户：看到 ⚠️ 或 💡 图标
用户：右键 → "检查质量" → 查看具体建议
      建议："描述较短（50字），建议 100 字以上"
      建议："未提到运镜，建议添加镜头运动描述"
      
用户：（可选）右键 → "在编辑器中打开"
用户：直接编辑 Markdown 文件
或者：右键 → "优化描述" → AI Chat 中优化

重点：Markdown 易读易改，直接编辑即可！
     即使有建议，也可以直接生成视频！
```

### 步骤 3.5: 配置视频 AI（一次性）
```
用户：Ctrl+Shift+P → "Vibe Video: Configure Video AI"
插件：显示可用的 Provider
用户：选择"通义万相"（推荐，国内服务，中文支持好）⭐
插件：提示"请访问阿里云控制台获取 Access Key"
用户：点击链接 → 打开 https://ram.console.aliyun.com/manage/ak
用户：在阿里云创建/查看 Access Key
用户：输入 Access Key ID（如：LTAI5t...）
用户：输入 Access Key Secret（密码模式，不显示）
插件：验证连接...
插件：✓ 连接成功！配置已安全保存。
```

**说明**：新用户通常有免费额度可以测试

### 步骤 4: 生成初始帧（可选，推荐）⭐ 新增
```
用户：查看侧边栏，发现某些分镜有 firstFramePrompt
用户：Ctrl+Shift+P → "Vibe Video: Generate First Frames"
插件：扫描所有分镜
插件：找到 3 个需要生成首帧的分镜
插件：批量调用文生图 API
插件：显示进度（"正在生成 2/3..."）
等待：1-2 分钟
插件：保存到 assets/first-frames/
插件：自动更新分镜 JSON
插件：通知："✓ 3 个首帧生成完成！"

用户：在侧边栏点击查看首帧缩略图
用户：（可选）右键 → "重新生成"（如果不满意）
```

**说明**：使用初始帧可以大幅提升视频质量和可控性！

### 步骤 5: 批量生成视频（自动化）⭐
```
用户：Ctrl+Shift+P → "Vibe Video: Generate All Videos"
插件：读取所有分镜 JSON
插件：检查是否有 firstFrame
插件：有首帧 → 调用"图生视频"API ⭐
      无首帧 → 调用"文生视频"API
插件：显示进度条（"正在生成 3/10..."）
等待：几分钟到几十分钟（取决于分镜数量）
插件：下载视频，自动保存到 assets/clips/01-opening.mp4
插件：通知："所有视频生成完成！ ✓ 8个成功（5个图生视频），✗ 2个失败"
```

**备选方案（手动）**：
如果用户不想配置 API，可以使用辅助工具：
```
用户：右键点击分镜 JSON → "复制为提示词"
用户：手动粘贴到通义万相网页
用户：下载视频并放入 assets/clips/
```

### 步骤 6: 合成最终视频（如果实现）
```
用户：Ctrl+Shift+P → "Vibe Video: Compose Final Video"
插件：检查所有视频片段
插件：按顺序合成（使用 ffmpeg）
插件：添加背景音乐（如果配置）
插件：保存到 output/final.mp4
插件：显示通知："视频合成完成！"
```

### 关键点
- **AI 是用户的工具**：用户使用 Cursor/Copilot/Claude，插件提供上下文
- **插件是助手**：提供结构、验证、组织，不控制整个流程
- **灵活性高**：用户可以手动编辑任何文件，跳过任何步骤
- **成本低**：利用用户已有的 AI 工具订阅

