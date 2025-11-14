# 图生视频工作流设计

## 核心理念

**图 + 文 > 纯文本**

通过提供初始帧图片，视频生成更加：
- ✅ 可控（主体、构图、风格）
- ✅ 一致（同一角色在不同场景）
- ✅ 高质量（图生视频效果更好）

参考：[通义万相-图生视频-基于首帧](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2862677)

---

## 通义万相的相关能力

### 1. 文生图（生成初始帧）
用于创建初始帧图片

**适用场景**：
- 没有现成的素材
- 需要生成特定风格的初始帧
- 批量生成不同场景的初始帧

**API**：通义万相文生图 API

### 2. 图片编辑（调整初始帧）
用于修改、优化初始帧

**适用场景**：
- 调整构图
- 更换背景
- 修改细节

**API**：通义万相图片编辑 API

### 3. 图生视频-基于首帧（核心功能）⭐
使用初始帧 + 文字描述生成视频

**优势**：
- 主体一致性好
- 运动更自然
- 质量更高

**API**：[通义万相-图生视频-基于首帧 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2862677)

---

## 更新后的工作流

### 方式 1：用户提供参考图（最简单）

```
用户准备阶段：
1. 准备主体图片（如主角照片、产品图）
2. 放入 assets/subjects/character.png

生成分镜时：
3. Cursor AI 生成分镜 JSON，包含图片引用：
   {
     "id": "01",
     "description": "主角站在城市街头，阳光从背后照来...",
     "firstFrame": "assets/subjects/character.png"  // 引用图片
   }

生成视频时：
4. 插件读取图片 + 描述
5. 调用"图生视频"API
6. 生成高质量视频
```

### 方式 2：AI 生成初始帧（更自动化）

```
用户准备阶段：
1. 用户在剧本.md 中描述主角外观
   "主角：20多岁的年轻女性，短发，穿休闲装"

生成分镜时：
2. Cursor AI 生成分镜 JSON，标记需要生成首帧：
   {
     "id": "01",
     "description": "主角站在城市街头，阳光从背后照来...",
     "firstFramePrompt": "20多岁女性，短发，休闲装，站立姿势，城市街景背景"
   }

生成初始帧：
3. 用户运行：Vibe Video: Generate First Frames
4. 插件读取所有 firstFramePrompt
5. 调用"文生图"API 批量生成
6. 保存到 assets/first-frames/01.png
7. 自动更新 JSON：
   {
     "firstFrame": "assets/first-frames/01.png"
   }

生成视频时：
8. 插件读取图片 + 描述
9. 调用"图生视频"API
10. 生成高质量视频
```

### 方式 3：混合方式（最灵活）

- 有素材的场景：直接引用 `assets/subjects/`
- 需要生成的场景：用 `firstFramePrompt` 生成
- 纯环境场景（无主体）：不用首帧，纯文生视频

---

## 分镜 JSON 格式（更新）

### 基础格式（不变）
```json
{
  "id": "01",
  "description": "详细的视觉描述..."
}
```

### 扩展格式（支持首帧）
```json
{
  "id": "01",
  "description": "主角站在城市街头，阳光从背后照来，镜头缓慢推进...",
  
  // 方式 A：直接引用现有图片
  "firstFrame": "assets/subjects/character.png",
  
  // 方式 B：让 AI 生成首帧（二选一）
  "firstFramePrompt": "20多岁女性，短发，休闲装，站立，城市街景"
}
```

### 字段说明
- `firstFrame`：图片路径（相对于项目根目录）
- `firstFramePrompt`：用于生成首帧的文生图提示词
- 两者**只能有一个**（或都没有，退化为纯文生视频）

---

## 项目结构（更新）

```
MyVideoProject/
├── 剧本.md
├── storyboards/
│   ├── 01-opening.json         # 包含 firstFrame 或 firstFramePrompt
│   └── ...
├── assets/
│   ├── subjects/               # 用户提供的素材图片
│   │   ├── character.png       # 主角照片
│   │   ├── product.jpg         # 产品图
│   │   └── ...
│   ├── first-frames/           # AI 生成的初始帧 ⭐ 新增
│   │   ├── 01.png
│   │   ├── 02.png
│   │   └── ...
│   ├── clips/                  # 生成的视频
│   └── ...
└── ...
```

---

## 新增命令

### 1. 生成初始帧
```
命令：Vibe Video: Generate First Frames

功能：
- 读取所有分镜 JSON
- 找出有 firstFramePrompt 的分镜
- 调用"文生图"API 批量生成
- 保存到 assets/first-frames/{id}.png
- 自动更新 JSON，将 firstFramePrompt 转换为 firstFrame
```

### 2. 预览初始帧
```
命令：Vibe Video: Preview First Frames

功能：
- 在侧边栏显示所有初始帧的缩略图
- 点击查看大图
- 右键："重新生成"、"编辑"
```

### 3. 批量生成视频（更新）
```
命令：Vibe Video: Generate All Videos

逻辑：
- 检查分镜是否有 firstFrame
- 如果有：调用"图生视频"API
- 如果没有：调用"文生视频"API（退化）
```

---

## 侧边栏（更新）

```
Vibe Video
├── 📝 分镜脚本 (5)
│   ├── ✅ 01-opening.json (有首帧 🖼️)
│   ├── ✅ 02-scene.json (纯文本)
│   └── ⚠️  03-action.json (缺少首帧图片)
│
├── 🖼️  初始帧 (3/5) ⭐ 新增
│   ├── 01.png ✓
│   ├── 02.png (待生成)
│   └── 03.png ✓
│
├── 🎬 视频片段 (2/5)
│   ├── 01-opening.mp4 ✓
│   └── ...
└── ...
```

---

## .cursorrules 模板（更新）

```
## JSON 格式

基础格式：
{
  "id": "场景标识",
  "description": "详细的视觉描述"
}

支持首帧（可选）：
{
  "id": "01",
  "description": "...",
  "firstFrame": "assets/subjects/character.png"  // 引用现有图片
}

或者：
{
  "id": "01",
  "description": "...",
  "firstFramePrompt": "20多岁女性，短发，休闲装，站立姿势"  // 生成首帧
}

## 何时使用首帧？

推荐使用：
- 有明确的主体（人物、产品）
- 需要保持主体一致性
- 用户提供了参考图

可以不用：
- 纯环境镜头（如风景、城市）
- 抽象场景
- 快速变化的场景
```

---

## API 调用流程

### 生成初始帧流程
```typescript
async function generateFirstFrames() {
  const storyboards = readAllStoryboards();
  
  for (const sb of storyboards) {
    if (sb.firstFramePrompt && !sb.firstFrame) {
      // 调用文生图 API
      const image = await tongyiWanxiang.textToImage({
        prompt: sb.firstFramePrompt,
        size: '1280x720',  // 匹配视频比例
        style: 'realistic'
      });
      
      // 保存图片
      const imagePath = `assets/first-frames/${sb.id}.png`;
      await saveImage(image, imagePath);
      
      // 更新 JSON
      sb.firstFrame = imagePath;
      delete sb.firstFramePrompt;  // 移除 prompt
      await saveStoryboard(sb);
      
      console.log(`✓ 生成首帧：${sb.id}`);
    }
  }
}
```

### 图生视频流程
```typescript
async function generateVideoWithFirstFrame(storyboard: Storyboard) {
  // 读取首帧图片
  const imageBuffer = await fs.readFile(storyboard.firstFrame);
  const imageBase64 = imageBuffer.toString('base64');
  
  // 调用图生视频 API
  const result = await tongyiWanxiang.imageToVideo({
    image: imageBase64,
    prompt: storyboard.description,
    duration: storyboard.duration || 5,
    motion: 'medium'  // 运动幅度
  });
  
  return result.taskId;
}
```

---

## 优势总结

### 视频质量提升
- ✅ 主体更清晰、一致
- ✅ 运动更自然
- ✅ 构图更可控

### 用户体验提升
- ✅ 可以使用自己的素材（产品图、品牌资产）
- ✅ 角色一致性好（适合有剧情的视频）
- ✅ 灵活：可以选择性使用首帧

### 技术实现
- ⚠️ 增加复杂度（需要集成文生图 API）
- ⚠️ 需要管理图片资源
- ✅ 但提升的质量值得投入

---

## 实施优先级

### MVP (必须)
- ✅ 支持用户提供图片（方式 1）
- ✅ 图生视频 API 集成
- ✅ 侧边栏显示首帧

### V1.1 (推荐)
- ✅ 文生图 API 集成（方式 2）
- ✅ 批量生成首帧命令
- ✅ 首帧预览功能

### V1.2 (可选)
- 图片编辑 API（调整首帧）
- 首帧模板库
- 角色一致性优化

---

## 成本考虑

### API 费用（估算）
假设一个 50 个分镜的项目：
- 文生图：50 次 × ¥0.1 = ¥5
- 图生视频：50 次 × ¥0.5 = ¥25
- **总计：约 ¥30**（相比纯文生视频可能只贵一点点）

### 时间成本
- 生成 50 个首帧：约 5-10 分钟
- 生成 50 个视频：约 20-30 分钟
- **总计：30-40 分钟**（可接受）

---

## 用户工作流（完整版）

### 步骤 0: 准备素材（可选）
```
用户：准备主角/产品图片
用户：放入 assets/subjects/
```

### 步骤 1: 初始化项目
```
用户：Vibe Video: Initialize Project
```

### 步骤 2: 生成分镜
```
用户：Cursor AI → "生成分镜脚本"
AI：生成 JSON，智能添加 firstFrame 或 firstFramePrompt
```

### 步骤 3: 生成首帧（如果需要）
```
用户：Vibe Video: Generate First Frames
插件：批量生成所有需要的首帧
用户：在侧边栏预览，确认效果
用户：（可选）重新生成质量不好的首帧
```

### 步骤 4: 生成视频
```
用户：Vibe Video: Generate All Videos
插件：使用"图生视频"API（有首帧）或"文生视频"API（无首帧）
插件：批量生成所有视频
```

### 步骤 5: 合成
```
用户：Vibe Video: Compose Final Video
插件：合成最终视频
```

---

## 与纯文生视频的对比

| 特性 | 纯文生视频 | 图+文生视频 |
|-----|----------|-----------|
| 实施复杂度 | ⭐⭐ | ⭐⭐⭐ |
| 视频质量 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可控性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 一致性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 成本 | 低 | 略高 |
| 用户使用门槛 | 低 | 中 |

**结论**：图+文的方案复杂度增加不多，但质量提升明显，**值得实施**！

---

## 示例：完整的分镜 JSON

```json
{
  "id": "opening",
  "title": "开场镜头",
  "description": "主角（年轻女性，短发）站在繁华的城市街头，背后是高楼大厦，阳光从左侧照来。镜头从远处缓慢推进到中景。主角微笑着看向镜头，充满自信的感觉。",
  "duration": 5,
  "firstFrame": "assets/subjects/character-01.png",
  "notes": "这是开场，要展现主角的活力"
}
```

或者（AI 生成首帧）：

```json
{
  "id": "opening",
  "title": "开场镜头",
  "description": "主角站在繁华的城市街头，背后是高楼大厦，阳光从左侧照来。镜头从远处缓慢推进到中景。主角微笑着看向镜头，充满自信的感觉。",
  "duration": 5,
  "firstFramePrompt": "25岁亚洲女性，短发，休闲装（白T恤+牛仔裤），自信微笑，站立姿势，城市街景背景，白天，自然光，真实摄影风格",
  "notes": "开场镜头"
}
```

---

## 总结

这个扩展方案：
1. ✅ **大幅提升视频质量**（图生视频效果更好）
2. ✅ **增强可控性**（主体、构图、风格）
3. ✅ **保持灵活性**（可选功能，不强制使用）
4. ⚠️ **略增复杂度**（但在可接受范围内）
5. ✅ **符合轻量理念**（API 调用很简单）

**建议**：MVP 就应该支持此功能，因为它对视频质量提升太明显了！

