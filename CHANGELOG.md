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

## [Unreleased]

### ✅ Phase 2.1: 分组合成优化 (2025-11-14)

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

#### 2025-11-14 Hotfix
- 🚫 暂时禁用二次合成：超过 3 个主体时仅使用前 3 个
- 📣 UI 提示用户拆分分镜或减少主体数量

### ✅ Phase 2: 角色库功能 (2025-11-14)

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

### 计划功能
- 视频合成
- 右键菜单功能（单个生成）
- 更多 AI Provider 支持
- 并行生成（有限并发）