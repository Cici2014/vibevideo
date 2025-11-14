# 视频生成 API 对比：Replicate vs 通义万相

## 快速结论

**MVP 阶段推荐：通义万相 Wan2.5** ⭐

---

## 详细对比

### 通义万相 Wan2.5 (阿里云)

#### 优势 ✅
1. **国内服务，网络稳定**
   - 无需翻墙
   - API 响应快
   - 适合中国用户

2. **中文支持优秀**
   - 原生中文模型
   - 中文提示词效果好
   - 文档是中文的

3. **开发友好**
   - 阿里云账号（很多开发者已有）
   - 清晰的 API 文档
   - 有官方 Node.js SDK

4. **价格透明**
   - 按次计费或包月
   - 新用户有免费额度
   - 价格相对较低

5. **合规性**
   - 国内服务，数据不出境
   - 符合国内法规

#### 劣势 ⚠️
- 只支持通义万相的模型（单一供应商）
- 需要实名认证（阿里云账号）

#### API 示例
```typescript
import Wan2 from '@alicloud/wan2-sdk';

const client = new Wan2({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
});

// 生成视频
const result = await client.generateVideo({
  prompt: '一个精致的咖啡杯放在木质桌面上，柔和的晨光从左侧窗户投射进来',
  duration: 5,
  resolution: '1280x720'
});

// 查询状态
const status = await client.queryTask(result.taskId);
```

#### 文档
- [通义万相官网](https://www.aliyun.com/product/tongyi/wanxiang)
- [API 文档](https://help.aliyun.com/document_detail/...)

---

### Replicate

#### 优势 ✅
1. **模型选择多**
   - Zeroscope
   - AnimateDiff
   - ModelScope
   - 其他开源模型

2. **国际化**
   - 英文内容效果好
   - 社区活跃

3. **开发者友好**
   - RESTful API 简单
   - 有官方 SDK
   - 免费额度（少量）

#### 劣势 ⚠️
1. **网络问题**
   - 在中国访问可能不稳定
   - 需要代理或VPN
   - 延迟较高

2. **中文支持**
   - 某些模型对中文支持不佳
   - 需要翻译提示词

3. **支付**
   - 需要国际信用卡
   - 价格以美元计费

4. **模型质量**
   - 开源模型质量参差不齐
   - 可能需要多次尝试

#### API 示例
```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: 'YOUR_API_TOKEN',
});

// 生成视频
const output = await replicate.run(
  "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
  {
    input: {
      prompt: "A delicate coffee cup on a wooden table, soft morning light from the left window"
    }
  }
);
```

---

## 对比表格

| 维度 | 通义万相 Wan2.5 | Replicate |
|-----|---------------|-----------|
| **网络稳定性** | ⭐⭐⭐⭐⭐ 国内服务 | ⚠️⚠️ 需要稳定国际网络 |
| **中文支持** | ⭐⭐⭐⭐⭐ 原生中文 | ⚠️⚠️⚠️ 部分模型支持差 |
| **开发难度** | ⭐⭐⭐⭐ 有中文文档和SDK | ⭐⭐⭐⭐ 英文文档 |
| **价格** | ⭐⭐⭐⭐ 相对便宜 | ⭐⭐⭐ 按使用计费 |
| **模型选择** | ⚠️⚠️ 单一模型 | ⭐⭐⭐⭐⭐ 多种模型 |
| **视频质量** | ⭐⭐⭐⭐ 商业级 | ⭐⭐⭐ 开源模型质量不一 |
| **账号注册** | ⭐⭐⭐ 需要阿里云账号 | ⭐⭐⭐⭐ 简单 |
| **支付方式** | ⭐⭐⭐⭐⭐ 支付宝/微信 | ⚠️⚠️ 需要国际信用卡 |
| **合规性** | ⭐⭐⭐⭐⭐ 国内服务 | ⚠️ 数据出境 |

---

## MVP 阶段建议

### 推荐：通义万相 Wan2.5 ⭐

**理由**：

1. **目标用户是中国开发者**
   - 网络访问无障碍
   - 文档和支持都是中文
   - 支付方便

2. **剧本大概率是中文**
   - 分镜描述是中文
   - 通义万相对中文理解更好
   - 无需翻译提示词

3. **快速验证想法**
   - MVP 的目标是快速验证
   - 避免网络和支付的阻碍
   - 降低用户使用门槛

4. **成本更低**
   - 新用户有免费额度
   - 价格相对便宜
   - 适合初期测试

5. **扩展性**
   - 代码保持 Provider 接口
   - 以后可以轻松添加 Replicate
   - 不影响架构设计

---

## 实施建议

### MVP (第一版)
```
只支持：通义万相 Wan2.5
```

**代码结构**：
```typescript
// 保持接口设计，方便未来扩展
interface VideoAIProvider {
  name: string;
  generateVideo(prompt: string, options: VideoOptions): Promise<string>;
  checkStatus(taskId: string): Promise<TaskStatus>;
  downloadVideo(taskId: string, savePath: string): Promise<void>;
}

// MVP 只实现这一个
class TongyiWanxiangProvider implements VideoAIProvider {
  // 实现...
}
```

### V1.1 (可选)
```
添加：Replicate (供国际用户选择)
```

### V2.0 (未来)
```
更多选择：
- Runway Gen-3
- Pika Labs
- Luma Dream Machine
```

---

## 技术实现对比

### 通义万相实现复杂度：⭐⭐⭐ (简单)

```typescript
// 阿里云有官方 SDK
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
      prompt,
      duration: options.duration || 5,
      resolution: options.resolution || '1280x720',
    });
    return result.taskId;
  }
  
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const result = await this.client.queryTask(taskId);
    return {
      status: result.status, // 'pending' | 'processing' | 'completed' | 'failed'
      progress: result.progress,
      videoUrl: result.videoUrl,
    };
  }
  
  async downloadVideo(taskId: string, savePath: string): Promise<void> {
    const status = await this.checkStatus(taskId);
    if (status.status !== 'completed') {
      throw new Error('Video not ready');
    }
    
    // 下载视频
    const response = await fetch(status.videoUrl);
    const buffer = await response.buffer();
    await fs.promises.writeFile(savePath, buffer);
  }
}
```

### Replicate 实现复杂度：⭐⭐⭐⭐ (稍复杂)

```typescript
import Replicate from 'replicate';

class ReplicateProvider implements VideoAIProvider {
  private client: Replicate;
  
  constructor(apiToken: string) {
    this.client = new Replicate({ auth: apiToken });
  }
  
  async generateVideo(prompt: string, options: VideoOptions): Promise<string> {
    // 需要选择具体的模型
    const prediction = await this.client.predictions.create({
      version: "模型版本hash",
      input: {
        prompt,
        // 不同模型参数不同，需要适配
      }
    });
    return prediction.id;
  }
  
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const prediction = await this.client.predictions.get(taskId);
    // 需要处理不同状态的映射
    return {
      status: this.mapStatus(prediction.status),
      progress: this.calculateProgress(prediction),
      videoUrl: prediction.output?.[0], // 返回格式可能不同
    };
  }
  
  // 更多适配代码...
}
```

---

## 依赖更新

### 如果选择通义万相

```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "@alicloud/wan2-sdk": "^1.0.0"  // ⭐ 添加通义万相 SDK
  }
}
```

### 如果选择 Replicate

```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "replicate": "^0.25.0"
  }
}
```

---

## 用户配置界面

### 通义万相配置
```
命令：Vibe Video: Configure Video AI

1. 选择 Provider: [通义万相] [Replicate]
   → 选择：通义万相

2. 输入 Access Key ID: 
   → 输入：LTAI5t...

3. 输入 Access Key Secret:
   → 输入：(密码模式)

4. 测试连接...
   ✓ 连接成功！已保存配置。
```

### 获取 Key 的引导
```
插件提示：
"请访问 https://ram.console.aliyun.com/manage/ak
登录阿里云控制台获取 Access Key"

[打开链接] [稍后配置]
```

---

## 迁移路径（如果需要）

如果以后想从通义万相迁移到 Replicate，非常容易：

```typescript
// 用户的项目配置
{
  "videoProvider": "tongyi-wanxiang",  // 改成 "replicate" 即可
  "tongyiConfig": { ... },
  "replicateConfig": { ... }
}

// 代码中
const provider = config.videoProvider === 'tongyi-wanxiang'
  ? new TongyiWanxiangProvider(...)
  : new ReplicateProvider(...);
```

---

## 总结

| 场景 | 推荐 |
|-----|-----|
| **中国用户为主** | ⭐ 通义万相 |
| **国际用户** | Replicate |
| **中文剧本** | ⭐ 通义万相 |
| **英文剧本** | Replicate |
| **快速 MVP** | ⭐ 通义万相 |
| **模型选择多样性** | Replicate |
| **网络稳定性要求高** | ⭐ 通义万相 |

**最终建议：MVP 用通义万相，V1.1 添加 Replicate 支持**

这样既能快速验证，又保持了未来的扩展性。

