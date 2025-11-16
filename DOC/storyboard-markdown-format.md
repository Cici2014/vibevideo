# 分镜脚本 Markdown 格式

## 核心理念

**Markdown > JSON**

分镜脚本是给人类看、给 AI 读的内容，用 Markdown 最合适：
- ✅ 直观易读
- ✅ 易于编辑
- ✅ AI 天然理解
- ✅ Git 友好
- ✅ 无需复杂验证

---

## 基础格式

### 最简格式

```markdown
# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
```

**说明**：
- `# 标题` 就是场景标识
- 正文就是视觉描述
- 就这么简单！

---

## 推荐格式（带元数据）

### 方式 1：使用列表

```markdown
# 开场镜头

- **时长**: 5秒
- **首帧**: assets/subjects/city.jpg

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
```

### 方式 2：使用 Frontmatter

```markdown
---
duration: 5
firstFrame: assets/subjects/city.jpg
---

# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
```

### 方式 3：纯自然语言

```markdown
# 开场镜头（5秒）

[首帧: assets/subjects/city.jpg]

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓。
街道上车流如织，人们开始一天的忙碌。
光线温暖明亮，画面充满希望和活力的感觉。
```

**选择哪种？** 随意！AI 都能理解。

---

## 支持初始帧

### 引用现有图片

```markdown
# 主角登场

- **首帧**: assets/subjects/character.png

主角（年轻女性，短发）站在繁华的城市街头，背后是高楼大厦。
阳光从左侧照来，在她脸上投下柔和的光影。
镜头从远处缓慢推进到中景。
主角微笑着看向镜头，充满自信的感觉。
```

### AI 生成首帧

```markdown
# 主角登场

- **生成首帧**: 25岁亚洲女性，短发，休闲装（白T恤+牛仔裤），自信微笑，站立姿势，城市街景背景，白天，自然光，真实摄影风格

主角站在繁华的城市街头，背后是高楼大厦。
阳光从左侧照来，在她脸上投下柔和的光影。
镜头从远处缓慢推进到中景。
主角微笑着看向镜头，充满自信的感觉。
```

---

## 完整示例

### 示例 1：产品宣传视频

**文件**：`storyboards/01-opening.md`
```markdown
# 开场 - 清晨的办公室

- **时长**: 5秒
- **首帧**: assets/subjects/office.jpg

清晨的现代办公室，阳光透过落地窗洒进来。
镜头从窗外缓慢推进，展现整洁的办公空间。
桌上放着一台笔记本电脑，屏幕微微发光。
氛围宁静、专业，带有一天开始的期待感。
```

**文件**：`storyboards/02-product.md`
```markdown
# 产品特写

- **时长**: 8秒
- **首帧**: assets/subjects/product.png
- **音效**: assets/audio/whoosh.wav

产品（科技感强的智能手表）位于画面中心，缓慢旋转。
镜头从侧面环绕到正面，展现屏幕细节。
背景是柔和的渐变色，粒子效果飘动。
光线从上方45度角照射，产生精致的高光和阴影。
```

**文件**：`storyboards/03-use-case.md`
```markdown
# 使用场景 - 晨跑

- **时长**: 6秒
- **生成首帧**: 30岁男性，运动装，晨跑姿势，公园背景，清晨光线，真实摄影

男性用户在公园晨跑，手腕上戴着我们的智能手表。
镜头跟随他的侧面移动，保持中景。
手表屏幕显示运动数据（心率、步数）。
背景是朦胧的公园树木，早晨的阳光穿透雾气。
充满活力和健康的感觉。
```

### 示例 2：故事性短片

**文件**：`storyboards/01-intro.md`
```markdown
---
duration: 7
firstFrame: assets/subjects/girl-profile.png
notes: 这是开场，要建立主角形象
---

# 主角出场

年轻女孩（18岁左右，学生装）坐在图书馆的窗边。
她盯着窗外发呆，阳光洒在她的侧脸上。
镜头从窗外透过玻璃看向她，缓慢推进。
背景是模糊的书架和其他学生。
氛围安静、思考，带有一丝忧郁。

**运镜**: Dolly in, 缓慢推进
**光线**: 自然光，侧光为主
**情绪**: 安静、内省
```

---

## 插件如何解析？

### 超简单的解析逻辑

```typescript
interface Storyboard {
  id: string;           // 从文件名提取
  title: string;        // 从 # 标题提取
  description: string;  // 正文内容
  duration?: number;    // 从元数据提取（可选）
  firstFrame?: string;  // 从元数据提取（可选）
  firstFramePrompt?: string;
}

function parseMarkdownStoryboard(filePath: string): Storyboard {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');
  
  // 提取标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName;
  
  // 提取元数据（支持多种格式）
  const duration = extractDuration(content);  // 查找 "时长", "duration", "5秒" 等
  const firstFrame = extractFirstFrame(content);  // 查找 "首帧", "firstFrame" 等
  
  // 提取描述（去掉标题和元数据部分）
  const description = extractDescription(content);
  
  return {
    id: fileName,
    title,
    description,
    duration,
    firstFrame
  };
}

// 宽松的元数据提取
function extractDuration(content: string): number | undefined {
  // 支持多种格式
  const patterns = [
    /时长[：:]\s*(\d+)\s*秒/,
    /duration[：:]\s*(\d+)/i,
    /\((\d+)秒\)/,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return parseInt(match[1]);
  }
  
  return 5;  // 默认5秒
}
```

**关键**：解析非常宽松，容错性强！

---

## .cursorrules 模板（更新）

```markdown
这是一个 Vibe Video 视频项目。

## 你的任务
当用户要求"生成分镜"时：
1. 阅读 `剧本.md`
2. 将剧本拆分成多个 5-10 秒的场景
3. 为每个场景生成一个 **Markdown 文件**，保存到 `storyboards/`

## 分镜格式（Markdown）⭐

基础格式（最简单）：
```markdown
# 场景标题

详细的视觉描述...
包含：场景、主体、光线、运镜、动作、氛围
```

推荐格式（带元数据）：
```markdown
# 场景标题

- **时长**: 5秒
- **首帧**: assets/subjects/character.png

详细的视觉描述...
```

或者（AI生成首帧）：
```markdown
# 场景标题

- **生成首帧**: 人物外观描述，适合生成图片

详细的视觉描述...
```

## 命名规则
- `01-opening.md` ✓
- `02-product.md` ✓
- `scene-01.md` ✓
- 随意，只要能排序

## 重点：写好描述！
每个描述包含：
1. 场景/环境
2. 主体
3. 光线
4. 运镜
5. 动作/运动
6. 氛围

Markdown 格式很灵活，重点是内容质量！

## 首帧描述 Markdown 规则

为了让 AI 编程工具自动为每个分镜生成首帧描述，请在 `.cursorrules` 中追加以下要求：

### 文件夹与命名
- 创建 `first-frames/` 文件夹，用于集中存放首帧描述 Markdown。
- 与分镜一一对应，推荐命名为 `01-opening-first-frame.md`、`02-product-first-frame.md` 等，方便排序和关联。

### Markdown 结构（必须包含以下字段）
```markdown
# 01-opening 首帧

- **首帧提示**: （一句话提示，方便 AI 取用）
- **参考图片**: （可选，图片文件路径，如 ref-img/scene.jpg 或 assets/subjects/character.png）
- **主体**: （出现的角色/物体，包含数量、性别、服装等）
- **场景**: （地点、环境、时间、气候）
- **动作/姿态**: （主体的神态、姿势、行为）
- **氛围/情绪**: （整体情感与故事氛围）
- **灯光/摄影**: （光源位置、色温、对比、镜头焦段/景别）
- **构图/视角**: （机位、角度、构图要点）
- **补充元素**: （需要出现的道具、背景元素或后期效果）
```

> **提示**：
> - 字段内容可使用自然语言段落或列表，但必须覆盖上述信息点，确保首帧描述足够详实以驱动首帧图片生成。
> - **参考图片**字段（可选）：如果提供了参考图片路径，生成首帧时将使用该图片作为合成图片的图片来源。参考图片可以是主体图片（如 `assets/subjects/character.png`）或用户自定义的图片（如 `ref-img/custom-scene.jpg`）。路径可以是相对路径（相对于项目根目录）或绝对路径。

### 生成流程要求
1. 当用户请求生成分镜时，同时为每个分镜生成对应的首帧 Markdown 并保存在 `first-frames/` 中。
2. 若分镜已有现成首帧图片，可在 `首帧提示` 中说明引用路径；否则编写可直接用于图片生成的详细提示。
3. 插件后续流程会根据这些 Markdown 文档生成或校验首帧图片，因此缺失字段时需提示用户补全。
```

---

## 对比：Markdown vs JSON

| 维度 | JSON | Markdown ⭐ |
|-----|------|-----------|
| 人类可读性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 编辑体验 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| AI 理解 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 格式验证 | 严格（易出错） | 宽松（容错） |
| Git diff | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 富文本支持 | ❌ | ✅ |
| 需要解析库 | ✅ | ❌（简单字符串处理） |

**结论**：Markdown 完胜！

---

## 侧边栏显示

```
Vibe Video
├── 📝 分镜脚本 (5)
│   ├── ✅ 01-opening.md (优秀, 有首帧 🖼️)
│   ├── ✅ 02-product.md (纯文本)
│   ├── ⚠️  03-scene.md (描述较短)
│   └── ...
```

点击 → 在编辑器中打开 Markdown 文件
Hover → 显示预览和建议

---

## 验证逻辑（超简单）

```typescript
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

function validateMarkdownStoryboard(content: string): ValidationResult {
  const warnings = [];
  
  // 检查是否有标题
  if (!content.match(/^#\s+.+$/m)) {
    warnings.push('建议添加场景标题（# 标题）');
  }
  
  // 检查描述长度
  const description = extractDescription(content);
  if (description.length < 50) {
    warnings.push('描述较短，建议 100 字以上');
  }
  
  // 检查关键词（不强制）
  if (!hasKeyword(description, ['镜头', '运镜', 'camera', '推', '拉'])) {
    warnings.push('建议添加运镜描述');
  }
  
  // 永远返回 valid = true，只是给建议
  return { isValid: true, warnings };
}
```

---

## 总结

**为什么 Markdown 更好？**

1. ✅ **直观**：人类直接读写，无需转换思维
2. ✅ **简单**：无需 JSON 验证，容错性强
3. ✅ **灵活**：支持多种格式，随意发挥
4. ✅ **AI 友好**：大模型天然理解 Markdown
5. ✅ **易维护**：Git diff 清晰，协作友好
6. ✅ **零依赖**：不需要 JSON Schema、ajv 等库

**这才是真正的"轻量"！** 🎉

