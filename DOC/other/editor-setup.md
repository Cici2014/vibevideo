# 编辑器安装指南

本指南将帮助您安装和配置 Vibe Video 所需的编辑器环境。

> **注意**：Vibe Video 是一个 VS Code 扩展，可以在 Visual Studio Code 或 Cursor 中使用。

---

## 📋 目录

1. [VSCode 用户指南](#vscode-用户指南)
2. [Cursor 用户指南](#cursor-用户指南)

---

## VSCode 用户指南

### 步骤 1：下载并安装 Visual Studio Code

#### 1.1 下载 VSCode

1. 访问 [VSCode 官网](https://code.visualstudio.com/)
2. 点击 **Download for Windows**（或根据您的系统选择对应版本）
3. 下载完成后，运行安装程序

#### 1.2 安装 VSCode

1. 运行下载的安装程序（例如：`VSCodeUserSetup-x64-xxx.exe`）
2. 按照安装向导提示操作：
   - 选择安装位置（默认即可）
   - 勾选 **添加到 PATH**（推荐）
   - 勾选 **创建桌面快捷方式**（推荐）
3. 点击 **安装**，等待安装完成
4. 安装完成后，点击 **完成**，VSCode 会自动启动

#### 1.3 验证安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `About`，如果能看到版本信息，说明安装成功

### 步骤 2：安装 Vibe Video 插件

#### 方法 1：从扩展市场安装（推荐）

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展市场（或点击左侧活动栏的扩展图标）
3. 在搜索框中输入 `Vibe Video` 或 `vibevideo`
4. 找到 **VibeVideo** 扩展（发布者：fastpen）
5. 点击 **安装** 按钮
6. 等待安装完成

#### 方法 2：从 VSIX 文件安装

1. 下载扩展的 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件
5. 等待安装完成

#### 验证插件安装

1. 安装完成后，在左侧活动栏应该能看到 **Vibe Video** 图标（🎬）
2. 如果看不到，尝试：
   - 重新加载窗口：`Ctrl+Shift+P` → `Developer: Reload Window`
   - 检查扩展是否已启用（在扩展面板中确认）

### 步骤 3：安装 AI 助手（Claude 或 Copilot）

Vibe Video 需要 AI 助手来生成项目结构。您可以选择以下任一工具：

#### 选项 A：安装 GitHub Copilot（推荐）

**3.1 获取 GitHub Copilot 订阅**

1. 访问 [GitHub Copilot 官网](https://github.com/features/copilot)
2. 点击 **Start free trial** 或 **Subscribe**
3. 登录 GitHub 账号
4. 选择订阅计划（个人版或商业版）
5. 完成支付（如果有免费试用，可以先试用）

**3.2 在 VSCode 中安装 Copilot 扩展**

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展市场
3. 搜索 `GitHub Copilot`
4. 找到 **GitHub Copilot** 扩展（发布者：GitHub）
5. 点击 **安装**
6. 安装完成后，VSCode 会提示您登录 GitHub 账号
7. 按照提示完成授权

**3.3 验证 Copilot 安装**

1. 打开任意代码文件
2. 开始输入代码，如果看到灰色提示（Copilot 建议），说明安装成功
3. 按 `Ctrl+Enter` 可以查看 Copilot 的完整建议

#### 选项 B：安装 Claude Code（Claude for VS Code）

**3.1 获取 Anthropic API Key**

1. 访问 [Anthropic 官网](https://www.anthropic.com/)
2. 注册/登录账号
3. 访问 [API Keys 页面](https://console.anthropic.com/settings/keys)
4. 创建新的 API Key
5. 复制 API Key（格式：`sk-ant-xxxxx`）

**3.2 在 VSCode 中安装 Claude Code 扩展**

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展市场
3. 搜索 `Claude Code` 或 `Claude`
4. 找到 **Claude Code** 扩展（发布者：Anthropic）
5. 点击 **安装**
6. 安装完成后，按 `Ctrl+Shift+P` 打开命令面板
7. 输入 `Claude: Set API Key`
8. 粘贴您的 API Key

**3.3 验证 Claude Code 安装**

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Claude: Open Chat`
3. 如果能打开 Claude 聊天窗口，说明安装成功

#### 选项 C：安装 Cline（Claude 的替代方案）

**3.1 获取 Anthropic API Key**

同选项 B 的步骤 3.1

**3.2 在 VSCode 中安装 Cline 扩展**

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展市场
3. 搜索 `Cline`
4. 找到 **Cline** 扩展
5. 点击 **安装**
6. 安装完成后，配置 API Key（在设置中搜索 `cline`）

**3.3 验证 Cline 安装**

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Cline: Open Chat`
3. 如果能打开聊天窗口，说明安装成功

#### 推荐选择

- **GitHub Copilot**：适合已有 GitHub 账号的用户，集成度高
- **Claude Code**：适合需要更强大 AI 能力的用户
- **Cline**：Claude 的轻量级替代方案

### 步骤 4：验证环境准备

完成以上步骤后，验证环境是否准备就绪：

1. ✅ VSCode 已安装并可以正常使用
2. ✅ Vibe Video 插件已安装（左侧活动栏能看到 🎬 图标）
3. ✅ AI 助手已安装（Copilot、Claude Code 或 Cline 任一即可）

如果以上都已完成，您可以继续阅读 Vibe Video 的主教程。

---

## Cursor 用户指南

### 步骤 1：下载并安装 Cursor

#### 1.1 下载 Cursor

1. 访问 [Cursor 官网](https://cursor.sh/)
2. 点击 **Download** 按钮
3. 选择您的操作系统（Windows / macOS / Linux）
4. 下载完成后，运行安装程序

#### 1.2 安装 Cursor

**Windows 系统：**

1. 运行下载的安装程序（例如：`Cursor-Setup-x.x.x.exe`）
2. 按照安装向导提示操作：
   - 选择安装位置（默认即可）
   - 勾选 **添加到 PATH**（推荐）
   - 勾选 **创建桌面快捷方式**（推荐）
3. 点击 **安装**，等待安装完成
4. 安装完成后，点击 **完成**，Cursor 会自动启动

**macOS 系统：**

1. 打开下载的 `.dmg` 文件
2. 将 Cursor 拖拽到 Applications 文件夹
3. 打开 Applications 文件夹，双击 Cursor 启动
4. 如果提示"无法打开"，请：
   - 右键点击 Cursor
   - 选择 **打开**
   - 在弹出窗口中点击 **打开**

**Linux 系统：**

1. 解压下载的文件
2. 运行安装脚本或按照官方文档安装

#### 1.3 验证安装

1. 打开 Cursor
2. 如果能看到 Cursor 的界面，说明安装成功
3. 首次启动可能需要登录或注册账号

### 步骤 2：安装 Vibe Video 插件

#### 方法 1：从扩展市场安装（推荐）

1. 打开 Cursor
2. 按 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（macOS）打开扩展市场
3. 在搜索框中输入 `Vibe Video` 或 `vibevideo`
4. 找到 **VibeVideo** 扩展（发布者：fastpen）
5. 点击 **安装** 按钮
6. 等待安装完成

#### 方法 2：从 VSIX 文件安装

1. 下载扩展的 `.vsix` 文件
2. 在 Cursor 中按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件
5. 等待安装完成

#### 验证插件安装

1. 安装完成后，在左侧活动栏应该能看到 **Vibe Video** 图标（🎬）
2. 如果看不到，尝试：
   - 重新加载窗口：`Ctrl+Shift+P` → `Developer: Reload Window`
   - 检查扩展是否已启用（在扩展面板中确认）

### 步骤 3：配置 Cursor AI（内置）

Cursor 内置了强大的 AI 功能，无需额外安装 AI 助手。

#### 3.1 登录 Cursor 账号

1. 打开 Cursor
2. 如果提示登录，按照提示登录或注册账号
3. Cursor 提供免费和付费版本，根据需求选择

#### 3.2 验证 AI 功能

1. 打开任意文件
2. 按 `Ctrl+L`（Windows/Linux）或 `Cmd+L`（macOS）打开 Cursor AI Chat
3. 如果能打开聊天窗口，说明 AI 功能已启用

#### 3.3 了解 Cursor AI 功能

- **Cursor Chat**：按 `Ctrl+L` 打开 AI 聊天窗口
- **Composer**：按 `Ctrl+I` 打开代码编写模式
- **Inline Edit**：选中代码后按 `Ctrl+K` 进行内联编辑

### 步骤 4：验证环境准备

完成以上步骤后，验证环境是否准备就绪：

1. ✅ Cursor 已安装并可以正常使用
2. ✅ Vibe Video 插件已安装（左侧活动栏能看到 🎬 图标）
3. ✅ Cursor AI 功能已启用（可以打开 AI Chat）

如果以上都已完成，您可以继续阅读 Vibe Video 的主教程。

---

## 需要帮助？

如果您在安装过程中遇到问题，请参考：

- 📚 [Vibe Video 主教程](../tutorial.md)
- 📧 邮箱：cici_yiyi@qq.com
- 💬 微信：扫码添加（见 README）

