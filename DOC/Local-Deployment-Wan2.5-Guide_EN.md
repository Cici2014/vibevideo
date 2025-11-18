# Local Deployment Wan2.5 Configuration Guide

## 📋 Overview

If you have deployed Tongyi Wanxiang Wan2.5 model service locally, you can configure a custom API address to make Vibe Video extension use your local service instead of calling Alibaba Cloud's cloud API.

**Advantages**:
- ✅ Data stays local, better privacy
- ✅ No network requests, faster response
- ✅ Not limited by cloud API quotas
- ✅ Can customize model parameters

---

## 🚀 Prerequisites

### 1. Local Wan2.5 Service Deployed

Ensure you have successfully deployed a local service compatible with DashScope API format. The service should:

- Provide HTTP API interface
- Support DashScope API format requests
- Listen on a port (e.g., `http://localhost:8000`)

### 2. Verify Local Service is Available

Test the local service using curl or Postman:

```bash
# Test text-to-image interface
curl -X POST http://localhost:8000/v1/services/aigc/text2image/image-synthesis \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "wan2.5-t2i-preview",
    "input": {
      "prompt": "test image"
    },
    "parameters": {
      "size": "1280*720",
      "n": 1
    }
  }'
```

If it returns a task ID or image URL, the service is working correctly.

---

## ⚙️ Configuration Steps

### Method 1: Through VS Code Settings UI (Recommended)

1. **Open Settings**
   ```
   Ctrl+, (or Cmd+, on Mac)
   ```

2. **Search for Configuration**
   - Type in search box: `vibevideo`
   - Find **Dashscope: Base Url** configuration item

3. **Enter Local Service Address**
   ```
   http://localhost:8000/v1/services/aigc
   ```
   
   **Note**:
   - If your local service path is different, adjust accordingly
   - Ensure the full path is included: `/v1/services/aigc`
   - If using HTTPS, use `https://` protocol

4. **Configure API Key**
   - Enter your API Key in **Dashscope: Api Key**
   - If local service doesn't require authentication, you can enter any value (but recommend using valid Key format)

5. **Save Configuration**
   - Settings are saved automatically
   - No need to restart VS Code

### Method 2: Directly Edit settings.json

1. **Open Settings File**
   ```
   Ctrl+Shift+P → "Preferences: Open User Settings (JSON)"
   ```

2. **Add Configuration**
   ```json
   {
     "vibevideo.dashscope.apiKey": "YOUR_API_KEY",
     "vibevideo.dashscope.baseUrl": "http://localhost:8000/v1/services/aigc"
   }
   ```

3. **Save File**
   - `Ctrl+S` to save

---

## 🔍 Verify Configuration

### Method 1: View Current Configuration

```
Ctrl+Shift+P → "Vibe Video: Show Current Config"
```

Should display:
```
Current Provider: tongyi-wanxiang
Status: ✓ Configured
API Key: sk-xxxxx...
Base URL: http://localhost:8000/v1/services/aigc
```

### Method 2: Test Generation Function

1. **Generate First Frame Image**
   ```
   Ctrl+Shift+P → "Vibe Video: Generate First Frames"
   ```

2. **View Output Logs**
   - Open VS Code Output panel (`Ctrl+Shift+U`)
   - Select "Vibe Video" output channel
   - Check API request logs to confirm requests are sent to local address

3. **Check Request Address**
   Logs should show:
   ```
   [API] 文生图请求: { url: 'http://localhost:8000/v1/services/aigc/text2image/image-synthesis', ... }
   ```

---

## 📝 Configuration Examples

### Example 1: Local Docker Deployment

```json
{
  "vibevideo.dashscope.apiKey": "sk-local-test-key",
  "vibevideo.dashscope.baseUrl": "http://localhost:8000/v1/services/aigc"
}
```

### Example 2: Other Server on LAN

```json
{
  "vibevideo.dashscope.apiKey": "sk-local-test-key",
  "vibevideo.dashscope.baseUrl": "http://192.168.1.100:8000/v1/services/aigc"
}
```

### Example 3: Local Service Using HTTPS

```json
{
  "vibevideo.dashscope.apiKey": "sk-local-test-key",
  "vibevideo.dashscope.baseUrl": "https://localhost:8443/v1/services/aigc"
}
```

---

## 🛠️ API Path Requirements

Local service needs to implement the following API endpoints:

### 1. Text-to-Image Interface
```
POST /v1/services/aigc/text2image/image-synthesis
```

### 2. Image-to-Video Interface
```
POST /v1/services/aigc/video-generation/video-synthesis
```

### 3. Task Query Interface
```
GET /v1/tasks/{task_id}
```

### 4. Multi-Image Composition Interface (Optional)
```
POST /v1/services/aigc/multimodal-generation/generation
```

**Note**: If your local service path structure is different, you need to adjust the `baseUrl` configuration to ensure the complete path after concatenation is correct.

---

## 🔧 Frequently Asked Questions

### Q1: Still calling cloud API after configuration?

**A**: Check the following:
1. Confirm `baseUrl` configuration is saved (check settings.json)
2. Confirm configuration format is correct (includes full path)
3. Restart VS Code and try again
4. Check output logs to confirm actual request address

### Q2: Local service returns 404 error?

**A**: Possible reasons:
1. `baseUrl` path is incorrect, check actual path of local service
2. Local service doesn't implement corresponding API endpoints
3. Path concatenation error, check complete URL in logs

### Q3: How to switch back to cloud API?

**A**: Two methods:
1. **Delete baseUrl configuration**: Clear `Dashscope: Base Url` field in settings
2. **Set to empty string**: Set to `""` or delete the configuration item in settings.json

### Q4: Does local service require authentication?

**A**: 
- If local service requires authentication, ensure API Key is configured correctly
- If authentication is not required, you can enter any value that matches the format (e.g., `sk-local-test`)
- Extension will send authentication using Bearer Token: `Authorization: Bearer {apiKey}`

### Q5: What local deployment solutions are supported?

**A**: Theoretically supports any service compatible with DashScope API format, including:
- Docker container deployment
- Local Python/Node.js service
- Services forwarded through proxy
- Other servers on LAN

---

## 📚 Related Documentation

- [DashScope API Documentation](https://help.aliyun.com/zh/dashscope/)
- [API Key Guide](./API-KEY-Guide_EN.md)
- [API Comparison](./api-comparison_EN.md)

---

## 🎊 Summary

Configuring locally deployed Wan2.5 only takes 3 steps:

```
1. Ensure local service is deployed and running
2. Configure baseUrl in VS Code settings
3. Test generation function to verify configuration
```

**After configuration, all API requests will be sent to your local service!** 🎬

