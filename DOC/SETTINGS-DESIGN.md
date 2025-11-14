# 设置方式设计说明

## 修改说明

### 原方案：命令对话框
- 通过命令面板触发
- 逐步弹出输入框
- 保存到 Secret Storage

### 新方案：设置面板 ⭐ 更好
- 标准的 VS Code 设置
- 直观的设置界面
- 自动保存

---

## 为什么设置面板更好？

### 1. 用户体验更好 ✅
```
旧方式：
Ctrl+Shift+P → 输入命令 → 选择 Provider → 输入 Key ID → 输入 Secret
（5 步，需要记忆流程）

新方式：
Ctrl+, → 搜索 vibevideo → 直接输入
（2 步，直观明了）
```

### 2. 更符合 VS Code 规范 ✅
大部分扩展的 API Key 都在设置中配置，例如：
- GitHub Copilot
- GitLens
- ESLint
- Prettier

用户习惯在设置面板中找配置。

### 3. 可见性更好 ✅
```
旧方式：
配置后看不到，需要运行命令才能查看

新方式：
随时打开设置查看和修改
```

### 4. 便于调整 ✅
```
旧方式：
修改配置需要重新运行整个流程

新方式：
直接在设置中改一个字段
```

### 5. 支持更多配置 ✅
在设置面板中可以轻松添加：
- ✅ 视频分辨率
- ✅ 默认时长
- ✅ 其他参数

---

## 实现细节

### package.json 配置
```json
"configuration": {
  "title": "Vibe Video",
  "properties": {
    "vibevideo.provider": {
      "type": "string",
      "enum": ["tongyi-wanxiang"],
      "description": "视频 AI 服务商"
    },
    "vibevideo.tongyi.accessKeyId": {
      "type": "string",
      "description": "通义万相 Access Key ID"
    },
    "vibevideo.tongyi.accessKeySecret": {
      "type": "string",
      "description": "通义万相 Access Key Secret"
    },
    "vibevideo.video.resolution": {
      "type": "string",
      "enum": ["1280x720", "1920x1080", "854x480"],
      "description": "视频分辨率"
    },
    "vibevideo.video.defaultDuration": {
      "type": "number",
      "minimum": 3,
      "maximum": 30,
      "description": "默认视频时长（秒）"
    }
  }
}
```

### ConfigManager 读取
```typescript
async getTongyiConfig(): Promise<TongyiConfig | undefined> {
  const config = vscode.workspace.getConfiguration('vibevideo');
  
  const accessKeyId = config.get<string>('tongyi.accessKeyId', '');
  const accessKeySecret = config.get<string>('tongyi.accessKeySecret', '');

  if (!accessKeyId || !accessKeySecret) {
    return undefined;
  }

  return { accessKeyId, accessKeySecret };
}
```

### 打开设置
```typescript
openSettings(): void {
  vscode.commands.executeCommand('workbench.action.openSettings', 'vibevideo');
}
```

---

## 用户使用流程

### 配置流程
```
1. Ctrl+, 打开设置
2. 搜索 "vibevideo"
3. 输入 Access Key ID
4. 输入 Access Key Secret
5. 完成！（自动保存）
```

或者：
```
1. Ctrl+Shift+P
2. "Vibe Video: Configure Video AI"
3. 点击"打开设置"
4. 输入配置
5. 完成！
```

### 命令简化
`Configure Video AI` 命令变成：
- 显示提示信息
- 引导到设置页面
- 可选：打开获取指南

---

## 安全性

### 设置存储位置
- 用户级别：`settings.json`（用户目录）
- 工作区级别：`.vscode/settings.json`（项目目录）

### 注意事项
⚠️ Access Key Secret 会存储在明文配置文件中。

建议：
1. 添加到 `.gitignore`：
   ```gitignore
   .vscode/settings.json
   ```

2. 或使用环境变量（高级用户）

3. 文档中提醒用户注意安全

---

## 对比总结

| 方面 | 对话框方式 | 设置面板方式 ⭐ |
|-----|----------|---------------|
| 用户体验 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 直观性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 修改便捷性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 符合规范 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可扩展性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 安全性 | ⭐⭐⭐⭐⭐ (Secret Storage) | ⭐⭐⭐ (明文) |

**结论**：
- 设置面板方式更适合 VS Code
- 用户体验更好
- 安全性略低但可接受（可以文档提醒）

---

## 配置示例

### settings.json（用户设置）
```json
{
  "vibevideo.provider": "tongyi-wanxiang",
  "vibevideo.tongyi.accessKeyId": "LTAI5t...",
  "vibevideo.tongyi.accessKeySecret": "your-secret-here",
  "vibevideo.video.resolution": "1920x1080",
  "vibevideo.video.defaultDuration": 8
}
```

### 工作区设置（.vscode/settings.json）
```json
{
  "vibevideo.video.resolution": "1920x1080",
  "vibevideo.video.defaultDuration": 10
}
```
项目特定的设置（不包含敏感信息）

---

## 未来改进

### 可选：支持环境变量
```typescript
getTongyiConfig(): TongyiConfig | undefined {
  // 优先从环境变量读取
  const envKeyId = process.env.TONGYI_ACCESS_KEY_ID;
  const envKeySecret = process.env.TONGYI_ACCESS_KEY_SECRET;
  
  if (envKeyId && envKeySecret) {
    return { accessKeyId: envKeyId, accessKeySecret: envKeySecret };
  }
  
  // 其次从设置读取
  const config = vscode.workspace.getConfiguration('vibevideo');
  // ...
}
```

---

## 总结

✅ **设置面板方式是更好的选择！**

- 更直观
- 更符合 VS Code 规范
- 用户体验更好
- 实现更简单

这个修改让配置流程从 5 步简化到 2 步！

