# Vibe Video

**像写代码一样制作视频**

Vibe Video 是一个 VS Code 扩展，让您能够像写代码一样制作视频：用 Markdown 写剧本，用 AI 生成分镜，批量生成视频，一键合成。

## ✨ 特性

### 🚀 轻量级工作流
- 用 Markdown 写剧本（任意格式）
- 用 Cursor AI 生成分镜脚本（Markdown）
- 标准化的项目结构，Git 友好

### 🤖 智能 AI 集成
- 自动生成 `.cursorrules`，让 AI 理解项目结构
- 支持图生视频（更高质量、更可控）
- 集成通义万相 API（国内服务，中文支持优秀）

### 📊 可视化管理
- 侧边栏展示项目资源
- 质量检查和友好建议
- 项目统计和进度追踪

### 🎬 完整流程
- 文生图：生成初始帧
- 图生视频：基于首帧生成高质量视频
- 视频合成：ffmpeg 合成最终视频

## 🚀 快速开始

### 1. 初始化项目
```
Ctrl+Shift+P → "Vibe Video: Initialize Project"
```

### 2. 编写剧本
编辑 `剧本.md`，写下您的视频脚本

### 3. 生成分镜
使用 Cursor AI Chat：
```
根据剧本.md 生成分镜脚本
```

AI 会自动生成 Markdown 格式的分镜文件到 `storyboards/` 目录

### 4. 配置 API（一次性）⭐

**方式 1**：使用命令
```
Ctrl+Shift+P → "Vibe Video: Configure Video AI"
→ 点击"打开设置"
```

**方式 2**：直接打开设置（推荐）
```
Ctrl+, → 搜索 "vibevideo"
→ 输入 Access Key ID 和 Secret
```

配置会自动保存到 VS Code 设置中

### 5. 生成视频（开发中）
```
Ctrl+Shift+P → "Vibe Video: Generate All Videos"
```

## 📁 项目结构

```
MyVideoProject/
├── 剧本.md                   # 您的剧本
├── storyboards/              # 分镜脚本（Markdown）
│   ├── 01-opening.md
│   └── ...
├── assets/
│   ├── subjects/             # 素材图片
│   ├── first-frames/         # AI 生成的首帧
│   ├── clips/                # 生成的视频
│   └── audio/                # 音频
└── output/
    └── final.mp4             # 最终视频
```

## 📋 要求

- VS Code 1.105.0 或更高版本
- Node.js 18+
- （可选）ffmpeg - 用于视频合成

## 🎯 命令列表

- `Vibe Video: Initialize Project` - 初始化项目结构
- `Vibe Video: Check Storyboards Quality` - 检查分镜质量
- `Vibe Video: Show Project Stats` - 显示项目统计
- `Vibe Video: Refresh Resources` - 刷新资源视图

## 🚧 开发状态

当前版本：**0.0.1 (Alpha)**

### ✅ 已实现
- 项目初始化
- Markdown 分镜解析
- 质量检查
- 侧边栏资源视图

### 🚧 开发中
- 通义万相 API 集成
- 文生图（初始帧）
- 图生视频
- 视频合成

## 📚 文档

详细文档请查看 `DOC/` 目录：
- [实施计划](DOC/plan.md) - 完整的开发计划
- [项目总结](DOC/SUMMARY.md) - 快速概览
- [分镜格式指南](DOC/storyboard-markdown-format.md) - 如何写分镜

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT

---

**享受用 Vibe Video 制作视频的乐趣！** 🎬
