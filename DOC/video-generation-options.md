# 视频生成方案对比

## 问题
AI 编程工具（Cursor、Copilot）只能生成文本，**不能生成视频**。
我们必须解决：如何从分镜脚本 JSON 生成实际的视频文件？

---

## 方案 1: 完全手动（最轻量，但用户体验差）

### 工作流
1. 用户用 Cursor 生成分镜 JSON ✅
2. **用户手动**：
   - 打开 Runway/Pika/Sora 网站
   - 逐个复制分镜描述
   - 在网页上生成视频
   - 下载视频
   - 手动重命名为对应的 ID
   - 放入 `assets/clips/` 文件夹

### 插件提供的帮助
- 右键菜单："复制为提示词"（格式化描述）
- 侧边栏显示进度（哪些视频已生成）
- 验证视频文件名和时长

### 优点
- ✅ 插件极其简单，无需 API 集成
- ✅ 零依赖，零成本
- ✅ 用户完全控制（可以调整参数、重新生成）

### 缺点
- ❌ **非常繁琐**：50个分镜需要手动操作50次
- ❌ 容易出错（文件命名、对应关系）
- ❌ 无法批量处理

**评估**：只适合小项目（<10个分镜）

---

## 方案 2: 轻量级 API 集成（推荐 ⭐）

### 核心理念
- 分镜生成：用 Cursor AI（轻量级）
- **视频生成：调用视频 AI 的 API**（必须的复杂性）

### 工作流
1. 用户用 Cursor 生成分镜 JSON ✅
2. 用户配置视频 AI 的 API Key（一次性）
3. 用户运行命令：`Vibe Video: Generate Videos from Storyboards`
4. **插件自动**：
   - 读取所有分镜 JSON
   - 调用视频 AI API（**通义万相** / Runway / Pika / Replicate）
   - 显示进度条
   - 下载并保存视频到 `assets/clips/`
   - 自动命名为对应的 ID

> 💡 **MVP 推荐**：使用**通义万相 Wan2.5**
> - 国内服务，网络稳定
> - 中文支持优秀
> - 价格透明，有免费额度
> - 详细对比见 `api-comparison.md`

### 技术实现
```typescript
// 简化的架构
interface VideoAIProvider {
  name: string;
  generateVideo(prompt: string, options: VideoOptions): Promise<string>; // 返回任务ID
  checkStatus(taskId: string): Promise<'pending' | 'completed' | 'failed'>;
  downloadVideo(taskId: string): Promise<Buffer>;
}

// 支持的平台
class TongyiWanxiangProvider implements VideoAIProvider { ... }  // ⭐ MVP首选
class ReplicateProvider implements VideoAIProvider { ... }       // V1.1添加
class RunwayProvider implements VideoAIProvider { ... }          // 未来可选
class PikaProvider implements VideoAIProvider { ... }            // 未来可选
```

**MVP 实现示例（通义万相）**：
```typescript
import Wan2 from '@alicloud/wan2-sdk';

class TongyiWanxiangProvider implements VideoAIProvider {
  private client: Wan2;
  
  constructor(accessKeyId: string, accessKeySecret: string) {
    this.client = new Wan2({
      accessKeyId,
      accessKeySecret,
    });
  }
  
  async generateVideo(prompt: string, options: VideoOptions): Promise<string> {
    const result = await this.client.generateVideo({
      prompt,  // 直接支持中文
      duration: options.duration || 5,
      resolution: options.resolution || '1280x720',
    });
    return result.taskId;
  }
  
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const result = await this.client.queryTask(taskId);
    return result.status;
  }
  
  async downloadVideo(taskId: string): Promise<Buffer> {
    const status = await this.checkStatus(taskId);
    const response = await fetch(status.videoUrl);
    return await response.buffer();
  }
}
```

### 插件提供的功能
- API Key 管理（使用 VS Code Secret Storage）
- 批量生成（带队列管理）
- 进度通知（异步任务轮询）
- 失败重试
- 单个分镜重新生成

### 优点
- ✅ **自动化**：批量生成，节省时间
- ✅ 错误处理和重试
- ✅ 统一的用户体验
- ✅ 支持多个平台

### 缺点
- ⚠️ 需要开发 API 集成（增加复杂度）
- ⚠️ 用户需要自己的 API Key 和费用
- ⚠️ 依赖外部服务的稳定性

**评估**：适合中大型项目，是最实用的方案

---

## 方案 3: 本地 AI 模型（未来方向）

### 工作流
1. 用户用 Cursor 生成分镜 JSON ✅
2. 插件调用**本地运行**的视频生成模型
   - 如 AnimateDiff、ModelScope、Zeroscope
   - 通过 ComfyUI 或 Automatic1111 的 API

### 优点
- ✅ 完全本地，无需外部 API
- ✅ 无使用成本
- ✅ 隐私保护

### 缺点
- ❌ 需要强大的 GPU（RTX 4090+）
- ❌ 视频质量不如商业 API
- ❌ 生成速度慢
- ❌ 配置复杂（安装模型、环境）

**评估**：作为未来的可选项，但不是主流方案

---

## 方案 4: 混合方案（灵活但复杂）

### 工作流
同时支持方案 1 和方案 2：
- 对于不想配置 API 的用户 → 手动流程（提供工具辅助）
- 对于愿意配置的用户 → 自动 API 调用

### 插件设计
```
Vibe Video: Generate Videos
  → 检测是否配置了 API Key
  → 如果有：自动调用 API
  → 如果没有：
      → 提示用户配置 API
      → 或提供"复制提示词"功能，引导手动流程
```

### 优点
- ✅ 灵活性最高
- ✅ 降低使用门槛（可以先手动试用）
- ✅ 满足不同用户需求

### 缺点
- ⚠️ 开发和维护成本高
- ⚠️ 文档和引导更复杂

---

## 推荐方案：方案 2（轻量级 API 集成）

### 理由
1. **这是必须的复杂性**
   - 视频生成本身就需要 AI，无法用简单逻辑替代
   - 与其让用户手动操作 50 次，不如花时间做好自动化

2. **保持"轻量"的定义**
   - ✅ 分镜生成：用 Cursor（无需插件参与）
   - ✅ API 集成：简单的 HTTP 调用（不是最复杂的部分）
   - ❌ 不做：复杂的 AI 提示词工程、模型训练等

3. **用户价值最大**
   - 核心痛点是"批量生成视频"，这个必须自动化
   - 配置 API Key 是一次性的，可以接受

### 实施建议

#### 第一阶段（MVP）⭐
只支持 **通义万相 Wan2.5**：
- ✅ 国内服务，网络稳定
- ✅ 中文支持优秀（原生中文模型）
- ✅ 有官方 Node.js SDK
- ✅ 价格透明，有免费额度
- ✅ 支付方便（支付宝/微信）

**为什么不是 Replicate？**
- ⚠️ Replicate 在国内访问不稳定
- ⚠️ 中文支持较弱
- ⚠️ 需要国际信用卡

详细对比见 `api-comparison.md`

```typescript
// MVP 只需要这一个 Provider
import Wan2 from '@alicloud/wan2-sdk';

class TongyiWanxiangProvider {
  private client: Wan2;
  
  constructor(accessKeyId: string, accessKeySecret: string) {
    this.client = new Wan2({ accessKeyId, accessKeySecret });
  }
  
  async generateVideo(prompt: string): Promise<string> {
    // 调用通义万相 API（支持中文）
    const result = await this.client.generateVideo({ prompt });
    return result.taskId;
  }
  
  async checkStatus(taskId: string): Promise<TaskStatus> {
    // 查询状态
    return await this.client.queryTask(taskId);
  }
  
  async downloadVideo(taskId: string): Promise<Buffer> {
    // 下载视频
  }
}
```

#### 第二阶段（V1.1）
添加更多平台，满足不同用户需求：
- **Replicate**（供国际用户和需要开源模型的用户）
- Runway Gen-3（商业，质量最好，但价格高）
- Pika Labs（商业，性价比高）
- Luma Dream Machine（新兴）

#### 辅助功能
- "复制为提示词"（方案 1 的辅助）
- 批量导出提示词为 CSV
- 提供详细的 API 配置指南

---

## 修订后的插件定位

### 核心价值
1. **项目组织** - 标准化文件结构 ✅（轻量）
2. **分镜生成** - 借助 Cursor AI ✅（轻量）
3. **视频生成** - 调用视频 AI API ⚠️（必要的复杂性）
4. **视频合成** - ffmpeg 合成 ✅（轻量）

### 与原方案的区别
| | 原重型方案 | 修订后的轻量方案 |
|---|---|---|
| 分镜脚本生成 | 自己解析 Markdown | 用 Cursor AI |
| 提示词工程 | 复杂的模板系统 | 简单的格式化 |
| 多 Provider 管理 | 复杂的抽象层 | 简单的接口 + 少数平台 |
| 任务管理 | 复杂的队列系统 | 基础的异步轮询 |
| 开发时间 | 3-4个月 | 1.5-2个月 |

**关键**：复杂度从"过度设计"降低到"恰到好处"

---

## 实施计划调整

需要在原计划中增加：

### 阶段 1.5: 视频 API 集成（新增，1周）
**Task 1.5.1**: Replicate Provider（3-4天）
- [ ] 实现 ReplicateProvider 类
- [ ] API 认证和请求
- [ ] 异步任务轮询
- [ ] 视频下载和保存

**Task 1.5.2**: API 配置界面（2-3天）
- [ ] 命令：`Vibe Video: Configure API`
- [ ] 使用 QuickPick 选择 Provider
- [ ] 输入 API Key（保存到 Secret Storage）
- [ ] 测试连接

**Task 1.5.3**: 批量生成命令（2-3天）
- [ ] 命令：`Vibe Video: Generate All Videos`
- [ ] 读取所有分镜 JSON
- [ ] 批量调用 API（带进度）
- [ ] 显示成功/失败统计

### 调整后的总时间
- Week 1: 核心脚手架
- **Week 2: 视频 API 集成（新增）**
- Week 3: 资源管理与验证
- Week 4: 视频合成
- Week 5: 文档与发布

**Total: 5-6 周**（仍然比原方案快很多）

---

## 给用户的使用流程（修订版）

### 步骤 1: 初始化项目
```
用户：Ctrl+Shift+P → "Vibe Video: Initialize Project"
```

### 步骤 2: 生成分镜脚本
```
用户：Cursor AI Chat → "根据剧本.md 生成分镜脚本"
AI：生成 storyboards/*.json
```

### 步骤 3: 配置视频 AI（一次性）
```
用户：Ctrl+Shift+P → "Vibe Video: Configure API"
插件：选择 Provider（Replicate / Runway / Pika）
用户：输入 API Key
插件：验证并保存
```

### 步骤 4: 批量生成视频 ⭐
```
用户：Ctrl+Shift+P → "Vibe Video: Generate All Videos"
插件：读取所有分镜 → 调用 API → 显示进度
等待：几分钟到几十分钟（取决于数量）
插件：完成后通知 → 视频保存到 assets/clips/
```

### 步骤 5: 合成最终视频
```
用户：Ctrl+Shift+P → "Vibe Video: Compose Final Video"
插件：合成 → 保存到 output/final.mp4
```

---

## 总结

您的问题非常关键！修订后的方案：

### 保留的"轻量"部分
- ✅ 用 Cursor AI 生成分镜（不自己解析）
- ✅ 简单的项目结构
- ✅ 基础的验证工具

### 必须添加的"复杂"部分
- ⚠️ 视频 AI 的 API 集成（但保持简单）
- ⚠️ 异步任务管理（但不过度设计）

### 结论
这是一个**"恰到好处"的方案**：
- 不像原方案那样过度设计
- 但也不会简单到无法使用
- 在"轻量"和"实用"之间找到平衡

**开发时间：5-6周**（而不是最初的1个月，也不是原方案的3-4个月）

