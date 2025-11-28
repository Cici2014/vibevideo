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

## [0.0.7] - 2025-01-22

### ✅ 新增功能

#### 图像编辑 ⭐
- 实现 `Vibe Video: Edit Image` 命令
- 支持在资源树中右键点击图片进行编辑
- 使用通义万相 `qwen-image-edit-plus` 模型进行图像编辑
- 支持编辑主体图片、场景图片、首帧图片和参考图片
- 通过文本描述修改图片（例如：改变背景、添加元素等）
- 自动保存编辑后的图片（添加 `-edited` 后缀）
- 智能文件命名，避免文件名冲突
- 编辑完成后自动打开新图片并刷新资源树

#### 用户体验改进
- 图像编辑功能集成到右键菜单
- 友好的编辑提示和进度显示
- 完整的错误处理和用户反馈

### 📊 技术细节

- 新增文件：`src/commands/editImage.ts`（约 163 行）
- 更新文件：`src/providers/BailianAPIClient.ts`（添加 `editImage` 方法）
- 使用 Base64 编码传输图片
- 支持图片类型：首帧图片、主体图片、场景图片、参考图片

### 🎯 使用场景

图像编辑功能特别适用于：
- 快速修改已生成的图片（调整背景、添加元素等）
- 优化主体图片、场景图片或首帧图片
- 在生成视频前对图片进行微调

### ⚠️ 限制说明

- 图像编辑功能目前仅支持通义万相 Provider
- 需要配置有效的 DashScope API Key

---

## [0.0.8] - 2025-11-23

### ✅ 新增功能

#### 视频帧提取 ⭐
- 实现 `Vibe Video: Extract Last Frame To Next` 命令
- 从视频片段提取最后一帧作为下一分镜的首帧
- 支持在资源树中右键点击视频片段执行提取
- 自动处理已有首帧文件（重命名为备选文件）
- 使用 FFmpeg 提取视频最后一帧
- 智能查找下一分镜并自动设置首帧路径
- 完整的错误处理和用户提示

#### 用户体验改进
- 视频片段右键菜单新增"提取最后一帧为下一分镜首帧"选项
- 提取完成后自动刷新资源树视图
- 友好的进度显示和结果提示

### 📊 技术细节

- 新增文件：`src/commands/extractLastFrame.ts`（约 195 行）
- 复用 FFmpegManager 工具类进行视频处理
- 支持跨平台路径处理（Windows/Linux/macOS）

### 🎯 使用场景

视频帧提取功能特别适用于：
- 确保相邻分镜之间的视觉连贯性
- 快速从已生成的视频片段中提取关键帧
- 自动生成下一分镜的首帧，无需手动截图

---

## [0.0.9] - 2025-01-23

### ✅ 新增功能

#### OpenAI Sora Provider 完整支持 ⭐
- 完整实现 OpenAI Sora Provider 集成
- 支持文生图（使用 `gpt-image-1` 或 `dall-e-3` 模型）
- 支持图片编辑（使用 `gpt-image-1` 模型，支持多图合成）
- 支持图生视频（使用 `sora-2` 模型）
- 支持文生视频（使用 `sora-2` 模型）
- 支持视频状态查询和资源下载
- 支持自定义 API 基础 URL（可用于本地部署）
- 完整的配置项支持（API Key、模型选择、自定义 URL）
- ⚠️ **注意**：此功能已实现但尚未进行实际 API 测试

### 📊 技术细节

- 更新文件：`src/providers/SoraProvider.ts`（完整实现，约 731 行）
- 更新文件：`src/providers/types.ts`（添加 SoraConfig 类型定义）
- 更新文件：`src/providers/ProviderManager.ts`（集成 Sora Provider）
- 更新文件：`package.json`（添加 Sora 相关配置项）

### 🎯 使用场景

Sora Provider 特别适用于：
- 需要高质量视频生成的用户
- 需要使用 OpenAI Sora 模型的用户
- 需要本地部署 Sora 模型的用户

---

## [0.0.10] - 2025-01-24

### ✅ 新增功能

#### 视频长宽比配置 ⭐
- 新增 `vibevideo.video.aspectRatio` 配置项
- 支持 5 种长宽比：16:9（横屏）、4:3（横屏）、1:1（正方形）、3:4（竖屏）、9:16（竖屏）
- 长宽比与分辨率配置结合使用，自动选择最合适的视频尺寸
- 在 `ConfigManager` 中添加 `getAspectRatio()` 方法
- 更新所有视频生成命令，传递长宽比参数

#### Sora Provider 增强 ⭐
- **多图合成接口**：为 SoraProvider 添加 `composeMultipleImages` 方法
  - 创建 `SoraProviderClient` 类，提供多图合成功能
  - 使用 Sora 的 `editImage` API 实现多图合成
  - 支持主体+场景合成、主体合成、场景合成等场景
- **图片尺寸映射优化**：改进图片尺寸映射算法
  - 根据配置的图片尺寸（如 `1280*720`）智能映射到 Sora 支持的三个固定尺寸
  - 使用长宽比差异计算，选择最接近的尺寸
  - 添加详细的映射日志，便于调试
- **视频尺寸选择优化**：根据分辨率和长宽比自动选择最合适的视频尺寸
  - `1080P + 16:9` → `1792x1024`（横屏高分辨率）
  - `1080P + 9:16` → `1024x1792`（竖屏高分辨率）
  - `720P + 16:9` → `1280x720`（横屏标准分辨率）
  - `720P + 9:16` → `720x1280`（竖屏标准分辨率）

#### 本地文件路径支持
- 更新所有图片生成命令，支持处理本地文件路径返回值
- `generateFirstFrames.ts`：支持 URL、本地文件路径和 taskId
- `generateVideos.ts`：添加 `handleComposeResult` 辅助函数，统一处理返回值
- `generateSubjects.ts`：支持本地文件路径
- `generateScenes.ts`：支持本地文件路径
- 当 API 返回本地文件路径时，自动复制文件而不是下载

### 🐛 问题修复

#### Sora Provider 图片尺寸问题
- 修复 SoraProvider 图片尺寸映射不准确的问题
- 优化映射算法，确保 `1280*720`（16:9）正确映射到 `1792x1024`（16:9 横屏）
- 添加映射日志，便于排查问题

#### 视频竖屏问题
- 修复使用 Sora Provider 时，即使设置了 `1280*720` 也会生成竖屏视频的问题
- 通过添加长宽比配置，确保视频方向正确
- 修复默认值问题：当解析失败时不再回退到竖屏默认值

### 📊 技术细节

- 更新文件：`src/providers/SoraProvider.ts`（添加 SoraProviderClient 和多图合成支持）
- 更新文件：`src/providers/types.ts`（添加 `aspectRatio` 字段到 VideoOptions）
- 更新文件：`src/core/ConfigManager.ts`（添加 `getAspectRatio()` 方法）
- 更新文件：`src/commands/generateVideos.ts`（传递长宽比参数，支持本地文件路径）
- 更新文件：`src/commands/generateVideoFromFirstLastFrame.ts`（传递长宽比参数）
- 更新文件：`src/commands/generateFirstFrames.ts`（支持本地文件路径）
- 更新文件：`src/commands/generateSubjects.ts`（支持本地文件路径）
- 更新文件：`src/commands/generateScenes.ts`（支持本地文件路径）
- 更新文件：`package.json`（添加 `vibevideo.video.aspectRatio` 配置项）
- 更新文件：`DOC/tutorial.md` 和 `DOC/tutorial_EN.md`（添加配置说明和常见问题）

### 🎯 使用场景

视频长宽比配置特别适用于：
- 需要生成横屏视频（16:9）的场景
- 需要生成竖屏视频（9:16）的场景
- 需要精确控制视频方向的场景

Sora Provider 多图合成功能特别适用于：
- 使用主体和场景图片合成首帧
- 使用多个主体图片合成场景
- 需要多图融合的场景

### ⚠️ 注意事项

- Sora 的图片生成 API 只支持三个固定尺寸（`1024x1024`、`1792x1024`、`1024x1792`）
- 系统会根据配置的图片尺寸自动映射到最接近的 Sora 支持尺寸
- 如果使用的 API 服务不支持某些尺寸，可能会返回不同的尺寸（这是 API 服务端的限制）

---

## [0.0.12] - 2025-11-28

### ✅ 增强

#### 场景生成背景限定 ⭐
- `Generate All Scenes` 命令的系统提示新增 **纯背景/环境** 约束
- 当场景引用参考图时，自动要求忽略人物、主体、产品等元素
- 降低因参考图带入人物而导致的场景污染，保证背景素材可与主体库搭配复用

#### 参考图驱动工作流
- `templates/AI-rules.md` 新增“从参考图片开始创建项目”章节
- 定义 AI 助手如何指导用户保存粘贴图片、引用 `Vibe Video: 添加参考图` 命令
- 规范主体/场景 Markdown 的 `- **参考图**:` 字段写法，保证生成流程自动切换到 `composeMultipleImages`

### 📚 文档
- `DOC/tutorial.md` 增补“参考图工作流”操作指南与 FAQ
- 教程新增通过侧边栏/命令面板/拖拽添加参考图的步骤
- 场景章节补充“只保留环境、忽略人物”的写作提示

---

## [0.0.11] - 2025-01-24

### ✅ 新增功能

#### 备选资源管理系统 ⭐
- **备选资源识别**：新增备选资源文件命名规则识别
  - 支持识别 `.o-1`, `.o-2` 等备选文件后缀（如：`image.o-1.jpg`）
  - 支持识别 `-edited` 编辑后的文件（如：`image-edited.jpg`）
  - 支持识别 `- 副本` 等副本文件（如：`image - 副本.jpg`）
  - 新增 `resourceNaming.ts` 工具模块，统一管理资源命名规则
- **备选资源视觉装饰**：新增 `AlternativeResourceDecorationProvider`
  - 在资源树中为备选资源添加视觉装饰（灰色显示）
  - 鼠标悬停显示"备选文件"提示
  - 清晰区分选中状态和备选状态的资源

#### 资源选中/不选中功能 ⭐
- **图片资源管理**：
  - 新增 `Vibe Video: Select Image` 命令（选中图片）
  - 新增 `Vibe Video: Deselect Image` 命令（不选中图片）
  - 支持对首帧图片、主体图片、场景图片、参考图片进行操作
  - 智能文件重命名：不选中时自动添加 `.o-n` 后缀，选中时自动移除后缀
  - 自动提升备选文件：不选中当前文件时，自动将最小编号的备选文件提升为选中状态
- **视频资源管理**：
  - 新增 `Vibe Video: Select Video` 命令（选中视频）
  - 新增 `Vibe Video: Deselect Video` 命令（不选中视频）
  - 支持对视频片段和输出视频进行操作
  - 与图片资源管理相同的智能重命名机制

#### 用户体验改进
- 资源树视图区分显示选中和备选状态的资源
- 右键菜单根据资源状态显示不同的操作选项
- 备选资源在资源树中显示为灰色，提供清晰的视觉反馈
- 智能文件管理：自动处理文件重命名，避免手动操作
- 友好的操作提示和进度反馈

### 📊 技术细节

- 新增文件：`src/ui/AlternativeResourceDecorationProvider.ts`（备选资源装饰提供者）
- 新增文件：`src/utils/resourceNaming.ts`（资源命名工具模块）
- 更新文件：`src/ui/ResourceTreeProvider.ts`（区分选中/备选状态的资源显示）
- 更新文件：`src/extension.ts`（添加选中/不选中命令处理逻辑）
- 更新文件：`src/commands/extractLastFrame.ts`（提取最后一帧时自动处理备选文件）
- 更新文件：`package.json`（添加选中/不选中相关命令配置）

### 🎯 使用场景

备选资源管理功能特别适用于：
- **批量生成时的版本管理**：当生成多个图片或视频版本时，可以方便地管理哪个是当前使用的版本
- **A/B 测试**：快速切换不同的资源版本，对比效果
- **资源迭代**：在保留旧版本的同时，尝试新版本
- **协作工作流**：团队成员可以标记推荐版本和备选版本

### ⚠️ 注意事项

- 备选文件通过文件命名规则识别，请勿手动修改文件名规则
- 选中/不选中操作会重命名文件，建议先保存工作
- 备选文件不会被删除，需要手动清理不需要的版本

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