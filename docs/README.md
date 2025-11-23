# Vibe Video GitHub Pages

这是 Vibe Video 项目的 GitHub Pages 介绍页面。

## 部署说明

### 方法 1：使用 GitHub Pages（推荐）

1. 将 `github_io` 目录中的文件推送到 GitHub 仓库
2. 在 GitHub 仓库设置中：
   - 进入 Settings → Pages
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `master` 或 `main`
   - Folder 选择 `/github_io`
   - 点击 Save

3. 访问地址：`https://[你的用户名].github.io/vibevideo/`

### 方法 2：使用 gh-pages 分支

1. 创建 `gh-pages` 分支
2. 将 `github_io` 目录中的文件复制到仓库根目录
3. 推送到 `gh-pages` 分支
4. GitHub 会自动部署

### 方法 3：本地预览

直接在浏览器中打开 `index.html` 文件即可预览。

## 文件说明

- `index.html` - 主页面文件，包含完整的项目介绍
- `README.md` - 本说明文件

## 自定义

如果需要修改页面内容，直接编辑 `index.html` 文件即可。页面使用纯 HTML/CSS/JavaScript，无需构建工具。

