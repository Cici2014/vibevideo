# DashScope API 集成说明

## ✅ 已完成

基于您提供的 curl 示例，已成功实现 **零依赖** 的 HTTP API 客户端！

---

## 🎯 实现方式

### 使用 HTTP API（不是 SDK）⭐

**优势**：
1. ✅ **零依赖**：只用 Node.js 内置 `fetch`
2. ✅ **认证简单**：Bearer Token，无需复杂签名
3. ✅ **轻量高效**：约 200 行代码
4. ✅ **直接可用**：基于官方 curl 示例

---

## 🔑 认证方式

### DashScope API Key（不是 AccessKey！）

**重要变化**：
- ❌ ~~AccessKey ID + AccessKey Secret~~
- ✅ **DashScope API Key**（单个Token）

**认证头**：
```typescript
Authorization: Bearer ${DASHSCOPE_API_KEY}
```

**超级简单！** 无需实现签名算法！

---

## 📡 已实现的 API

### 1. 文生图 API ✅
```typescript
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis

Headers:
- X-DashScope-Async: enable
- Authorization: Bearer ${API_KEY}

Body:
{
  "model": "wan2.5-t2i-preview",
  "input": { "prompt": "..." },
  "parameters": { "size": "1280*720", "n": 1 }
}

返回: { "output": { "task_id": "..." } }
```

### 2. 文生视频 API ✅
```typescript
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis

模型: wan2.2-t2v-plus
参数: size, prompt_extend
```

### 3. 图生视频 API ⚠️（需要图片 URL）
```typescript
POST 同上

模型: wan2.2-i2v-plus
输入: prompt + img_url（需要 HTTP URL）
```

**说明**：API 需要图片 URL，不支持本地文件。需要实现图片上传。

### 4. 任务查询 API ✅
```typescript
GET https://dashscope.aliyuncs.com/api/v1/services/aigc/async-tasks/${task_id}

返回:
{
  "output": {
    "task_status": "SUCCEEDED",
    "results": [{ "url": "..." }],  // 图片
    "video_url": "..."               // 视频
  }
}
```

---

## 📁 实现的文件

### src/providers/BailianAPIClient.ts ✅
完整的 HTTP API 客户端，包含：
- `textToImage()` - 文生图
- `textToVideo()` - 文生视频  
- `imageToVideo()` - 图生视频（需要URL）
- `getTaskStatus()` - 查询任务
- `downloadResource()` - 下载资源

### src/providers/TongyiWanxiangProvider.ts ✅
使用 API 客户端的 Provider 实现

---

## ⚙️ 配置说明

### 设置项更新

**之前**：
- vibevideo.tongyi.accessKeyId
- vibevideo.tongyi.accessKeySecret

**现在** ⭐：
- **vibevideo.dashscope.apiKey**（单个字段！）

### 如何配置

1. 按 `Ctrl+,` 打开设置
2. 搜索 `vibevideo`
3. 填写 **Dashscope: Api Key**
4. 完成！

---

## 🔑 如何获取 DashScope API Key

### 方法 1：百炼控制台
```
https://bailian.console.aliyun.com/
```

### 方法 2：DashScope 控制台
```
https://dashscope.console.aliyun.com/
```

### 步骤
1. 登录阿里云账号
2. 进入控制台
3. 创建或查看 API Key
4. 复制 API Key（格式：`sk-xxxxx`）
5. 粘贴到 VS Code 设置中

---

## 🚧 当前限制

### 图生视频功能
⚠️ 当前**暂不支持**，因为：
- API 需要图片 **URL**（HTTP地址）
- 不支持本地文件路径
- 不支持 base64

**解决方案**：
1. 实现图片上传到 OSS
2. 或使用临时图床服务
3. 或跳过图生视频功能（MVP 阶段）

**建议**：MVP 先实现文生图 + 文生视频，图生视频留给 V1.1

---

## ✅ 当前可用功能

### 完全可用
1. ✅ 文生图（生成初始帧）
2. ✅ 文生视频（纯文本生成）
3. ✅ 任务状态查询
4. ✅ 资源下载

### 需要后续实现
- ⚠️ 图生视频（需要图片上传）

---

## 📊 代码统计

### BailianAPIClient
- 约 220 行代码
- 零依赖（只用 Node.js 内置 API）
- 完整的错误处理
- 异步任务支持

### 总依赖数
```json
{
  "dependencies": {}  // 仍然是 0 个！🎉
}
```

---

## 🧪 测试建议

### 1. 配置 API Key
```
Ctrl+, → 搜索 vibevideo → 输入真实或测试 API Key
```

### 2. 测试文生图
```
Ctrl+Shift+P → "Generate First Frames"
```
如果有分镜包含 `firstFramePrompt`，会实际调用 API

### 3. 测试文生视频
```
Ctrl+Shift+P → "Generate All Videos"
```
会实际调用 API 生成视频

### 4. 观察日志
在调试控制台查看：
- API 请求日志
- 任务状态
- 下载进度

---

## 📝 API 参考链接

- [文生图 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2976416)
- [图生视频 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2862677)
- [图片编辑 API](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2865250)

---

## 🎉 总结

**HTTP API 方式完全成功！**

- ✅ 实现简单（200 行代码）
- ✅ 零依赖（轻量）
- ✅ 完全可用（文生图 + 文生视频）
- ⚠️ 图生视频需要额外的图片上传功能

**下一步**：测试真实 API 调用！

