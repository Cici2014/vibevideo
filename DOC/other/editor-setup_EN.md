# Editor Setup Guide

This guide will help you install and configure the editor environment required for Vibe Video.

> **Note**: Vibe Video is a VS Code extension that can be used in Visual Studio Code or Cursor.

---

## 📋 Table of Contents

1. [VSCode User Guide](#vscode-user-guide)
2. [Cursor User Guide](#cursor-user-guide)

---

## VSCode User Guide

### Step 1: Download and Install Visual Studio Code

#### 1.1 Download VSCode

1. Visit the [VSCode website](https://code.visualstudio.com/)
2. Click **Download for Windows** (or select the version for your system)
3. After downloading, run the installer

#### 1.2 Install VSCode

1. Run the downloaded installer (e.g., `VSCodeUserSetup-x64-xxx.exe`)
2. Follow the installation wizard prompts:
   - Select installation location (default is fine)
   - Check **Add to PATH** (recommended)
   - Check **Create desktop shortcut** (recommended)
3. Click **Install** and wait for installation to complete
4. After installation, click **Finish**, and VSCode will start automatically

#### 1.3 Verify Installation

1. Open VSCode
2. Press `Ctrl+Shift+P` to open the command palette
3. Type `About`, if you can see version information, the installation is successful

### Step 2: Install Vibe Video Extension

#### Method 1: Install from Extension Marketplace (Recommended)

1. Open VSCode
2. Press `Ctrl+Shift+X` to open the extension marketplace (or click the extension icon in the left activity bar)
3. Search for `Vibe Video` or `vibevideo` in the search box
4. Find the **VibeVideo** extension (Publisher: fastpen)
5. Click the **Install** button
6. Wait for installation to complete

#### Method 2: Install from VSIX File

1. Download the `.vsix` file of the extension
2. In VSCode, press `Ctrl+Shift+P` to open the command palette
3. Type `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file
5. Wait for installation to complete

#### Verify Extension Installation

1. After installation, you should see the **Vibe Video** icon (🎬) in the left activity bar
2. If you don't see it, try:
   - Reload the window: `Ctrl+Shift+P` → `Developer: Reload Window`
   - Check if the extension is enabled (confirm in the extension panel)

### Step 3: Install AI Assistant (Claude or Copilot)

Vibe Video requires an AI assistant to generate project structure. You can choose any of the following tools:

#### Option A: Install GitHub Copilot (Recommended)

**3.1 Get GitHub Copilot Subscription**

1. Visit the [GitHub Copilot website](https://github.com/features/copilot)
2. Click **Start free trial** or **Subscribe**
3. Log in with your GitHub account
4. Choose a subscription plan (Individual or Business)
5. Complete payment (if there's a free trial, you can try it first)

**3.2 Install Copilot Extension in VSCode**

1. Open VSCode
2. Press `Ctrl+Shift+X` to open the extension marketplace
3. Search for `GitHub Copilot`
4. Find the **GitHub Copilot** extension (Publisher: GitHub)
5. Click **Install**
6. After installation, VSCode will prompt you to log in with your GitHub account
7. Follow the prompts to complete authorization

**3.3 Verify Copilot Installation**

1. Open any code file
2. Start typing code. If you see gray suggestions (Copilot suggestions), the installation is successful
3. Press `Ctrl+Enter` to view Copilot's full suggestions

#### Option B: Install Claude Code (Claude for VS Code)

**3.1 Get Anthropic API Key**

1. Visit the [Anthropic website](https://www.anthropic.com/)
2. Register/Log in to your account
3. Visit the [API Keys page](https://console.anthropic.com/settings/keys)
4. Create a new API Key
5. Copy the API Key (format: `sk-ant-xxxxx`)

**3.2 Install Claude Code Extension in VSCode**

1. Open VSCode
2. Press `Ctrl+Shift+X` to open the extension marketplace
3. Search for `Claude Code` or `Claude`
4. Find the **Claude Code** extension (Publisher: Anthropic)
5. Click **Install**
6. After installation, press `Ctrl+Shift+P` to open the command palette
7. Type `Claude: Set API Key`
8. Paste your API Key

**3.3 Verify Claude Code Installation**

1. Press `Ctrl+Shift+P` to open the command palette
2. Type `Claude: Open Chat`
3. If you can open the Claude chat window, the installation is successful

#### Option C: Install Cline (Alternative to Claude)

**3.1 Get Anthropic API Key**

Same as Option B step 3.1

**3.2 Install Cline Extension in VSCode**

1. Open VSCode
2. Press `Ctrl+Shift+X` to open the extension marketplace
3. Search for `Cline`
4. Find the **Cline** extension
5. Click **Install**
6. After installation, configure the API Key (search for `cline` in settings)

**3.3 Verify Cline Installation**

1. Press `Ctrl+Shift+P` to open the command palette
2. Type `Cline: Open Chat`
3. If you can open the chat window, the installation is successful

#### Recommended Choice

- **GitHub Copilot**: Suitable for users who already have a GitHub account, high integration
- **Claude Code**: Suitable for users who need more powerful AI capabilities
- **Cline**: Lightweight alternative to Claude

### Step 4: Verify Environment Setup

After completing the above steps, verify that your environment is ready:

1. ✅ VSCode is installed and working properly
2. ✅ Vibe Video extension is installed (you can see the 🎬 icon in the left activity bar)
3. ✅ AI assistant is installed (Copilot, Claude Code, or Cline)

If all of the above are completed, you can continue reading the Vibe Video main tutorial.

---

## Cursor User Guide

### Step 1: Download and Install Cursor

#### 1.1 Download Cursor

1. Visit the [Cursor website](https://cursor.sh/)
2. Click the **Download** button
3. Select your operating system (Windows / macOS / Linux)
4. After downloading, run the installer

#### 1.2 Install Cursor

**Windows System:**

1. Run the downloaded installer (e.g., `Cursor-Setup-x.x.x.exe`)
2. Follow the installation wizard prompts:
   - Select installation location (default is fine)
   - Check **Add to PATH** (recommended)
   - Check **Create desktop shortcut** (recommended)
3. Click **Install** and wait for installation to complete
4. After installation, click **Finish**, and Cursor will start automatically

**macOS System:**

1. Open the downloaded `.dmg` file
2. Drag Cursor to the Applications folder
3. Open the Applications folder and double-click Cursor to launch
4. If prompted "Cannot open", please:
   - Right-click Cursor
   - Select **Open**
   - Click **Open** in the pop-up window

**Linux System:**

1. Extract the downloaded file
2. Run the installation script or follow the official documentation

#### 1.3 Verify Installation

1. Open Cursor
2. If you can see the Cursor interface, the installation is successful
3. First launch may require login or registration

### Step 2: Install Vibe Video Extension

#### Method 1: Install from Extension Marketplace (Recommended)

1. Open Cursor
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS) to open the extension marketplace
3. Search for `Vibe Video` or `vibevideo` in the search box
4. Find the **VibeVideo** extension (Publisher: fastpen)
5. Click the **Install** button
6. Wait for installation to complete

#### Method 2: Install from VSIX File

1. Download the `.vsix` file of the extension
2. In Cursor, press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the command palette
3. Type `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file
5. Wait for installation to complete

#### Verify Extension Installation

1. After installation, you should see the **Vibe Video** icon (🎬) in the left activity bar
2. If you don't see it, try:
   - Reload the window: `Ctrl+Shift+P` → `Developer: Reload Window`
   - Check if the extension is enabled (confirm in the extension panel)

### Step 3: Configure Cursor AI (Built-in)

Cursor has powerful built-in AI features and does not require additional AI assistant installation.

#### 3.1 Log in to Cursor Account

1. Open Cursor
2. If prompted to log in, follow the prompts to log in or register
3. Cursor offers free and paid versions, choose according to your needs

#### 3.2 Verify AI Features

1. Open any file
2. Press `Ctrl+L` (Windows/Linux) or `Cmd+L` (macOS) to open Cursor AI Chat
3. If you can open the chat window, AI features are enabled

#### 3.3 Learn About Cursor AI Features

- **Cursor Chat**: Press `Ctrl+L` to open AI chat window
- **Composer**: Press `Ctrl+I` to open code composition mode
- **Inline Edit**: Select code and press `Ctrl+K` for inline editing

### Step 4: Verify Environment Setup

After completing the above steps, verify that your environment is ready:

1. ✅ Cursor is installed and working properly
2. ✅ Vibe Video extension is installed (you can see the 🎬 icon in the left activity bar)
3. ✅ Cursor AI features are enabled (can open AI Chat)

If all of the above are completed, you can continue reading the Vibe Video main tutorial.

---

## Need Help?

If you encounter problems during installation, please refer to:

- 📚 [Vibe Video Main Tutorial](../tutorial_EN.md)
- 📧 Email: cici_yiyi@qq.com
- 💬 WeChat: Scan QR code (see README)

