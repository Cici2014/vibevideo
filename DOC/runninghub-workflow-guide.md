# RunningHub 多角度首帧生成工作流创建指南

本指南将帮助你一步一步在 RunningHub 平台上创建一个用于生成多角度首帧的工作流。

## 工作流需求

这个工作流需要：
1. **接收图片输入**：首帧图片（通过 API 上传）
2. **接收提示词输入**：角度转换提示词（如 "Next Scene: 将镜头转为俯视"）
3. **使用 Qwen-Image-Edit 模型**：进行图像编辑，生成不同角度的图片
4. **输出生成的图片**：保存并返回结果

## 创建步骤

### 步骤 1：登录 RunningHub 平台

1. 访问 [RunningHub 官网](https://www.runninghub.cn/)
2. 登录你的账号（如果没有账号，先注册）

### 步骤 2：进入工作台

1. 点击顶部导航栏的 **"工作台"** 或 **"工作流"**
2. 点击 **"新建工作流"** 或 **"创建"** 按钮

### 步骤 3：添加节点

按照以下顺序添加和连接节点：

#### 3.1 添加图片输入节点（LoadImage）

1. 在节点搜索框中输入 `LoadImage` 或 `加载图片`
2. 添加 `LoadImage` 节点
3. 这个节点用于接收通过 API 上传的首帧图片
4. **记录节点编号**：点击节点，查看节点编号（例如：`74`），稍后配置需要用到

#### 3.2 添加提示词编码节点（TextEncodeQwenImageEditPlus）

1. 在节点搜索框中输入 `TextEncodeQwenImageEditPlus` 或 `Qwen图像编辑提示词编码`
2. 添加 `TextEncodeQwenImageEditPlus` 节点
3. 这个节点用于编码角度转换提示词
4. **记录节点编号**：点击节点，查看节点编号（例如：`76`），稍后配置需要用到

#### 3.3 连接节点

1. 将 `LoadImage` 节点的输出连接到 `TextEncodeQwenImageEditPlus` 节点的图片输入
2. 将 `TextEncodeQwenImageEditPlus` 节点的文本输入留空（将通过 API 动态传入）

#### 3.4 添加 KSampler 节点（采样器）

1. 搜索并添加 `KSampler` 或 `KSamplerAdvanced` 节点
2. 这个节点用于控制生成过程
3. 建议配置：
   - `seed`: 随机（或通过 API 传入）
   - `steps`: 20-30（根据需求调整）
   - `cfg`: 7-9（根据需求调整）
   - `sampler_name`: 选择你喜欢的采样器（如 `euler`、`dpmpp_2m` 等）
   - `scheduler`: 选择调度器（如 `normal`、`karras` 等）

#### 3.5 添加模型加载节点（CheckpointLoaderSimple）

1. 搜索并添加 `CheckpointLoaderSimple` 节点
2. 选择适合图像编辑的模型，推荐：
   - 使用支持图像编辑的模型（如 Qwen 相关模型）
   - 或者使用 Stable Diffusion 模型配合 LoRA

#### 3.6 添加 LoRA 节点（可选，推荐）

如果你有 `next-scene_lora_v1-3000.safetensors` LoRA 文件：

1. 搜索并添加 `LoraLoader` 节点
2. 上传你的 LoRA 文件到 RunningHub
3. 配置 LoRA 强度（strength）：建议 0.7-1.0
4. 将 LoRA 节点连接到模型加载节点和 KSampler 节点之间

#### 3.7 添加 VAE 解码节点（VAEDecode）

1. 搜索并添加 `VAEDecode` 节点
2. 连接到 KSampler 的输出
3. 如果模型加载节点有 VAE 输出，连接到 VAE 解码节点

#### 3.8 添加图片保存节点（SaveImage）

1. 搜索并添加 `SaveImage` 节点
2. 连接到 VAE 解码节点的输出
3. 这个节点用于保存生成的图片

### 步骤 4：完整节点连接流程

确保节点按以下流程连接：

```
LoadImage (图片输入)
    ↓
TextEncodeQwenImageEditPlus (提示词编码)
    ↓
CheckpointLoaderSimple (模型加载)
    ↓
LoraLoader (LoRA，可选)
    ↓
KSampler (采样器)
    ↓
VAEDecode (VAE 解码)
    ↓
SaveImage (保存图片)
```

### 步骤 5：测试工作流

1. 点击工作流编辑器的 **"运行"** 按钮
2. 手动上传一张测试图片到 `LoadImage` 节点
3. 在 `TextEncodeQwenImageEditPlus` 节点输入测试提示词，例如：`Next Scene: 将镜头转为俯视`
4. 运行工作流，检查是否能正常生成图片
5. 如果生成效果不理想，调整 KSampler 的参数（steps、cfg 等）

### 步骤 6：保存工作流

1. 点击 **"保存"** 按钮
2. 给工作流起一个名字，例如：`多角度首帧生成`
3. 保存后，工作流会有一个唯一的 ID

### 步骤 7：获取工作流信息（用于配置）

1. 在工作流页面，查看 URL，例如：`https://www.runninghub.cn/workflow/1904136902449209346`
2. **工作流 ID** 就是 URL 末尾的数字：`1904136902449209346`

3. **导出工作流 JSON**（用于查找节点编号）：
   - 点击工作流页面的 **"导出"** 或 **"导出工作流 API"** 按钮
   - 下载 JSON 文件
   - 打开 JSON 文件，查找：
     - `LoadImage` 节点的编号（key），例如：`"74"` → **imageNodeId = "74"**
     - `TextEncodeQwenImageEditPlus` 节点的编号（key），例如：`"76"` → **promptNodeId = "76"**

4. **确认字段名**：
   - `LoadImage` 节点的图片字段通常是 `"image"` → **imageFieldName = "image"**
   - `TextEncodeQwenImageEditPlus` 节点的文本字段通常是 `"text"` → **promptFieldName = "text"**

### 步骤 8：配置 VS Code 扩展

1. 在工作区根目录创建 `.vibevideo/` 目录（如果不存在）
2. 复制 `templates/runninghub-workflows.example.json` 到 `.vibevideo/runninghub-workflows.json`
3. 编辑配置文件，填入你刚才获取的信息：

```json
{
  "defaultWorkflow": {
    "workflowId": "1904136902449209346",  // 替换为你的工作流 ID
    "imageNodeId": "74",                  // 替换为 LoadImage 节点的编号
    "imageFieldName": "image",           // 通常是 "image"
    "promptNodeId": "76",                // 替换为 TextEncodeQwenImageEditPlus 节点的编号
    "promptFieldName": "text"            // 通常是 "text"
  }
}
```

4. 在 VS Code 设置中配置 RunningHub API Key：
   - `Ctrl+,` → 搜索 `vibevideo.runninghub.apiKey`
   - 填入你的 API Key（在 RunningHub 右上角头像 → API 控制台获取）

### 步骤 9：测试扩展功能

1. 在 VS Code 中生成一张首帧图片
2. 右键首帧图片 → 选择 **"生成俯视角度"** 或其他角度
3. 检查是否能正常调用工作流并生成图片

## 常见问题

### Q: 找不到 TextEncodeQwenImageEditPlus 节点？

A: 这个节点可能在不同版本的 ComfyUI 中有不同的名称。可以尝试：
- `CLIPTextEncode` + Qwen 模型
- `TextEncode` + Qwen 相关配置
- 或者使用通用的图像编辑提示词编码节点

### Q: 生成的图片效果不理想？

A: 可以尝试：
1. 调整 KSampler 的 `steps`（增加步数，如 30-50）
2. 调整 `cfg`（控制提示词强度，如 8-12）
3. 使用更合适的模型
4. 调整 LoRA 强度
5. 优化提示词格式

### Q: 如何为不同角度使用不同的工作流？

A: 在 `.vibevideo/runninghub-workflows.json` 的 `angleWorkflows` 中为每个角度配置不同的 `workflowId`：

```json
{
  "angleWorkflows": {
    "overhead": {
      "workflowId": "工作流ID1",
      ...
    },
    "underside": {
      "workflowId": "工作流ID2",
      ...
    }
  }
}
```

### Q: 工作流运行失败？

A: 检查：
1. API Key 是否正确
2. 节点编号（nodeId）是否正确
3. 字段名（fieldName）是否正确
4. 工作流 ID 是否正确
5. 查看 RunningHub 平台的任务日志，查看具体错误信息

## 参考资源

- [RunningHub 官网](https://www.runninghub.cn/)
- [ComfyUI 节点文档](https://github.com/comfyanonymous/ComfyUI)
- RunningHub 平台内的工作流示例和教程

---

**提示**：如果遇到问题，可以在 RunningHub 平台的工作流社区中搜索类似的工作流作为参考。

