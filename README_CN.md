# Vibe Video

**像写代码一样制作视频**

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/vscode)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![License: Commercial](https://img.shields.io/badge/License-Commercial-green.svg)](LICENSE-COMMERCIAL.md)
[![GitHub](https://img.shields.io/github/stars/Cici2014/vibevideo?style=social)](https://github.com/Cici2014/vibevideo)

**语言 / Language**: [中文简体](README_CN.md) | [English](README.md)

Vibe Video 是一个 VS Code 扩展，让您能够像写代码一样制作视频：用 Markdown 写剧本，用 AI 生成分镜，批量生成视频，一键合成。

![插件演示](img/preview.gif)

## ✨ 特性

### 🚀 轻量级工作流
- 用 Markdown 写剧本（任意格式）
- 用 Cursor AI 一键生成完整项目结构（主体、场景、分镜、首帧）
- 标准化的项目结构，Git 友好
- 分镜时长固定为 5秒/10秒，便于批量处理

### 🤖 智能 AI 集成
- 自动生成 `.cursorrules`，让 AI 理解项目结构和工作流
- 支持主体库管理，确保角色外观一致
- 支持场景库管理，复用场景资源
- 支持图生视频（更高质量、更可控）
- **多 AI Provider 支持**：
  - **通义万相 API**（国内服务，中文支持优秀，生产就绪）
  - **OpenAI Sora API**（支持 sora-2 视频生成，gpt-image-1/dall-e-3 图像生成）✅ **已测试**（推荐使用通义万相）
  - **Replicate API**（支持多种视频生成模型，如 Zeroscope、AnimateDiff 等）⚠️ **未测试**

### 📊 可视化管理
- 侧边栏展示项目资源（主体、场景、分镜、首帧、视频）
- 质量检查和友好建议
- 项目统计和进度追踪
- 右键菜单快速生成单个资源

### 🎬 完整流程

Vibe Video 的工作流就像写代码一样：**编写 → 生成 → 审核 → 迭代**。

```
📝 编写剧本（AI辅助）
    ↓
🤖 生成项目结构（主体/场景/分镜/首帧）
    ↓  ↖ 审核/迭代
🖼️ 生成图片资源（主体/场景/首帧）
    ↓  ↖ 审核/迭代
🎬 生成视频片段
    ↓  ↖ 审核/迭代
🎞️ 合成最终视频
    ↓
✅ 完成
```

**核心理念**：整个过程可以反复迭代，就像编码一样。生成资源就像"编译"，人工审核就像"找 bug"。如果不通过，可以多次迭代，直到满意为止。

## 💡 设计哲学：轻量到底

Vibe Video 采用"恰到好处"的平衡设计，核心理念是**轻量到底**。

### 🎯 三层设计原则

#### 1️⃣ 轻量级部分（借助现有工具）
- **分镜脚本生成**：利用 Cursor AI / Copilot（通过 `.cursorrules` 提供上下文）
  - ✅ AI 编程工具已经很强，我们不需要重复造轮子
  - ✅ 插件只提供上下文，让 AI 理解项目结构
- **项目组织**：标准化文件结构和命名规范
- **资源浏览**：简单的侧边栏视图

#### 2️⃣ 必要的复杂性（无法避免）
- **视频生成**：必须调用专门的视频 AI API
  - ⚠️ 如果让 AI 编程工具接入生成视频MCP理论上可行，但是过于烧钱
  - ✅ 但保持简单：单一 Provider + 基础轮询
  - ✅ 支持图生视频：提供初始帧 → 更高质量、更可控

#### 3️⃣ 可选功能
- **视频合成**：使用 ffmpeg（可选，不影响核心流程）

### 🌟 核心理念

#### **Markdown > JSON**
- 分镜脚本用 **Markdown**，不是 JSON
- 直观易读，易于编辑
- AI 天然理解，无需复杂验证
- Git 友好，协作方便

#### **内容 > 格式**
- 不纠结格式细节
- 重点是教用户写好提示词
- 验证是辅助性的，不是强制性的
- 宽松解析，容错性强

#### **约定优于配置**
- 通过标准化的文件结构，让项目"自解释"
- AI 可以自动理解项目意图
- 减少配置，提高效率

#### **利用现有 AI 工具**
- 不重复造轮子
- 用户使用 Cursor、Copilot、Claude 等工具时，插件提供上下文
- 插件是助手，不是控制器

#### **实用性优先**
- 不追求完美的抽象设计
- 专注于核心用户价值（批量生成视频）
- 快速迭代：6周而不是3-4个月
- 友好的提示，不是严格的错误

### 📊 技术栈极简

```
VS Code Extension
├── TypeScript 5.x
├── VS Code Extension API
├── 简单的 TreeView（资源浏览）
└── 可选：ffmpeg（视频合成）

配置文件（供AI理解）
├── .cursorrules / .clinerules
└── 标准化的项目结构
```

**生产依赖**：
- 通义万相 API（可选，默认，生产就绪）
- Replicate API（可选，替代 Provider）⚠️ **测试阶段**

### 🎓 为什么这样设计？

- ✅ **不过度设计**：避免重型方案的复杂性
- ✅ **不过度简化**：确保核心功能可用
- ✅ **快速迭代**：6周完成可用版本
- ✅ **用户可控**：用户可以手动编辑任何文件，跳过任何步骤
- ✅ **成本低**：利用用户已有的 AI 工具订阅

**记住**：这是一个轻量级工具，核心是帮助用户"组织"和"规范化"，而不是"自动化一切"。保持简单和专注是成功的关键。

## 🚀 快速开始

### 1. 初始化项目
```
Ctrl+Shift+P → "Vibe Video: Initialize Project"
```
或者在左侧 Vibe Video 资源树中点击“初始化项目”

### 2. 编写剧本
编辑 `剧本.md`，写下您的视频脚本

### 3. 使用 AI 生成完整项目结构
在 Cursor AI Chat 中输入：
```
根据剧本.md 生成项目
```

AI 会自动执行以下步骤：
1. **提取主体**：从剧本中提取主要角色/主体，保存到 `subjects/` 目录
2. **提取场景**：从剧本中提取各个场景，保存到 `scenes/` 目录
3. **拆分分镜**：将场景拆分成 5秒/10秒 的分镜单元（**分镜时长只能是5秒或10秒**）
4. **生成分镜脚本**：为每个分镜写好详细脚本，保存到 `storyboards/` 目录
5. **生成首帧描述**：为每个分镜写好第一帧画面描述，保存到 `first-frames/` 目录

### 4. 配置 API（一次性）⭐

**方式 1**：使用命令
```
Ctrl+Shift+P → "Vibe Video: Configure Video AI"
→ 点击"打开设置"
```

**方式 2**：直接打开设置（推荐）
```
Ctrl+, → 搜索 "vibevideo"
→ 选择 Provider（通义万相 或 Replicate）
→ 输入 API Key/Token
```

**支持的 Provider：**
- **通义万相**：输入 DashScope API Key（推荐，✅ **已测试**，生产就绪）
- **OpenAI Sora**：输入 OpenAI API Key（从 https://platform.openai.com/api-keys 获取）✅ **已测试**（推荐使用通义万相）
- **Replicate**：输入 Replicate API Token（从 https://replicate.com/account/api-tokens 获取）⚠️ **未测试**
- **Google Gemini**：输入 Google API Key（⚠️ **未测试**）

**⚠️ 测试状态说明**：
- ✅ **已测试**：通义万相已通过完整测试，功能正常，推荐使用
- ✅ **已测试**：OpenAI Sora 已测试，但**推荐使用通义万相**
- ❌ **未测试**：其他 Provider（Replicate、Google Gemini）代码已实现，但尚未进行实际 API 测试

配置会自动保存到 VS Code 设置中

### 5. 使用的 AI 模型

Vibe Video 使用以下 AI 模型完成不同的生成任务：

#### 🤖 通义万相（DashScope）- ✅ 已测试，生产就绪

| 任务类型 | 模型 | 说明 | 测试状态 |
|---------|------|------|---------|
| **文生图** | `wan2.5-t2i-preview` | 从文本提示词生成图片（用于主体、场景、首帧） | ✅ 已测试 |
| **图生图** | `wan2.5-i2i-preview` | 多图合成（用于主体+场景合成） | ✅ 已测试 |
| **文生视频** | `wan2.5-i2v-preview` | 直接从文本提示词生成视频 | ✅ 已测试 |
| **图生视频** | `wan2.5-i2v-preview` | 从首帧图片生成视频 | ✅ 已测试 |
| **首尾帧生视频** | `wan2.2-kf2v-flash` | 从首帧和尾帧图片生成视频（用于精确控制） | ✅ 已测试 |
| **图像编辑** | `qwen-image-edit-plus` | 使用文本提示词编辑图片（修改背景、添加元素等） | ✅ 已测试 |

#### 🌐 Replicate - ⚠️ 未测试

| 任务类型 | 默认模型 | 说明 | 测试状态 |
|---------|---------|------|---------|
| **文生图** | `stability-ai/sdxl` | 从文本提示词生成图片 | ❌ 未测试 |
| **图生图** | - | 图片编辑功能 | ❌ 不支持 |
| **文生视频** | `anotherjesse/zeroscope-v2-xl` | 从文本提示词生成视频 | ❌ 未测试 |
| **图生视频** | `anotherjesse/zeroscope-v2-xl` | 从首帧图片生成视频 | ❌ 未测试 |
| **首尾帧生视频** | - | 从首帧和尾帧图片生成视频 | ❌ 不支持 |

#### 🎬 OpenAI Sora - ✅ 已测试（推荐使用通义万相）

| 任务类型 | 默认模型 | 说明 | 测试状态 |
|---------|---------|------|---------|
| **文生图** | `gpt-image-1` | 从文本提示词生成图片（也支持 `dall-e-3`） | ✅ 已测试 |
| **图生图** | `gpt-image-1` | 图片编辑功能（支持多图合成） | ✅ 已测试 |
| **文生视频** | `sora-2` | 从文本提示词生成视频 | ✅ 已测试 |
| **图生视频** | `sora-2` | 从首帧图片生成视频 | ✅ 已测试 |
| **首尾帧生视频** | - | 从首帧和尾帧图片生成视频 | ❌ 不支持 |

#### 🔷 Google Gemini - ⚠️ 未测试

| 任务类型 | 默认模型 | 说明 | 测试状态 |
|---------|---------|------|---------|
| **文生图** | `gemini-3-pro-image-preview` | 从文本提示词生成图片 | ❌ 未测试 |
| **图生图** | `gemini-2.5-flash-image` | 图片编辑功能 | ❌ 未测试 |
| **文生视频** | `veo-3` | 从文本提示词生成视频 | ❌ 未测试 |
| **图生视频** | `veo-3` | 从首帧图片生成视频 | ❌ 未测试 |
| **首尾帧生视频** | - | 从首帧和尾帧图片生成视频 | ❌ 不支持 |

**⚠️ 测试状态说明**：

- ✅ **通义万相**：已通过完整测试，所有功能正常，**强烈推荐用于生产环境**
- ✅ **OpenAI Sora**：已测试，所有功能正常，但**推荐使用通义万相**
- ❌ **其他 Provider**（Replicate、Google Gemini）：代码已实现，但尚未进行实际 API 测试
  - 可能遇到未发现的 bug
  - API 格式可能与预期不符
  - 功能可能不完整
  - 如发现问题，欢迎提交 Issue 反馈

**注意**：Replicate、OpenAI Sora、Google Gemini 的模型可以在设置中自定义。上述列出的模型为默认值。

### 6. 生成资源
使用侧边栏资源视图或命令：
- **生成主体图片**：`Vibe Video: Generate All Subjects`
- **生成场景图片**：`Vibe Video: Generate All Scenes`
- **生成首帧图片**：`Vibe Video: Generate First Frames`
- **生成视频**：`Vibe Video: Generate All Videos`

## 📁 项目结构

```
MyVideoProject/
├── 剧本.md                   # 您的剧本
├── subjects/                 # 主体/角色（描述 + 生成的图片）
│   ├── 主角.md               # 主体描述
│   ├── 主角.png              # 生成的主体图片
│   └── ...
├── scenes/                   # 场景（描述 + 生成的图片）
│   ├── 城市街道.md           # 场景描述
│   ├── 城市街道.png          # 生成的场景图片
│   └── ...
├── storyboards/              # 分镜脚本（Markdown）
│   ├── 01-opening.md
│   └── ...
├── first-frames/             # 首帧（描述 + 生成的图片）
│   ├── 01-opening-first-frame.md  # 首帧描述
│   ├── 01-opening-first-frame.png # 生成的首帧图片
│   └── ...
├── video-clip/               # 生成的视频片段
│   ├── 01-opening.mp4
│   └── ...
├── ref-img/                  # 用户自定义参考图（可选）
│   └── product.jpg
├── output/                   # 最终合成视频
│   └── final.mp4
├── .vv-context/              # AI 上下文文档（自动生成）
├── .temp/                    # 临时文件
├── .cursorrules              # Cursor AI 规则（自动生成）
├── .clinerules               # Cline AI 规则（自动生成）
└── .vv-project.json          # 项目配置（自动生成）
```

### 📝 重要说明

- **分镜时长**：每个分镜的时长**只能是5秒或10秒**，不支持其他时长
- **主体功能**：用于确保角色外观一致，主体图片背景为纯白色
- **参考图**：说明需要参考的图片，用文件地址URL表示
- **尾帧功能**：在分镜脚本中添加 `- **尾帧**: first-frames/xxx-last-frame.png` 字段，可使用首尾帧生成视频，实现更精确的画面控制 ⭐ 新增

## 📋 要求

- VS Code 1.105.0 或更高版本
- Node.js 18+
- （可选）ffmpeg - 用于视频合成

## 🎯 命令列表

### 项目管理
- `Vibe Video: Initialize Project` - 初始化项目结构
- `Vibe Video: Check Storyboards Quality` - 检查分镜质量
- `Vibe Video: Show Project Stats` - 显示项目统计
- `Vibe Video: Refresh Resources` - 刷新资源视图

### 配置
- `Vibe Video: Configure Video AI` - 配置视频 AI 服务
- `Vibe Video: Show Current Config` - 显示当前配置

### 生成资源
- `Vibe Video: Generate All Subjects` - 批量生成所有主体图片
- `Vibe Video: Generate All Scenes` - 批量生成所有场景图片
- `Vibe Video: Generate First Frames` - 批量生成所有首帧图片
- `Vibe Video: Generate All Videos` - 批量生成所有视频
- `Vibe Video: Compose All First Frames` - 使用主体和场景合成首帧
- `Vibe Video: Generate All Videos From First Last Frame` - 根据首尾帧批量生成所有视频 ⭐
- `Vibe Video: Compose Video` - 将所有视频片段合成为最终视频 ⭐ 新增

### 单个生成（右键菜单）
- `生成主体` - 生成单个主体图片
- `生成场景` - 生成单个场景图片
- `生成视频` - 生成单个视频片段
- `根据首尾帧生成视频` - 根据首帧和尾帧生成视频 ⭐
- `图像编辑` - 使用 AI 编辑图片（修改背景、添加元素等）⭐ 新增

## 🚧 开发状态

当前版本：**0.0.13 (Alpha)**

### ✅ 已实现
- 项目初始化（包含主体、场景目录）
- Markdown 分镜解析（支持主体、场景、参考图、尾帧）
- 主体库管理（生成主体图片）
- 场景库管理（生成场景图片）
- 首帧生成（文生图）
- 视频生成（图生视频，基于首帧）
- **首尾帧生成视频**（使用首帧+尾帧生成视频）⭐
- 多图合成（主体+场景合成首帧）
- **视频合成**（使用 FFmpeg 合成最终视频）⭐
- **图像编辑**（使用 AI 通过文本提示词编辑图片）⭐ 新增
- 质量检查
- 侧边栏资源视图
- **多 AI Provider 支持**：
  - 通义万相 API 集成（默认，✅ **已测试**，生产就绪，支持首尾帧生成视频）
  - OpenAI Sora API 集成（支持 sora-2 视频生成，gpt-image-1/dall-e-3 图像生成）✅ **已测试**（推荐使用通义万相）
  - Replicate API 集成（支持 Zeroscope、AnimateDiff、SDXL 等多种模型）⚠️ **未测试**
  - Google Gemini API 集成（支持 gemini-3-pro-image-preview、veo-3 等模型）⚠️ **未测试**

### 🚧 开发中
- 并行生成优化
- **更多 AI Provider 支持**：
  - ✅ OpenAI Sora Provider 支持（已实现，✅ 已测试，推荐使用通义万相）
- **Claude Code Skills 支持**：
  - 集成 Claude Code 的 skills 功能，通过 skills 强化生成的提示词质量
  - 提供丰富的优秀提示词示例库（产品展示、生活方式、故事类等场景）
  - 基于示例库自动优化主体描述、场景描述和首帧描述的生成质量
  - 通过 skills 让 AI 学习最佳实践，生成更专业、更符合视频制作要求的提示词
  - 提升 AI 生成内容的一致性、准确性和可执行性

## 📚 文档

详细文档请查看 `DOC/` 目录：
- [使用教程](DOC/tutorial.md) - Vibe Video 完整使用指南（待完善）
- [API Key 获取指南](DOC/API-KEY-Guide.md) - 如何获取 DashScope API Key
- [API 对比分析](DOC/api-comparison.md) - 视频生成 API 对比（Replicate vs 通义万相）
- [本地部署配置指南](DOC/Local-Deployment-Guide.md) - 如何配置本地部署的 Wan2.5

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，欢迎联系：

- 📧 邮箱：cici_yiyi@qq.com
- 💬 微信：扫码添加（二维码图片）
- 👥 QQ群：454222772

![微信二维码](wechat-qrcode.png)

### 💼 服务支持

- 🔧 **技术支持**：提供使用过程中的技术问题解答和故障排查
- 🎨 **定制开发**：根据您的需求提供功能定制和二次开发服务

## 📄 License

Vibe Video 采用双重许可模式：

- **GPL v3**：适用于开源项目和个人开发者（详见 [LICENSE](LICENSE)）
- **商业许可**：适用于需要闭源使用或不想遵守 GPL 条款的商业用户（详见 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)）

### 选择许可

- **开源使用**：如果您是开源项目或个人开发者，可以直接使用 GPL v3 许可，完全免费
- **商业使用**：如果您需要在专有软件中使用或不想开源衍生作品，请购买商业许可

如需购买商业许可，请联系：
- 📧 邮箱：cici_yiyi@qq.com
- 💬 微信：扫描二维码添加
- 👥 QQ群：454222772

---

**享受用 Vibe Video 制作视频的乐趣！** 🎬
