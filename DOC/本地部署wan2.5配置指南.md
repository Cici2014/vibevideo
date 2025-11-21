# 本地部署 Wan2.5 配置指南

## 📋 概述

如果您已经本地部署了通义万相 Wan2.5 模型服务，可以通过配置自定义 API 地址来让 Vibe Video 扩展使用本地服务，而不是调用阿里云的云端 API。

**优势**：
- ✅ 数据不出本地，隐私性更好
- ✅ 无需网络请求，响应更快
- ✅ 不受云端 API 配额限制
- ✅ 可以自定义模型参数

---

## 🚀 前置条件

### 1. 已部署本地 Wan2.5 服务

确保您已经成功部署了兼容 DashScope API 格式的本地服务，服务应该：

- 提供 HTTP API 接口
- 支持 DashScope API 格式的请求
- 监听在某个端口（例如：`http://localhost:8000`）

### 2. 验证本地服务可用

使用 curl 或 Postman 测试本地服务：

```bash
# 测试文生图接口
curl -X POST http://localhost:8000/v1/services/aigc/text2image/image-synthesis \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "wan2.5-t2i-preview",
    "input": {
      "prompt": "测试图片"
    },
    "parameters": {
      "size": "1280*720",
      "n": 1
    }
  }'
```

如果返回任务 ID 或图片 URL，说明服务正常。

---

## ⚙️ 配置步骤

### 方法 1：通过 VS Code 设置界面（推荐）

1. **打开设置**
   ```
   Ctrl+, （或 Cmd+, on Mac）
   ```

2. **搜索配置项**
   - 在搜索框输入：`vibevideo`
   - 找到 **Dashscope: Base Url** 配置项

3. **填写本地服务地址**
   ```
   http://localhost:8000/v1/services/aigc
   ```
   
   **注意**：
   - 如果您的本地服务路径不同，请根据实际情况调整
   - 确保包含完整的路径：`/v1/services/aigc`
   - 如果使用 HTTPS，请使用 `https://` 协议

4. **配置 API Key**
   - 在 **Dashscope: Api Key** 中填写您的 API Key
   - 如果本地服务不需要认证，可以填写任意值（但建议仍使用有效的 Key 格式）

5. **保存配置**
   - 设置会自动保存
   - 无需重启 VS Code

### 方法 2：直接编辑 settings.json

1. **打开设置文件**
   ```
   Ctrl+Shift+P → "Preferences: Open User Settings (JSON)"
   ```

2. **添加配置**
   ```json
   {
     "vibevideo.dashscope.apiKey": "YOUR_API_KEY",
     "vibevideo.dashscope.baseUrl": "http://localhost:8000/v1/services/aigc"
   }
   ```

3. **保存文件**
   - `Ctrl+S` 保存

---

## 🔍 验证配置

### 方法 1：查看当前配置

```
Ctrl+Shift+P → "Vibe Video: Show Current Config"
```

应该显示：
```
当前 Provider: tongyi-wanxiang
状态: ✓ 已配置
API Key: sk-xxxxx...
Base URL: http://localhost:8000/v1/services/aigc
```

### 方法 2：测试生成功能

1. **生成首帧图片**
   ```
   Ctrl+Shift+P → "Vibe Video: Generate First Frames"
   ```

2. **查看输出日志**
   - 打开 VS Code 输出面板（`Ctrl+Shift+U`）
   - 选择 "Vibe Video" 输出通道
   - 查看 API 请求日志，确认请求发送到了本地地址

3. **检查请求地址**
   日志中应该显示：
   ```
   [API] 文生图请求: { url: 'http://localhost:8000/v1/services/aigc/text2image/image-synthesis', ... }
   ```

---

## 📝 配置示例

### 示例 1：本地 Docker 部署

```json
{
  "vibevideo.dashscope.apiKey": "sk-local-test-key",
  "vibevideo.dashscope.baseUrl": "http://localhost:8000/v1/services/aigc"
}
```

### 示例 2：局域网内其他服务器

```json
{
  "vibevideo.dashscope.apiKey": "sk-local-test-key",
  "vibevideo.dashscope.baseUrl": "http://192.168.1.100:8000/v1/services/aigc"
}
```

### 示例 3：使用 HTTPS 的本地服务

```json
{
  "vibevideo.dashscope.apiKey": "sk-local-test-key",
  "vibevideo.dashscope.baseUrl": "https://localhost:8443/v1/services/aigc"
}
```

---

## 🤖 AI Provider 和模型支持情况

### 📊 支持的 Provider 列表

Vibe Video 目前支持以下 AI Provider：

| Provider | 状态 | 测试情况 | 说明 |
|---------|------|---------|------|
| **通义万相 (Tongyi Wanxiang)** | ✅ 生产就绪 | ✅ **已测试** | 默认 Provider，功能完整，推荐使用 |
| **硅基流动 (SiliconFlow)** | ⚠️ 开发完成 | ❌ 未测试 | 已实现，但未进行实际测试 |
| **Replicate** | ⚠️ 开发完成 | ❌ 未测试 | 已实现，但未进行实际测试 |
| **Google Gemini** | ⚠️ 开发完成 | ❌ 未测试 | 已实现，但未进行实际测试 |

**注意**：
- ✅ **已测试**：表示已通过实际 API 调用测试，功能正常
- ❌ **未测试**：表示代码已实现，但尚未进行实际 API 测试，可能存在未知问题
- 建议优先使用 **通义万相**，这是唯一经过完整测试的 Provider

---

### 🎯 通义万相（DashScope）- 已测试 ✅

使用通义万相 API 时，以下模型用于不同的生成任务：

| 任务类型 | 模型 | 说明 | 测试状态 |
|---------|------|------|---------|
| **文生图** | `wan2.5-t2i-preview` | 从文本提示词生成图片（用于主体、场景、首帧） | ✅ 已测试 |
| **图生图** | `wan2.5-i2i-preview` | 多图合成（用于主体+场景合成） | ✅ 已测试 |
| **文生视频** | `wan2.5-i2v-preview` | 直接从文本提示词生成视频 | ✅ 已测试 |
| **图生视频** | `wan2.5-i2v-preview` | 从首帧图片生成视频 | ✅ 已测试 |
| **首尾帧生视频** | `wan2.2-kf2v-flash` | 从首帧和尾帧图片生成视频（用于精确控制） | ✅ 已测试 |

**本地部署配置**：如果使用本地部署的 Wan2.5 服务，确保您的服务支持所有这些模型。

---

### 🔬 硅基流动 (SiliconFlow) - 未测试 ⚠️

| 任务类型 | 默认模型 | 说明 | 测试状态 |
|---------|---------|------|---------|
| **文生图** | `Qwen/Qwen-Image` | 从文本提示词生成图片 | ❌ 未测试 |
| **图生视频** | `Wan-AI/Wan2.1-I2V-14B-720P` | 从首帧图片生成视频 | ❌ 未测试 |
| **文生视频** | `Wan-AI/Wan2.2-T2V-A14B` | 从文本提示词生成视频 | ❌ 未测试 |

**支持的模型**：
- 图像生成：`Qwen/Qwen-Image`、`Kwai-Kolors/Kolors` 等
- 图生视频：`Wan-AI/Wan2.1-I2V-14B-720P`、`Wan-AI/Wan2.1-I2V-14B-720P-Turbo`
- 文生视频：`Wan-AI/Wan2.2-T2V-A14B`、`Wan-AI/Wan2.1-T2V-14B`、`Wan-AI/Wan2.1-T2V-14B-Turbo`

---

### 🌐 Replicate - 未测试 ⚠️

| 任务类型 | 默认模型 | 说明 | 测试状态 |
|---------|---------|------|---------|
| **文生图** | `stability-ai/sdxl` | 从文本提示词生成图片 | ❌ 未测试 |
| **图生视频** | `anotherjesse/zeroscope-v2-xl` | 从首帧图片生成视频 | ❌ 未测试 |
| **文生视频** | `anotherjesse/zeroscope-v2-xl` | 从文本提示词生成视频 | ❌ 未测试 |

**注意**：Replicate 支持自定义模型，可以在设置中配置其他模型。

---

### 🔷 Google Gemini - 未测试 ⚠️

| 任务类型 | 默认模型 | 说明 | 测试状态 |
|---------|---------|------|---------|
| **文生图** | `gemini-3-pro-image-preview` | 从文本提示词生成图片 | ❌ 未测试 |
| **图生视频** | `veo-3` | 从首帧图片生成视频 | ❌ 未测试 |
| **文生视频** | `veo-3` | 从文本提示词生成视频 | ❌ 未测试 |

**支持的模式**：
- Google AI Studio（默认）：使用 API Key，适合个人开发者
- Vertex AI（可选）：需要 Google Cloud 项目，适合企业用户

---

## ⚠️ 测试状态说明

**当前测试情况**：
- ✅ **通义万相 (Tongyi Wanxiang)**：已通过完整测试，所有功能正常
- ❌ **其他 Provider**：代码已实现，但尚未进行实际 API 测试

**使用建议**：
1. **生产环境**：强烈建议使用 **通义万相**，这是唯一经过完整测试的 Provider
2. **测试环境**：可以尝试其他 Provider，但请注意：
   - 可能遇到未发现的 bug
   - API 格式可能与预期不符
   - 功能可能不完整
   - 如发现问题，欢迎提交 Issue 反馈

**贡献测试**：如果您测试了其他 Provider 并发现问题，欢迎：
- 提交 Issue 报告问题
- 提交 Pull Request 修复问题
- 分享测试结果和使用经验

---

## 🛠️ API 路径要求

本地服务需要实现以下 API 端点：

### 1. 文生图接口
```
POST /v1/services/aigc/text2image/image-synthesis
```

### 2. 图生视频接口
```
POST /v1/services/aigc/video-generation/video-synthesis
```

### 3. 任务查询接口
```
GET /v1/tasks/{task_id}
```

### 4. 多图合成接口（可选）
```
POST /v1/services/aigc/multimodal-generation/generation
```

**注意**：如果您的本地服务路径结构不同，需要调整 `baseUrl` 配置，确保拼接后的完整路径正确。

---

## 🔧 常见问题

### Q1: 配置后仍然调用云端 API？

**A**: 检查以下几点：
1. 确认 `baseUrl` 配置已保存（查看 settings.json）
2. 确认配置格式正确（包含完整路径）
3. 重启 VS Code 后重试
4. 查看输出日志确认实际请求地址

### Q2: 本地服务返回 404 错误？

**A**: 可能的原因：
1. `baseUrl` 路径不正确，检查本地服务的实际路径
2. 本地服务未实现对应的 API 端点
3. 路径拼接错误，查看日志中的完整 URL

### Q3: 如何切换回云端 API？

**A**: 两种方法：
1. **删除 baseUrl 配置**：在设置中清空 `Dashscope: Base Url` 字段
2. **设置为空字符串**：在 settings.json 中设置为 `""` 或删除该配置项

### Q4: 本地服务需要认证吗？

**A**: 
- 如果本地服务需要认证，确保 API Key 配置正确
- 如果不需要认证，可以填写任意符合格式的 Key（如 `sk-local-test`）
- 扩展会使用 Bearer Token 方式发送认证：`Authorization: Bearer {apiKey}`

### Q5: 支持哪些本地部署方案？

**A**: 理论上支持任何兼容 DashScope API 格式的服务，包括：
- Docker 容器部署
- 本地 Python/Node.js 服务
- 通过代理转发的服务
- 局域网内的其他服务器

---

## 📚 相关文档

- [DashScope API 文档](https://help.aliyun.com/zh/dashscope/)
- [API Key 获取指南](./API-KEY-获取指南.md)
- [API 对比分析](./api-comparison.md)

---

## 🎊 总结

配置本地部署的 Wan2.5 只需 3 步：

```
1. 确保本地服务已部署并运行
2. 在 VS Code 设置中配置 baseUrl
3. 测试生成功能验证配置
```

**配置完成后，所有 API 请求都会发送到您的本地服务！** 🎬

