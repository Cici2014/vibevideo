# Vibe Video 项目文档总结

## 📚 文档索引

### 核心文档
1. **[design.md](design.md)** - 最初的设计理念和愿景
2. **[plan.md](plan.md)** - 完整的实施计划（⭐ 主文档）
3. **[storyboard-markdown-format.md](storyboard-markdown-format.md)** - 分镜格式（Markdown）⭐ 新
4. **[storyboard-guide.md](storyboard-guide.md)** - 分镜脚本指南（内容>格式）

### 专题文档
5. **[image-to-video-workflow.md](image-to-video-workflow.md)** - 图生视频工作流（⭐ 重要）
6. **[video-generation-options.md](video-generation-options.md)** - 视频生成方案对比
7. **[api-comparison.md](api-comparison.md)** - 通义万相 vs Replicate 详细对比

---

## 🎯 项目定位

### 核心价值主张
**像写代码一样制作视频**

1. 用 Markdown 写剧本（任意格式）
2. 用 Cursor AI 生成分镜脚本（JSON）
3. 插件自动生成视频（通义万相 API）
4. 合成最终视频（ffmpeg）

### 独特优势
- ✅ **轻量级**：利用 Cursor AI，不自己解析剧本
- ✅ **高质量**：支持图生视频，大幅提升效果
- ✅ **内容优先**：不强制格式，重点是描述质量
- ✅ **国内优化**：通义万相，网络稳定，中文支持好
- ✅ **快速迭代**：6周完成 MVP

---

## 🛠️ 技术方案

### 技术栈
```typescript
// 前端
VS Code Extension API
TypeScript 5.x

// 依赖（超级简单！）⭐
@alicloud/wan2-sdk    // 通义万相 SDK
fluent-ffmpeg         // 视频合成（可选）

// 不需要任何解析库！
❌ ajv (无需复杂验证)
❌ axios (SDK已包含)
❌ gray-matter (Markdown用原生解析)
❌ JSON Schema 库

// Markdown 解析：原生 fs + 正则即可！
```

### 核心功能
1. **项目初始化**：生成标准文件结构 + AI 上下文（.cursorrules）
2. **Markdown 解析**：解析分镜脚本，超简单！⭐ 新
3. **质量建议**：友好提示，不强制（不阻止使用）
4. **文生图**：生成初始帧 ⭐
5. **图生视频**：基于首帧生成高质量视频 ⭐
6. **纯文生视频**：无首帧时的退化方案
7. **视频合成**：ffmpeg 合成最终视频

---

## 📋 实施时间线

```
Week 1:    核心脚手架
Week 2-3:  通义万相 API 集成
           ├── 文生图（初始帧）
           ├── 图生视频（推荐）⭐
           └── 文生视频（退化）
Week 4:    资源管理 + 侧边栏
Week 5:    视频合成
Week 6:    文档 + 发布

Total: 6周完成
```

---

## 🎬 用户工作流

### 完整流程（推荐）

```
1. 初始化项目
   └── Vibe Video: Initialize Project

2. 写剧本
   └── 创建/编辑 剧本.md

3. 生成分镜
   └── Cursor AI: "生成分镜脚本"
   └── 保存到 storyboards/*.json

4. 检查质量（可选）
   └── 侧边栏查看验证状态
   └── ⚠️ 有建议但不阻止

5. 配置 API（一次性）
   └── Vibe Video: Configure Video AI
   └── 输入阿里云 Access Key

6. 生成初始帧（推荐）⭐
   └── Vibe Video: Generate First Frames
   └── 批量生成所有首帧
   └── 1-2 分钟完成

7. 生成视频
   └── Vibe Video: Generate All Videos
   └── 自动判断：有首帧→图生视频，无首帧→文生视频
   └── 10-30 分钟（取决于数量）

8. 合成视频
   └── Vibe Video: Compose Final Video
   └── 生成 output/final.mp4
```

---

## 🔑 关键设计决策

### 1. 为什么选通义万相？
详见 [api-comparison.md](api-comparison.md)

| 优势 | 说明 |
|-----|------|
| 网络稳定 | 国内服务，无需翻墙 |
| 中文支持 | 原生中文模型 |
| 支付方便 | 支付宝/微信 |
| 图生视频 | 支持首帧，质量更高 ⭐ |
| 价格透明 | 有免费额度 |

### 2. 为什么支持图生视频？
详见 [image-to-video-workflow.md](image-to-video-workflow.md)

**质量对比**：
- 纯文生视频：⭐⭐⭐
- 图+文生视频：⭐⭐⭐⭐⭐

**优势**：
- 主体更清晰、一致
- 运动更自然
- 构图更可控
- 适合有角色的视频

**成本**：
- 略增开发复杂度（+1周）
- 用户成本略增（文生图 + 图生视频）
- **但质量提升明显，值得！**

### 3. 为什么不强制 JSON 格式？
详见 [storyboard-guide.md](storyboard-guide.md)

**理念**：内容 > 格式

- 大模型理解**语义**，不是数据结构
- 描述质量决定视频质量
- 过度验证会给用户添麻烦
- 只检查必需字段（id、description）
- 其他是建议，不是强制

---

## 📂 项目结构

```
MyVideoProject/
├── 剧本.md                      # 用户的剧本
├── .vv-project.json            # 项目配置
├── .cursorrules                # AI 上下文
│
├── storyboards/                # 分镜脚本 ⭐ Markdown
│   ├── 01-opening.md
│   ├── 02-product.md
│   └── ...
│
├── assets/
│   ├── subjects/               # 用户素材
│   ├── first-frames/           # AI生成的首帧 ⭐
│   ├── clips/                  # 生成的视频
│   └── audio/                  # 音频
│
└── output/
    └── final.mp4               # 最终视频
```

---

## 🎯 分镜格式（Markdown）⭐ 重要

### 最简格式
```markdown
# 开场镜头

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光。
无人机视角从低空缓慢上升，展现整个城市轮廓...
```

### 推荐格式（带元数据）⭐
```markdown
# 开场镜头

- **时长**: 5秒
- **首帧**: assets/subjects/city.jpg

城市清晨的天际线，玻璃幕墙的高楼反射着金色的阳光...
```

### 或者（AI生成首帧）
```markdown
# 主角登场

- **生成首帧**: 25岁女性，短发，休闲装，城市背景

主角站在城市街头，阳光从左侧照来...
```

**为什么 Markdown？**
- ✅ 直观易读
- ✅ 易于编辑
- ✅ AI 天然理解
- ✅ Git 友好
- ✅ 无需复杂验证

详见 `storyboard-markdown-format.md`

---

## 📊 对比总结

### 与原重型方案对比

| 维度 | 原方案 | 现方案 |
|-----|-------|-------|
| 分镜生成 | 自己解析Markdown | ✅ Cursor AI |
| 视频生成 | 多Provider抽象 | ✅ 单一Provider |
| 图生视频 | ❌ 不支持 | ✅ 支持 ⭐ |
| 格式验证 | ❌ 过度严格 | ✅ 宽松友好 |
| 开发时间 | 3-4个月 | ✅ 6周 |
| 复杂度 | 高 | ✅ 中等 |

### 与纯文生视频对比

| 特性 | 纯文生视频 | 图+文生视频 |
|-----|----------|-----------|
| 实施复杂度 | ⭐⭐ | ⭐⭐⭐ |
| 视频质量 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ ⭐ |
| 可控性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 一致性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 成本 | 低 | 略高 |

**结论**：图生视频值得实施！

---

## 🚀 下一步行动

### 立即开始
1. ✅ 审查计划（已完成）
2. ⏭️ 注册阿里云账号
3. ⏭️ 测试通义万相 API
4. ⏭️ 验证图生视频效果

### Week 1 开始
1. 创建项目结构
2. 实现 ProjectInitializer
3. 生成 .cursorrules 模板
4. 测试 Cursor AI 理解能力

---

## 📖 阅读指南

### 如果你是...

**项目经理/决策者**：
→ 读 `SUMMARY.md`（本文）+ `api-comparison.md`

**开发者**：
→ 读 `plan.md`（完整实施计划）

**想了解图生视频**：
→ 读 `image-to-video-workflow.md`

**想了解分镜格式**：
→ 读 `storyboard-guide.md`

**想了解 API 选择**：
→ 读 `api-comparison.md` + `video-generation-options.md`

---

## 💡 核心理念总结

1. **轻量 + 实用** = 恰到好处
   - 不过度设计
   - 不过度简化
   - 专注核心价值

2. **Markdown > JSON** ⭐ 重要
   - 分镜脚本用 Markdown，不是 JSON
   - 直观易读，易于编辑
   - AI 天然理解，无需复杂验证
   - 只需 1 个依赖（通义万相 SDK）

3. **内容 > 格式**
   - 描述质量决定视频质量
   - 不纠结格式细节
   - 宽松解析，容错性强

4. **图生视频** = 质量飞跃
   - 提供初始帧
   - 视频质量大幅提升
   - 值得额外投入

5. **快速迭代** = 6周完成
   - 比原方案快 2-3 倍
   - 保持核心功能完整

6. **用户友好** = 低门槛
   - 利用现有工具（Cursor）
   - 国内服务（通义万相）
   - 友好提示（不阻止使用）

---

## 🎉 期待成果

6周后，用户可以：

1. 用 Markdown 写剧本
2. 一句话让 Cursor 生成分镜
3. 一键生成高质量视频（图生视频）
4. 一键合成最终成片

**像写代码一样制作视频！** 🎬

