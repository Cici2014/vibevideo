# Change Log

Vibe Video 扩展的所有重要变更都会记录在这个文件中。

## [0.0.1] - 2025-11-14

### ✅ 已实现

#### 项目初始化
- 实现 `Vibe Video: Initialize Project` 命令
- 自动创建标准项目结构
- 生成 `.cursorrules` 和 `.clinerules`（AI 上下文）
- 生成参考文档（分镜指南、镜头指南、提示词示例）
- 自动创建示例剧本

#### Markdown 分镜解析
- 支持 Markdown 格式的分镜脚本
- 宽松解析：提取标题、时长、首帧、描述
- 支持多种元数据格式
- 无需复杂验证库，保持轻量

#### 质量检查
- 实现 `Vibe Video: Check Storyboards Quality` 命令
- 友好的质量评级（优秀/良好/可用/需改进）
- 描述长度检查
- 关键词建议（运镜、光线、动作）
- 不阻止使用，只提供建议

#### 侧边栏视图
- 实现资源树视图
- 显示分镜脚本列表
- 显示初始帧和视频片段
- 显示项目统计信息
- 质量状态可视化（✅ ⚠️ 💡）
- 点击打开文件

#### 其他
- 实现 `Vibe Video: Show Project Stats` 命令
- 实现 `Vibe Video: Refresh Resources` 命令
- 自动 .gitignore 配置

### 🎯 核心理念

- **Markdown > JSON**: 分镜脚本用 Markdown，更直观易读
- **内容 > 格式**: 不强制格式，重点是描述质量
- **轻量级**: 只依赖 1 个生产依赖
- **AI 友好**: 通过 .cursorrules 让 AI 理解项目

### 📦 依赖

生产依赖：
- 无（当前阶段不需要外部依赖）

开发依赖：
- TypeScript 5.9.3
- ESLint
- esbuild

### 🚧 下一步

- [x] Provider 架构设计 ✅
- [x] 配置管理实现 ✅
- [x] API 配置界面 ✅
- [x] 批量生成命令 ✅
- [ ] 集成真实的阿里云 SDK（需要 SDK 文档）
- [ ] 实现视频合成

---

## [0.0.2] - 2025-11-14

### ✅ 新增（阶段 1.5 框架）

#### API 配置（改进！）⭐
- 实现 `Vibe Video: Configure Video AI` 命令
- **使用 VS Code 设置面板配置**（更友好！）
- 支持配置通义万相 Access Key
- 5 个配置项：Provider、Access Key ID/Secret、分辨率、时长
- 引导用户到设置页面或获取 Key
- 配置自动保存，随时可查看修改

#### Provider 架构
- 设计 VideoAIProvider 接口
- 实现 ProviderManager（管理 Provider 实例）
- 实现 ConfigManager（管理敏感配置）
- 支持未来扩展多 Provider

#### 通义万相 Provider（框架）
- 定义完整的接口实现
- 文生图接口（生成初始帧）
- 图生视频接口（基于首帧）
- 纯文生视频接口
- 任务状态查询和资源下载
- ⚠️ 实际 API 调用需要真实 SDK

#### 视频生成命令
- 实现 `Generate All Videos` 命令
- 批量生成逻辑
- 进度显示（N/M）
- 智能判断：有首帧→图生视频，无首帧→文生视频
- 错误处理和统计

#### 首帧生成命令
- 实现 `Generate First Frames` 命令
- 扫描需要生成首帧的分镜
- 批量调用文生图 API
- 自动更新分镜 Markdown 文件
- 将 firstFramePrompt 转换为 firstFrame

#### 其他
- 实现 `Show Current Config` 命令
- 任务轮询机制（支持异步 API）
- 完整的错误处理

### 📊 代码统计

- TypeScript 文件：**13 个**（+6）
- 总行数：**约 1500 行**（+700）
- 新增命令：**4 个**
- 编译状态：✅ 通过

---

## [0.0.3] - 2025-11-19

### ✅ 新增功能

#### 首尾帧生成视频 ⭐
- 实现 `Vibe Video: Generate Video From First Last Frame` 命令
- 实现 `Vibe Video: Generate All Videos From First Last Frame` 命令
- 支持在分镜脚本中指定尾帧（`lastFrame` 字段）
- 使用通义万相 `wan2.2-kf2v-flash` 模型，支持首帧+尾帧生成视频
- 智能回退：如果只有首帧，自动使用普通图生视频
- 批量生成支持，显示详细进度和统计信息
- 完整的错误处理和用户提示

#### 分镜解析增强
- 扩展 `StoryboardParser` 支持提取尾帧路径
- 支持多种尾帧格式：`- **尾帧**: path`、`- lastFrame: path`、`[尾帧: path]`
- 更新 `Storyboard` 类型定义，添加 `lastFrame` 字段

#### API 客户端增强
- 实现 `BailianAPIClient.firstLastFrameToVideo()` 方法
- 支持首尾帧 Base64 编码和异步任务处理
- 完整的请求/响应日志记录

#### 模板和文档更新
- 新增 `templates/storyboard-prompt-examples.md` - 分镜脚本提示词示例库
  - 包含视频声音生成示例（人声、音效、环境音）
  - 包含电影美学控制示例（运镜、光线、构图）
- 更新 `templates/AI-rules.md` - AI 规则模板
- 更新 `templates/storyboard-guide.md` - 分镜指南
- 更新 `templates/shot-guide.md` - 镜头指南
- 更新 `templates/context-readme.md` - 上下文说明
- 删除 `templates/prompt-examples.md`（已整合到新文件）

#### 用户体验改进
- 资源树视图支持显示尾帧信息
- 右键菜单支持根据首尾帧生成视频
- 改进的错误提示和用户引导
- 优化批量生成的进度显示

### 📊 技术细节

- 新增文件：`src/commands/generateVideoFromFirstLastFrame.ts`（约 530 行）
- 更新文件：`src/types.ts`、`src/core/StoryboardParser.ts`、`src/providers/BailianAPIClient.ts`
- 支持 Provider：目前仅支持通义万相（TongyiWanxiangProvider）

### 🎯 使用场景

首尾帧生成视频功能特别适用于：
- 需要精确控制视频开始和结束画面的场景
- 需要实现特定转场效果的视频
- 需要确保视频首尾画面一致性的场景

---

## [0.0.4] - 2025-11-20

### ✅ Phase 2.1: 分组合成优化

#### 问题修复
- 🐛 修复多图合成 API 限制问题（最多 3 张图）
- ✅ （已废弃）曾实现自动分组合成，支持 4-6 个主体

#### 核心改进
- **策略 A**：1-3 个主体 → 单次合成
- **策略 B**：临时禁用（多批合成效果不佳）
- **策略 C**：>3 个主体 → 当前仅使用前 3 个主体
- 自动管理中间文件（保存+清理）
- 优化第二批合成提示词（强调保持已有内容）

#### 用户体验
- 当前超过 3 个主体会提示仅使用前 3 个，并建议拆分分镜
- 详细的日志输出（显示批次和进度）
- 友好的错误提示（建议拆分分镜）

#### Hotfix
- 🚫 暂时禁用二次合成：超过 3 个主体时仅使用前 3 个
- 📣 UI 提示用户拆分分镜或减少主体数量

### ✅ Phase 2: 角色库功能

#### 核心功能
- 实现主体/角色管理（SubjectManager）
- 支持在 `subjects/` 目录管理主体 Markdown 文件
- 实现 Base64 图片编码工具
- 集成多图合成 API（qwen-image-edit-plus）
- 扩展分镜解析器：提取主体、场景、构图

#### 新增命令
- `Vibe Video: Generate All Subjects` - 批量生成主体图片
- `Vibe Video: Compose All First Frames` - 使用主体合成初始帧

#### 项目初始化更新
- 自动创建 `subjects/` 目录
- 生成主体库 README.md
- 创建示例主体文件

#### 文档
- 更新 .cursorrules 模板，教 AI 使用主体功能
- 创建《角色库使用指南.md》（完整教程）

#### 解决的问题 ⭐
- ✅ 解决角色一致性问题
- ✅ 支持多角色场景
- ✅ 主体可在不同场景重用

---

## [0.0.5] - 2025-11-20

### 🐛 问题修复

#### 图片比例优化
- 修复首帧图片比例问题：为 `composeMultipleImages` API 添加 `size` 参数
- 确保所有首帧图片使用 16:9 比例（1280x720）
- 将主体图尺寸从 1024x1024 改为 1280x720（16:9 比例）
- 统一所有生成图片的宽高比，确保视频生成的一致性

#### 技术改进
- 更新 `BailianAPIClient.composeMultipleImages()` 方法，支持指定输出尺寸
- 优化图片生成命令，统一使用 16:9 比例
- 改进图片尺寸配置，确保与视频分辨率匹配

### 📊 影响范围

- 首帧生成：所有新生成的首帧图片将使用 16:9 比例
- 主体生成：所有新生成的主体图片将使用 16:9 比例
- 多图合成：合成后的首帧图片将保持 16:9 比例
- 向后兼容：已生成的图片不受影响，新生成的图片将使用新比例

---

## [0.0.6] - 2025-01-22

### ✅ 新增功能

#### 视频合成 ⭐
- 实现 `Vibe Video: Compose Video` 命令
- 使用 FFmpeg 将所有视频片段按分镜顺序合成为一个长视频
- 自动检测并安装 FFmpeg（支持系统 PATH 和 npm 包安装）
- 智能处理缺失的视频片段（提示用户并允许继续合成）
- 支持 Windows、macOS、Linux 多平台
- 完整的进度显示和错误处理
- 输出文件到 `output/final.mp4`

#### FFmpeg 工具类
- 实现 `FFmpegManager` 工具类
- 自动检测系统 FFmpeg
- 支持从 npm 包自动安装 FFmpeg
- FFmpeg 验证和路径管理
- 友好的安装提示和错误处理

#### 代码优化
- 移除 SiliconFlowProvider（不再维护）
- 更新文档结构，统一 API-KEY 指南命名
- 优化项目配置和类型定义

### 📊 技术细节

- 新增文件：`src/commands/composeVideo.ts`（约 225 行）
- 新增文件：`src/utils/ffmpeg.ts`（约 230 行）
- 使用 FFmpeg concat demuxer 进行视频合并（保持原始质量）
- 支持跨平台路径处理（Windows/Linux/macOS）

### 🎯 使用场景

视频合成功能特别适用于：
- 将所有分镜视频片段合成为最终成片
- 快速预览完整视频效果
- 导出最终视频文件

---

## [Unreleased]

### 计划功能

#### AI 智能剪辑 ⭐ 新计划
- **功能概述**：基于 AI 分析自动优化视频初稿，智能剪辑成片
- **核心能力**：
  - 基于分镜脚本的智能优化：利用分镜的 `description`、`videoPrompt`、`duration` 等信息，AI 分析每个片段的情绪、节奏、动作强度
  - 视频内容智能分析：使用视觉 AI 模型分析视频帧，识别动作强度、画面质量、精彩时刻，自动裁剪低质量或冗余片段
  - 智能转场效果：分析相邻分镜内容，自动选择转场类型（淡入淡出/交叉溶解/滑动/擦除等）
  - 节奏优化：分析整体节奏曲线，自动调整片段顺序、时长和转场时机
  - 智能裁剪与拼接：自动检测并裁剪视频开头/结尾的静帧或黑屏、重复或相似片段
  - 基于提示词的智能剪辑：AI 理解内容意图，自动识别关键动作点，保留符合描述的核心画面
- **技术实现**：
  - 新增命令：`Vibe Video: Smart Edit Video`（智能剪辑）
  - 工作流程：读取分镜脚本和视频片段 → AI 分析内容（使用现有 Provider 系统） → 生成剪辑方案（JSON 格式） → 使用 FFmpeg 执行剪辑 → 输出优化后的视频
  - 可配置选项：剪辑风格（快节奏/慢节奏/平衡）、转场偏好（自动/淡入淡出/无转场）、保留时长比例（100%/90%/80%）
- **优势**：
  - 充分利用现有架构：分镜脚本系统、FFmpeg 工具、Provider 系统
  - 无需额外依赖：可复用现有 AI Provider
  - 高度可扩展：后续可加入音频同步、字幕生成等功能

#### 视频合成
- 实现 `Vibe Video: Compose Video` 命令
- 使用 FFmpeg 将所有视频片段合成为一个长视频
- 支持按分镜顺序自动拼接