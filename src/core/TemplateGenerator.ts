/**
 * 模板生成器 - 生成项目配置文件和 AI 上下文
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { VVProjectConfig } from '../types';
import { readFile, fileExists } from '../utils/fileSystem';

/**
 * 获取模板文件路径
 */
function getTemplatePath(templateName: string): string | undefined {
  // 首先尝试通过扩展上下文获取路径（如果可用）
  // 在扩展激活时，可以通过 context.extensionPath 获取
  
  // 尝试多个可能的扩展 ID
  const extensionIds = ['vibevideo.vibevideo', 'vibevideo'];
  let extension: vscode.Extension<any> | undefined;
  
  for (const id of extensionIds) {
    extension = vscode.extensions.getExtension(id);
    if (extension) {
      break;
    }
  }
  
  if (extension) {
    return path.join(extension.extensionPath, 'templates', templateName);
  }
  
  // 开发环境：从编译后的 dist/core 或 src/core 目录向上找到项目根目录
  // __dirname 在编译后会是 dist/core，在开发时可能是 src/core
  try {
    const currentDir = __dirname;
    // 尝试从 dist/core 或 src/core 向上找到项目根目录
    let projectRoot = currentDir;
    
    // 如果当前在 dist/core 或 src/core，向上两级到项目根
    if (currentDir.includes('dist') || currentDir.includes('src')) {
      projectRoot = path.resolve(currentDir, '../../');
    } else {
      // 否则尝试从当前目录向上查找包含 templates 目录的位置
      let current = currentDir;
      for (let i = 0; i < 5; i++) {
        const testPath = path.join(current, 'templates', templateName);
        try {
          const fs = require('fs');
          if (fs.existsSync(testPath)) {
            return testPath;
          }
        } catch {
          // 忽略错误
        }
        current = path.resolve(current, '..');
        if (current === path.resolve(current, '..')) {
          break; // 到达根目录
        }
      }
    }
    
    const templatePath = path.join(projectRoot, 'templates', templateName);
    return templatePath;
  } catch (error) {
    console.warn('无法确定模板路径:', error);
    return undefined;
  }
}

/**
 * 从文件读取模板，如果文件不存在则返回默认内容
 */
async function loadTemplate(templateName: string, defaultContent: string): Promise<string> {
  const templatePath = getTemplatePath(templateName);
  if (templatePath && await fileExists(templatePath)) {
    try {
      return await readFile(templatePath);
    } catch (error) {
      console.warn(`无法读取模板文件 ${templateName}，使用默认内容:`, error);
      return defaultContent;
    }
  }
  return defaultContent;
}

/**
 * 同步版本：从文件读取模板，如果文件不存在则返回默认内容
 */
function loadTemplateSync(templateName: string, defaultContent: string): string {
  const templatePath = getTemplatePath(templateName);
  if (!templatePath) {
    return defaultContent;
  }
  
  try {
    const fs = require('fs');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`无法读取模板文件 ${templateName}，使用默认内容:`, error);
  }
  
  return defaultContent;
}

/**
 * 生成 .cursorrules 内容
 */
export async function generateCursorRules(): Promise<string> {
  const defaultContent = `# Vibe Video 项目 - AI 助手指南

## 核心任务
当用户要求"生成分镜"时，执行以下步骤：
1. 阅读 \`剧本.md\`
2. 将剧本拆分为 5-10 秒的场景
3. 为每个场景生成分镜 Markdown，保存到 \`storyboards/\`
4. 同步生成首帧描述 Markdown，保存到 \`first-frames/\`

---

## 分镜脚本格式

### 必需内容
每个分镜描述必须包含：
- **场景/环境**：位置、背景
- **主体**：主要对象
- **光线**：光源方向、色调
- **运镜**：镜头运动方式（推/拉/摇/移/固定）
- **动作**：画面中的动态元素
- **氛围**：情绪和感觉（可选）

### 文件格式
\`\`\`markdown
# 场景标题

- **时长**: 5秒（可选）
- **主体**: 角色1, 角色2（如使用主体功能）
- **参考图**: ref-img/xxx.jpg（如使用参考图）

详细的视觉描述...
\`\`\`

### 示例
\`\`\`markdown
# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射金色阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
\`\`\`

---

## 首帧描述格式

### 文件位置
- 目录：\`first-frames/\`（不存在则创建）
- 命名：\`01-opening-first-frame.md\` 或 \`scene3-first-frame.md\`

### 必需字段
\`\`\`markdown
# 场景标题
- **首帧提示**: 静态画面描述（避免视频化表述）
- **参考图片**: 路径1, 路径2（可选，支持多张，逗号分隔）
- **主体**: 主体外观（含表情/姿态）
- **场景**: 环境描述
- **光线**: 光线色调
- **构图**: 视角和构图
- **氛围**: 情绪氛围
\`\`\`

### 重要约束
- ✅ 只描述单帧静态画面
- ❌ 禁止"镜头移动""动作连贯"等视频化表述
- ✅ 参考图片路径：相对路径或绝对路径，支持多张（逗号/空格分隔）

---

## 主体功能（可选）

### 使用场景
视频中有固定角色时使用，确保角色外观一致。

### 定义主体
在 \`subjects/\` 目录创建 \`角色名.md\`：
\`\`\`markdown
# 角色名

角色外观描述...
3D卡通风格，圆润体型，大眼睛...

**约束**：只生成主体本身，背景纯白色（#FFFFFF），无其他物品。
\`\`\`

### 引用主体
在分镜中使用：
\`\`\`markdown
- **主体**: 角色1, 角色2
- **场景**: 场景描述
- **构图**: 构图说明
\`\`\`

---

## 参考图功能（可选）

### 使用场景
用户提供参考图片（产品图、场景照片、风格参考等）时使用。

### 放置位置
将图片（.png, .jpg, .jpeg）放入 \`ref-img/\` 目录。

### 引用方式
\`\`\`markdown
- **参考图**: ref-img/product.jpg
- **参考图**: ref-img/img1.jpg, ref-img/img2.jpg（多张）
\`\`\`

### 生成视频时的优先级
生成视频时，图片使用优先级为：
1. **参考图**（\`ref-img/xxx.jpg\`）- 优先使用，用户可控
2. **首帧图片**（\`first-frames/xxx.png\`）- 如果未指定参考图，使用生成的首帧
3. **文生视频** - 如果都没有，使用纯文本生成

**重要**：如果分镜脚本中指定了参考图，生成视频时将直接使用参考图，而不是生成的首帧图片。这样可以确保用户对参考图的使用更加可控。

---

## 优先级

1. **描述质量** > 格式规范
2. **内容完整** > 格式完美
3. **视觉清晰** > 技术细节

---

## 文件命名
- 支持任意命名：\`01-opening.md\`、\`scene1.md\`、\`开场.md\`
- 建议使用有意义的名称
`;
  
  return await loadTemplate('cursorrules.md', defaultContent);
}

/**
 * 同步版本：生成 .cursorrules 内容
 */
export function generateCursorRulesSync(): string {
  const defaultContent = `# Vibe Video 项目 - AI 助手指南

## 核心任务
当用户要求"生成分镜"时，执行以下步骤：
1. 阅读 \`剧本.md\`
2. 将剧本拆分为 5-10 秒的场景
3. 为每个场景生成分镜 Markdown，保存到 \`storyboards/\`
4. 同步生成首帧描述 Markdown，保存到 \`first-frames/\`

---

## 分镜脚本格式

### 必需内容
每个分镜描述必须包含：
- **场景/环境**：位置、背景
- **主体**：主要对象
- **光线**：光源方向、色调
- **运镜**：镜头运动方式（推/拉/摇/移/固定）
- **动作**：画面中的动态元素
- **氛围**：情绪和感觉（可选）

### 文件格式
\`\`\`markdown
# 场景标题

- **时长**: 5秒（可选）
- **主体**: 角色1, 角色2（如使用主体功能）
- **参考图**: ref-img/xxx.jpg（如使用参考图）

详细的视觉描述...
\`\`\`

### 示例
\`\`\`markdown
# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射金色阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
\`\`\`

---

## 首帧描述格式

### 文件位置
- 目录：\`first-frames/\`（不存在则创建）
- 命名：\`01-opening-first-frame.md\` 或 \`scene3-first-frame.md\`

### 必需字段
\`\`\`markdown
# 场景标题
- **首帧提示**: 静态画面描述（避免视频化表述）
- **参考图片**: 路径1, 路径2（可选，支持多张，逗号分隔）
- **主体**: 主体外观（含表情/姿态）
- **场景**: 环境描述
- **光线**: 光线色调
- **构图**: 视角和构图
- **氛围**: 情绪氛围
\`\`\`

### 重要约束
- ✅ 只描述单帧静态画面
- ❌ 禁止"镜头移动""动作连贯"等视频化表述
- ✅ 参考图片路径：相对路径或绝对路径，支持多张（逗号/空格分隔）

---

## 主体功能（可选）

### 使用场景
视频中有固定角色时使用，确保角色外观一致。

### 定义主体
在 \`subjects/\` 目录创建 \`角色名.md\`：
\`\`\`markdown
# 角色名

角色外观描述...
3D卡通风格，圆润体型，大眼睛...

**约束**：只生成主体本身，背景纯白色（#FFFFFF），无其他物品。
\`\`\`

### 引用主体
在分镜中使用：
\`\`\`markdown
- **主体**: 角色1, 角色2
- **场景**: 场景描述
- **构图**: 构图说明
\`\`\`

---

## 参考图功能（可选）

### 使用场景
用户提供参考图片（产品图、场景照片、风格参考等）时使用。

### 放置位置
将图片（.png, .jpg, .jpeg）放入 \`ref-img/\` 目录。

### 引用方式
\`\`\`markdown
- **参考图**: ref-img/product.jpg
- **参考图**: ref-img/img1.jpg, ref-img/img2.jpg（多张）
\`\`\`

### 生成视频时的优先级
生成视频时，图片使用优先级为：
1. **参考图**（\`ref-img/xxx.jpg\`）- 优先使用，用户可控
2. **首帧图片**（\`first-frames/xxx.png\`）- 如果未指定参考图，使用生成的首帧
3. **文生视频** - 如果都没有，使用纯文本生成

**重要**：如果分镜脚本中指定了参考图，生成视频时将直接使用参考图，而不是生成的首帧图片。这样可以确保用户对参考图的使用更加可控。

---

## 优先级

1. **描述质量** > 格式规范
2. **内容完整** > 格式完美
3. **视觉清晰** > 技术细节

---

## 文件命名
- 支持任意命名：\`01-opening.md\`、\`scene1.md\`、\`开场.md\`
- 建议使用有意义的名称
`;
  
  return loadTemplateSync('cursorrules.md', defaultContent);
}

/**
 * 生成 .clinerules 内容（与 .cursorrules 相同）
 */
export async function generateClineRules(): Promise<string> {
  return await generateCursorRules();
}

/**
 * 同步版本：生成 .clinerules 内容
 */
export function generateClineRulesSync(): string {
  return generateCursorRulesSync();
}

/**
 * 生成项目配置
 */
export function generateProjectConfig(projectName: string): VVProjectConfig {
  return {
    name: projectName,
    videoSize: {
      width: 1280,
      height: 720
    },
    fps: 30,
    createdAt: new Date().toISOString(),
    version: '0.1.0'
  };
}

/**
 * 生成示例剧本
 */
export async function generateExampleScript(): Promise<string> {
  const defaultContent = `# 示例剧本：咖啡馆的清晨

## 概述
这是一个温馨的短视频，展现咖啡馆清晨的美好时光。

## 场景描述

### 开场
清晨的阳光透过咖啡馆的玻璃窗洒进来，照亮了木质的桌椅。
店主正在认真地准备今天的第一杯咖啡。

### 制作过程
特写镜头展示咖啡制作的细节：
- 研磨咖啡豆
- 热水冲泡
- 奶泡拉花

### 享受时刻
一位客人端起咖啡杯，品味第一口。
满足的表情，温馨的氛围。

---

**提示**：现在你可以使用 Cursor AI，让它根据这个剧本生成分镜脚本！
在 Cursor Chat 中输入："根据剧本.md 生成分镜脚本"
`;
  
  return await loadTemplate('example-script.md', defaultContent);
}

/**
 * 生成 README 说明文档
 */
export async function generateContextReadme(): Promise<string> {
  const defaultContent = `# Vibe Video 项目说明

## 这是什么？
这个文件夹包含了帮助 AI 助手理解项目的参考文档。

## 文件说明
- \`storyboard-guide.md\`: 如何写好分镜描述
- \`shot-guide.md\`: 镜头类型参考
- \`prompt-examples.md\`: 提示词示例

## 给 AI 助手的说明
你的主要任务是帮助用户生成高质量的分镜脚本。
分镜脚本使用 **Markdown 格式**，重点是写好视觉描述。

详细的描述 = 更好的视频质量！
`;
  
  return await loadTemplate('context-readme.md', defaultContent);
}

/**
 * 生成分镜指南
 */
export async function generateStoryboardGuide(): Promise<string> {
  const defaultContent = `# 如何写好分镜描述

## 5 要素法

每个分镜描述应包含：

### 1. 场景/环境
- 在哪里？
- 室内还是室外？
- 什么样的背景？

### 2. 主体
- 画面的主要对象是什么？
- 人物、产品、还是其他？

### 3. 光线
- 什么样的光？
- 从哪个方向照来？
- 什么色调？

### 4. 运镜
- 镜头如何移动？
- 推进、拉远、环绕、固定？

### 5. 动作
- 画面中有什么在动？
- 人物动作、物体移动、自然元素？

## 示例对比

### ❌ 差的描述
\`\`\`
一个咖啡杯
\`\`\`

### ✅ 好的描述
\`\`\`
一个精致的白色咖啡杯放在深色木质桌面上，
杯中升起缕缕白色蒸汽。
柔和的自然光从左侧窗户洒进来，
在桌面上投下温暖的光影。
镜头缓慢从远处推近到咖啡杯特写。
整体氛围宁静、温馨，充满清晨的美好感。
\`\`\`
`;
  
  return await loadTemplate('storyboard-guide.md', defaultContent);
}

/**
 * 生成镜头类型指南
 */
export async function generateShotGuide(): Promise<string> {
  const defaultContent = `# 镜头类型参考

## 景别
- **特写 (Close-up)**: 聚焦细节
- **中景 (Medium shot)**: 展现主体
- **全景 (Wide shot)**: 展现环境
- **远景 (Long shot)**: 宏大场景

## 运镜
- **推镜 (Dolly in)**: 镜头向前移动
- **拉镜 (Dolly out)**: 镜头向后移动
- **摇镜 (Pan)**: 水平转动
- **倾斜 (Tilt)**: 垂直转动
- **环绕 (Orbit)**: 围绕主体旋转
- **跟随 (Follow)**: 跟随移动对象
- **固定 (Static)**: 镜头不动

## 角度
- **平视**: 正常视角
- **俯拍 (High angle)**: 从上往下
- **仰拍 (Low angle)**: 从下往上
- **鸟瞰 (Aerial)**: 垂直向下
`;
  
  return await loadTemplate('shot-guide.md', defaultContent);
}

/**
 * 生成提示词示例
 */
export async function generatePromptExamples(): Promise<string> {
  const defaultContent = `# 提示词示例

## 产品展示类

### 电子产品
\`\`\`
# 产品特写

一台银色的笔记本电脑位于画面中心，屏幕微微倾斜展示界面。
黑色的背景突出产品的质感，柔和的顶光产生精致的高光和阴影。
镜头从侧面缓慢环绕到正面，展现产品的每个角度。
整体氛围专业、现代、充满科技感。
\`\`\`

## 生活方式类

### 清晨场景
\`\`\`
# 温馨的早晨

阳光透过薄纱窗帘洒进卧室，照亮了柔软的被褥。
一个人在床上缓缓醒来，伸了个懒腰。
镜头固定在床边，记录这个宁静的时刻。
光线柔和温暖，色调偏暖黄色，充满舒适和放松的感觉。
\`\`\`

## 故事类

### 情感片段
\`\`\`
# 重逢

两个人在咖啡馆门口相遇，彼此惊喜地拥抱。
背景是熙熙攘攘的街道，但画面的焦点在两人身上。
镜头从远处缓慢推进，最后定格在他们微笑的脸庞。
自然光，色调鲜艳，充满温暖和喜悦的情绪。
\`\`\`
`;
  
  return await loadTemplate('prompt-examples.md', defaultContent);
}

