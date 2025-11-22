# Vibe Video 使用教程

**像写代码一样制作视频**

---

## 📋 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [分镜脚本规范](#分镜脚本规范)
4. [核心功能](#核心功能)
5. [常见问题](#常见问题)

---

## 简介

Vibe Video 是一个 VS Code 扩展，让您能够**像写代码一样制作视频**：

- 📝 **用 Markdown 写剧本**
- 🤖 **AI 生成分镜结构**
- 🎬 **批量生成视频片段**
- ✅ **迭代优化**

### 工作流程

```
编写剧本 → AI生成项目结构 → 生成图片资源 → 生成视频片段 → 合成最终视频 → 完成
     ↑                                                                      ↓
     └────────────────────────────── 审核/迭代 ←──────────────────────────┘
```

---

## 快速开始

### 1. 环境准备

请参考 **[编辑器安装指南](other/editor-setup.md)** 完成编辑器环境配置。

### 2. 配置 API Key

Vibe Video 需要配置 AI 服务商的 API Key：

1. **获取 API Key**
   - 通义万相（推荐）：访问 [DashScope 控制台](https://bailian.console.aliyun.com/)
   - Replicate：访问 [Replicate 官网](https://replicate.com/)
   - Google Gemini：访问 [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **配置方式**
   - `Ctrl+,` → 搜索 `vibevideo` → 设置 Provider 和 API Key
   - 或 `Ctrl+Shift+P` → `Vibe Video: Configure Video AI`

### 3. 创建项目

1. 创建文件夹并打开：`File → Open Folder`
2. 初始化项目：`Ctrl+Shift+P` → `Vibe Video: Initialize Project`

项目结构：
```
MyVideoProject/
├── 剧本.md              # 您的剧本
├── subjects/            # 主体/角色
├── scenes/              # 场景
├── storyboards/         # 分镜脚本
├── first-frames/        # 首帧
├── video-clip/          # 视频片段
├── output/              # 最终合成视频
│   └── final.mp4
└── ...
```

### 4. 编写剧本

编辑 `剧本.md`：

```markdown
# 我的视频

## 场景 1：开场

主角走在城市街道上，微笑着向镜头挥手。

## 场景 2：展示

主角走进咖啡店，享受美好时光。
```

### 5. AI 生成项目结构

使用 AI 助手（参考 [编辑器安装指南](other/editor-setup.md)）生成项目结构。

在 AI 聊天窗口中输入：
```
根据剧本.md 生成完整的项目结构，包括：
1. 提取所有主体（角色），保存到 subjects/ 目录
2. 提取所有场景，保存到 scenes/ 目录
3. 将场景拆分成 5秒或10秒的分镜
4. 为每个分镜生成详细脚本，保存到 storyboards/ 目录
5. 为每个分镜生成首帧描述，保存到 first-frames/ 目录
```

### 6. 生成资源

批量生成：
- `Vibe Video: Generate All Subjects` - 生成主体图片
- `Vibe Video: Generate All Scenes` - 生成场景图片
- `Vibe Video: Generate First Frames` - 生成首帧图片
- `Vibe Video: Generate All Videos` - 生成视频

或右键点击资源选择生成命令。

### 7. 合成最终视频 ⭐

生成所有视频片段后，将它们合成为最终视频：

- `Vibe Video: Compose Video` - 将所有视频片段合成为最终视频

最终视频将保存到 `output/final.mp4`。

**注意**：视频合成需要 FFmpeg。扩展会自动检测并引导您安装 FFmpeg（如果需要）。

---

## 分镜脚本规范

### 标准格式

```markdown
# 场景标题

- **时长**: 5秒 或 10秒（**只能是5秒或10秒**）
- **主体**: 角色1, 角色2（可选）
- **场景**: 场景名（可选）
- **参考图**: first-frames/xxx-first-frame.png（可选）
- **首帧**: first-frames/xxx-first-frame.png（可选）
- **尾帧**: first-frames/xxx-last-frame.png（可选）

**提示词**：一段融合的完整描述，包含视频内容、声音、美学和风格。
```

### 字段说明

- **时长**（必需）：只能是 5秒 或 10秒
- **主体**（可选）：角色列表，用于确保角色外观一致
- **场景**（可选）：场景名称，用于复用场景资源
- **参考图**（推荐）：使用参考图可以让生成更可控
- **首帧**（可选）：用于图生视频
- **尾帧**（可选）：用于首尾帧生视频
- **提示词**（必需）：**必须是一段融合的完整描述，不能分条列出**

### 提示词示例

❌ **错误**：
```markdown
**视频提示词**：镜头推进
**声音提示词**：背景音乐轻松
**美学控制**：阳光明亮
```

✅ **正确**：
```markdown
**提示词**：镜头缓慢推进，主角从远处走来，微笑着向镜头挥手，背景音乐轻松愉快，阳光透过高楼洒下，营造出温暖明亮的氛围。
```

### 完整示例

```markdown
# 开场镜头

- **时长**: 5秒
- **主体**: 主角
- **场景**: 城市街道
- **首帧**: first-frames/01-opening-first-frame.png

**提示词**：镜头缓慢推进，展现城市街道的繁华景象，主角从远处走来，微笑着向镜头挥手，背景音乐轻松愉快，阳光透过高楼洒下，营造出温暖明亮的氛围，画面采用电影质感，色彩饱和度高。
```

---

## 核心功能

### 项目管理

- **初始化项目**：`Vibe Video: Initialize Project`
- **项目统计**：`Vibe Video: Show Project Stats`
- **质量检查**：`Vibe Video: Check Storyboards Quality`

### 资源生成

#### 主体生成
- 用途：确保角色外观一致
- 特点：白色背景，便于合成
- 命令：`Vibe Video: Generate All Subjects`

#### 场景生成
- 用途：创建背景环境
- 特点：可以复用
- 命令：`Vibe Video: Generate All Scenes`

#### 首帧生成
- 文生图：`Vibe Video: Generate First Frames`
- 合成：`Vibe Video: Compose All First Frames`（使用主体+场景）

#### 视频生成
- **图生视频**（推荐）：使用首帧图片 + 提示词
- **文生视频**：仅使用文本提示词
- **首尾帧生视频**（高级）：使用首帧 + 尾帧图片

#### 视频合成 ⭐
- **合成视频**：`Vibe Video: Compose Video` - 将所有视频片段合并为最终视频
- 使用 FFmpeg 按分镜顺序合并片段
- 输出：`output/final.mp4`
- 自动处理缺失片段（提示用户并允许继续）

### 配置管理

- 查看配置：`Vibe Video: Show Current Config`
- 修改配置：`Ctrl+,` → 搜索 `vibevideo`

主要配置项：
- `vibevideo.provider`：AI 服务商（默认：`tongyi-wanxiang`）
  - 选项：`tongyi-wanxiang`、`replicate`、`google`
- `vibevideo.dashscope.apiKey`：DashScope API Key（用于通义万相）
- `vibevideo.replicate.apiKey`：Replicate API Token（用于 Replicate）
- `vibevideo.google.apiKey`：Google API Key（用于 Google Gemini）
- `vibevideo.video.resolution`：视频分辨率（默认：`720P`）

---

## 常见问题

**Q: 分镜时长可以是其他值吗？**  
A: 不可以。只能是 **5秒 或 10秒**。

**Q: 提示词可以分条列出吗？**  
A: 不可以。必须是一段融合的完整描述。

**Q: 如何引用参考图？**  
A: 在分镜脚本中使用相对路径：`- **参考图**: ref-img/product.jpg`

**Q: 生成失败怎么办？**  
A: 检查 API Key、网络连接、API 额度，查看 VS Code 输出面板的错误信息。

**Q: 可以使用本地部署的模型吗？**  
A: 可以。配置 `vibevideo.dashscope.baseUrl` 为本地服务地址。

**Q: 如何将所有视频片段合成为最终视频？**  
A: 使用 `Vibe Video: Compose Video` 命令。需要 FFmpeg - 扩展会在需要时引导您安装。

**Q: 如果 FFmpeg 未安装怎么办？**  
A: 扩展会自动检测 FFmpeg 并引导您安装。您可以从系统 PATH 安装 FFmpeg 或通过 npm 包安装。

---

## 需要帮助？

- 📖 [编辑器安装指南](other/editor-setup.md)
- 📚 [API Key 获取指南](API-KEY-获取指南.md)
- 📧 邮箱：cici_yiyi@qq.com
- 💬 微信：扫码添加（见 README）

**享受用 Vibe Video 制作视频的乐趣！** 🎬
