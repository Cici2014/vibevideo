# VSCode 扩展一键安装工具

提供两种版本的安装脚本，满足不同用户的需求：

## 📦 两种版本

### 🌟 完整版（推荐初次使用 VS Code 的用户）

**自动安装 VS Code + 自动安装扩展**

- ✅ **自动检测 VS Code 是否已安装**
- ✅ **如果未安装，自动下载并安装 VS Code**（Windows/macOS/Linux 全支持）
- ✅ **自动添加到 PATH**（无需手动配置）
- ✅ **自动安装 VibeVideo 和 Qwen Code Companion 扩展**

**文件名**：
- Windows: `install-vscode-extensions-full.bat` / `install-vscode-extensions-full.ps1`
- macOS/Linux: `install-vscode-extensions-full.sh`

> ⚠️ **注意**：如果您同时安装了 Cursor 编辑器，完整版脚本可能会失败，请使用精简版。

### 🎯 精简版（推荐已安装 VS Code 的用户）

**只安装扩展，不安装 VS Code**

- ✅ **需要先手动安装 VS Code**
- ✅ **自动安装 VibeVideo 和 Qwen Code Companion 扩展**
- ✅ **更稳定，不会因编辑器冲突而失败**

**文件名**：
- Windows: `install-extensions-only.bat` / `install-extensions-only.ps1`
- macOS/Linux: `install-extensions-only.sh`

## 🚀 快速开始

### 选择哪个版本？

**使用完整版，如果：**
- ✅ 还没有安装 VS Code
- ✅ 想一键完成所有安装
- ✅ 不介意自动下载安装 VS Code

**使用精简版，如果：**
- ✅ 已经安装了 VS Code
- ✅ 同时安装了 Cursor 编辑器（完整版可能会失败）
- ✅ 想更快地只安装扩展
- ✅ 想自己控制 VS Code 的安装过程

### Windows 用户

#### 完整版（自动安装 VS Code + 扩展）

**方式一：批处理脚本（推荐新手）**
1. **双击运行** `install-vscode-extensions-full.bat`
2. 等待脚本自动下载安装 VS Code（如果未安装）
3. 等待脚本自动安装扩展
4. 完成后重启 VS Code

**方式二：PowerShell 脚本（推荐）**
1. **右键点击** `install-vscode-extensions-full.ps1`
2. 选择"使用 PowerShell 运行"
3. 等待脚本自动完成所有安装
4. 完成后重启 VS Code

#### 精简版（只安装扩展）

**方式一：批处理脚本**
1. **双击运行** `install-extensions-only.bat`
2. 等待脚本自动安装扩展
3. 完成后重启 VS Code

**方式二：PowerShell 脚本**
1. **右键点击** `install-extensions-only.ps1`
2. 选择"使用 PowerShell 运行"
3. 等待脚本安装扩展
4. 完成后重启 VS Code

**提示**：建议以管理员身份运行脚本（右键 → 以管理员身份运行）

### macOS / Linux 用户

#### 完整版（自动安装 VS Code + 扩展）

1. **打开终端**，进入 `install` 文件夹
2. **添加执行权限**：
   ```bash
   chmod +x install-vscode-extensions-full.sh
   ```
3. **运行脚本**：
   ```bash
   ./install-vscode-extensions-full.sh
   ```
4. 等待脚本自动下载安装 VS Code（如果未安装）
5. 等待脚本自动安装扩展
6. 完成后重启 VS Code

#### 精简版（只安装扩展）

1. **打开终端**，进入 `install` 文件夹
2. **添加执行权限**：
   ```bash
   chmod +x install-extensions-only.sh
   ```
3. **运行脚本**：
   ```bash
   ./install-extensions-only.sh
   ```
4. 等待脚本自动安装扩展
5. 完成后重启 VS Code

**提示**：可能需要输入管理员密码来安装 VS Code（仅完整版）

## 📋 安装的扩展

1. **VibeVideo** (`fastpen.vibevideo`)
   - 像写代码一样创建视频
   - 使用 Markdown 编写脚本，AI 自动生成视频

2. **Qwen Code Companion** (`Qwen.qwen-code-companion`)
   - 阿里云通义千问 AI 编程助手
   - 提供智能代码补全和 AI 对话

## ⚠️ 前置要求

### 完整版前置要求

- ✅ **网络连接正常**：脚本需要下载 VS Code（约 150-200MB）和扩展
- ✅ **Windows 用户**：建议以管理员身份运行（可选但推荐）
- ✅ **macOS/Linux 用户**：可能需要输入管理员密码

**注意**：
- 如果 VS Code 已安装，脚本会跳过下载，直接安装扩展
- 脚本会自动处理 PATH 配置，无需手动操作
- ⚠️ **如果同时安装了 Cursor 编辑器，完整版可能会失败，请使用精简版**

### 精简版前置要求

- ✅ **已安装 VS Code**：需要先手动安装 VS Code
- ✅ **VS Code 已添加到 PATH**：确保可以在终端使用 `code` 命令
- ✅ **网络连接正常**：脚本需要从扩展市场下载扩展

**如果未安装 VS Code**：
- 请先访问 https://code.visualstudio.com/ 下载安装 VS Code
- 安装时务必勾选"添加到 PATH"选项
- 或者使用完整版脚本自动安装

## 🖥️ 支持的操作系统

- ✅ Windows (Windows 10/11)
- ✅ macOS (macOS 10.14+)
- ✅ Linux (Ubuntu, Debian, Fedora, 等主流发行版)

## 📚 更多信息

- 详细使用说明请查看：**一键安装说明.md**
- 快速开始指南请查看：**一键安装指南.md**

## 📋 包含的文件

### 完整版脚本（自动安装 VS Code + 扩展）
- Windows: `install-vscode-extensions-full.bat`, `install-vscode-extensions-full.ps1`
- macOS/Linux: `install-vscode-extensions-full.sh`

### 精简版脚本（只安装扩展）
- Windows: `install-extensions-only.bat`, `install-extensions-only.ps1`
- macOS/Linux: `install-extensions-only.sh`

### 文档
- **README.md** - 本文件，说明两种版本的区别
- **一键安装指南.md** - 快速开始指南
- **一键安装说明.md** - 详细使用说明和故障排除

---

**提示**: 如果遇到问题，请查看"一键安装说明.md"中的常见问题解答部分。

