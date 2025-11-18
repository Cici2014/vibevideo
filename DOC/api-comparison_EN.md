# Video Generation API Comparison: Replicate vs Tongyi Wanxiang

## Quick Conclusion

**MVP Stage Recommendation: Tongyi Wanxiang Wan2.5** ⭐

---

## Detailed Comparison

### Tongyi Wanxiang Wan2.5 (Alibaba Cloud)

#### Advantages ✅
1. **Domestic Service, Stable Network**
   - No VPN required
   - Fast API response
   - Suitable for Chinese users

2. **Excellent Chinese Support**
   - Native Chinese model
   - Good Chinese prompt effects
   - Documentation in Chinese

3. **Developer Friendly**
   - Alibaba Cloud account (many developers already have one)
   - Clear API documentation
   - Official Node.js SDK available

4. **Transparent Pricing**
   - Pay-per-use or monthly subscription
   - Free quota for new users
   - Relatively low prices

5. **Compliance**
   - Domestic service, data stays within China
   - Complies with domestic regulations

#### Disadvantages ⚠️
- Only supports Tongyi Wanxiang models (single vendor)
- Requires real-name verification (Alibaba Cloud account)

#### API Example
```typescript
import Wan2 from '@alicloud/wan2-sdk';

const client = new Wan2({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
});

// Generate video
const result = await client.generateVideo({
  prompt: 'A delicate coffee cup on a wooden table, soft morning light from the left window',
  duration: 5,
  resolution: '1280x720'
});

// Query status
const status = await client.queryTask(result.taskId);
```

#### Documentation
- [Tongyi Wanxiang Official Website](https://www.aliyun.com/product/tongyi/wanxiang)
- [API Documentation](https://help.aliyun.com/document_detail/...)

---

### Replicate

#### Advantages ✅
1. **Multiple Model Choices**
   - Zeroscope
   - AnimateDiff
   - ModelScope
   - Other open-source models

2. **International**
   - Good English content effects
   - Active community

3. **Developer Friendly**
   - Simple RESTful API
   - Official SDK available
   - Free quota (limited)

#### Disadvantages ⚠️
1. **Network Issues**
   - May be unstable in China
   - Requires proxy or VPN
   - Higher latency

2. **Chinese Support**
   - Some models have poor Chinese support
   - Need to translate prompts

3. **Payment**
   - Requires international credit card
   - Prices in USD

4. **Model Quality**
   - Open-source model quality varies
   - May require multiple attempts

#### API Example
```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: 'YOUR_API_TOKEN',
});

// Generate video
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

## Comparison Table

| Dimension | Tongyi Wanxiang Wan2.5 | Replicate |
|-----------|----------------------|-----------|
| **Network Stability** | ⭐⭐⭐⭐⭐ Domestic service | ⚠️⚠️ Requires stable international network |
| **Chinese Support** | ⭐⭐⭐⭐⭐ Native Chinese | ⚠️⚠️⚠️ Some models have poor support |
| **Development Difficulty** | ⭐⭐⭐⭐ Chinese docs and SDK | ⭐⭐⭐⭐ English docs |
| **Price** | ⭐⭐⭐⭐ Relatively cheap | ⭐⭐⭐ Pay-per-use |
| **Model Selection** | ⚠️⚠️ Single model | ⭐⭐⭐⭐⭐ Multiple models |
| **Video Quality** | ⭐⭐⭐⭐ Commercial-grade | ⭐⭐⭐ Open-source quality varies |
| **Account Registration** | ⭐⭐⭐ Requires Alibaba Cloud account | ⭐⭐⭐⭐ Simple |
| **Payment Method** | ⭐⭐⭐⭐⭐ Alipay/WeChat | ⚠️⚠️ Requires international credit card |
| **Compliance** | ⭐⭐⭐⭐⭐ Domestic service | ⚠️ Data leaves country |

---

## MVP Stage Recommendation

### Recommended: Tongyi Wanxiang Wan2.5 ⭐

**Reasons**:

1. **Target Users are Chinese Developers**
   - No network access barriers
   - Documentation and support in Chinese
   - Convenient payment

2. **Scripts are Likely in Chinese**
   - Storyboard descriptions are in Chinese
   - Tongyi Wanxiang understands Chinese better
   - No need to translate prompts

3. **Quick Idea Validation**
   - MVP goal is rapid validation
   - Avoid network and payment barriers
   - Lower user adoption threshold

4. **Lower Cost**
   - Free quota for new users
   - Relatively cheap prices
   - Suitable for initial testing

5. **Extensibility**
   - Code maintains Provider interface
   - Can easily add Replicate later
   - Doesn't affect architecture design

---

## Implementation Recommendations

### MVP (First Version)
```
Only support: Tongyi Wanxiang Wan2.5
```

**Code Structure**:
```typescript
// Maintain interface design for easy future extension
interface VideoAIProvider {
  name: string;
  generateVideo(prompt: string, options: VideoOptions): Promise<string>;
  checkStatus(taskId: string): Promise<TaskStatus>;
  downloadVideo(taskId: string, savePath: string): Promise<void>;
}

// MVP only implements this one
class TongyiWanxiangProvider implements VideoAIProvider {
  // Implementation...
}
```

### V1.1 (Optional)
```
Add: Replicate (for international users)
```

### V2.0 (Future)
```
More options:
- Runway Gen-3
- Pika Labs
- Luma Dream Machine
```

---

## Technical Implementation Comparison

### Tongyi Wanxiang Implementation Complexity: ⭐⭐⭐ (Simple)

```typescript
// Alibaba Cloud has official SDK
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
    
    // Download video
    const response = await fetch(status.videoUrl);
    const buffer = await response.buffer();
    await fs.promises.writeFile(savePath, buffer);
  }
}
```

### Replicate Implementation Complexity: ⭐⭐⭐⭐ (Slightly Complex)

```typescript
import Replicate from 'replicate';

class ReplicateProvider implements VideoAIProvider {
  private client: Replicate;
  
  constructor(apiToken: string) {
    this.client = new Replicate({ auth: apiToken });
  }
  
  async generateVideo(prompt: string, options: VideoOptions): Promise<string> {
    // Need to select specific model
    const prediction = await this.client.predictions.create({
      version: "model-version-hash",
      input: {
        prompt,
        // Different models have different parameters, need adaptation
      }
    });
    return prediction.id;
  }
  
  async checkStatus(taskId: string): Promise<TaskStatus> {
    const prediction = await this.client.predictions.get(taskId);
    // Need to handle different status mappings
    return {
      status: this.mapStatus(prediction.status),
      progress: this.calculateProgress(prediction),
      videoUrl: prediction.output?.[0], // Return format may differ
    };
  }
  
  // More adaptation code...
}
```

---

## Dependency Updates

### If Choosing Tongyi Wanxiang

```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "@alicloud/wan2-sdk": "^1.0.0"  // ⭐ Add Tongyi Wanxiang SDK
  }
}
```

### If Choosing Replicate

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

## User Configuration Interface

### Tongyi Wanxiang Configuration
```
Command: Vibe Video: Configure Video AI

1. Select Provider: [Tongyi Wanxiang] [Replicate]
   → Select: Tongyi Wanxiang

2. Enter Access Key ID: 
   → Enter: LTAI5t...

3. Enter Access Key Secret:
   → Enter: (password mode)

4. Test connection...
   ✓ Connection successful! Configuration saved.
```

### Key Retrieval Guide
```
Extension prompt:
"Please visit https://ram.console.aliyun.com/manage/ak
Log in to Alibaba Cloud console to get Access Key"

[Open Link] [Configure Later]
```

---

## Migration Path (If Needed)

If you want to migrate from Tongyi Wanxiang to Replicate later, it's very easy:

```typescript
// User's project configuration
{
  "videoProvider": "tongyi-wanxiang",  // Change to "replicate" to switch
  "tongyiConfig": { ... },
  "replicateConfig": { ... }
}

// In code
const provider = config.videoProvider === 'tongyi-wanxiang'
  ? new TongyiWanxiangProvider(...)
  : new ReplicateProvider(...);
```

---

## Summary

| Scenario | Recommendation |
|---------|---------------|
| **Mainly Chinese Users** | ⭐ Tongyi Wanxiang |
| **International Users** | Replicate |
| **Chinese Scripts** | ⭐ Tongyi Wanxiang |
| **English Scripts** | Replicate |
| **Quick MVP** | ⭐ Tongyi Wanxiang |
| **Model Selection Diversity** | Replicate |
| **High Network Stability Requirements** | ⭐ Tongyi Wanxiang |

**Final Recommendation: Use Tongyi Wanxiang for MVP, add Replicate support in V1.1**

This allows rapid validation while maintaining future extensibility.

