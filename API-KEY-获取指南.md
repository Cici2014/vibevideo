# DashScope API Key 获取指南

## 🔑 什么是 DashScope API Key？

DashScope 是阿里云的 AI 模型服务平台，通义万相的 API 就在这个平台上。

**API Key 格式**：`sk-xxxxxxxxxxxxxxxx`

---

## 📝 获取步骤（5分钟）

### 1. 访问 DashScope 控制台

点击链接：
```
https://bailian.console.aliyun.com/
```

或：
```
https://dashscope.console.aliyun.com/
```

### 2. 登录阿里云账号

如果没有账号，需要先注册：
- 访问 https://www.aliyun.com/
- 点击"免费注册"
- 完成手机验证

### 3. 开通 DashScope 服务

首次访问可能需要：
- 同意服务协议
- 完成实名认证
- 开通服务（通常有免费额度）

### 4. 创建/查看 API Key

在控制台中：
1. 找到 **API Key 管理**页面
2. 点击 **"创建 API Key"** 或查看现有 Key
3. 复制 API Key（格式：`sk-xxxxx`）

### 5. 粘贴到 VS Code

1. 打开 VS Code
2. 按 `Ctrl+,` 打开设置
3. 搜索 `vibevideo`
4. 在 **Dashscope: Api Key** 中粘贴
5. 完成！

---

## 💰 费用说明

### 免费额度
新用户通常有免费额度，可以测试功能。

### 计费方式
- 文生图：按张计费
- 文生视频：按秒计费
- 具体价格查看控制台

### 监控使用量
在 DashScope 控制台可以查看：
- 使用量统计
- 剩余额度
- 消费明细

---

## ✅ 验证配置

### 在 VS Code 中验证

#### 方法 1：查看配置
```
Ctrl+Shift+P → "Vibe Video: Show Current Config"
```

应该显示：
```
当前 Provider: tongyi-wanxiang
状态: ✓ 已配置
API Key: sk-xxxxx...
```

#### 方法 2：测试生成
```
Ctrl+Shift+P → "Vibe Video: Generate First Frames"
```

如果配置正确，会实际调用 API（确保有分镜包含 `firstFramePrompt`）

---

## 🔒 安全建议

### 1. 不要分享 API Key
- ❌ 不要截图包含 API Key 的设置页面
- ❌ 不要将 settings.json 提交到 Git
- ❌ 不要在代码中硬编码

### 2. 配置存储位置

**推荐**：用户设置（全局）
```
位置：C:\Users\YourName\AppData\Roaming\Code\User\settings.json
不会被 Git 追踪
```

**避免**：工作区设置（项目）
```
位置：项目/.vscode/settings.json
可能被误提交到 Git
```

### 3. 定期更换
- 如果怀疑泄露，立即在控制台禁用
- 创建新的 API Key
- 更新 VS Code 设置

### 4. .gitignore 配置
如果使用工作区设置，添加：
```gitignore
.vscode/settings.json
```

---

## 🆚 对比：API Key vs AccessKey

| | AccessKey (旧方案) | API Key (新方案) ⭐ |
|---|---|---|
| 字段数量 | 2个（ID + Secret） | 1个 ✅ |
| 认证方式 | 需要签名算法 | Bearer Token ✅ |
| 实现复杂度 | 高（100+行签名代码） | 低（0行） ✅ |
| 配置简单性 | 复杂 | 简单 ✅ |
| 依赖 | 可能需要 SDK | 零依赖 ✅ |

**结论**：API Key 方式更简单、更轻量！

---

## 💡 常见问题

### Q: API Key 在哪里？
**A**: 访问 https://bailian.console.aliyun.com/，在 API Key 管理页面

### Q: 格式是什么样的？
**A**: 通常是 `sk-` 开头的长字符串

### Q: 免费额度有多少？
**A**: 查看控制台的"资源包"或"计费中心"

### Q: API Key 会过期吗？
**A**: 一般不会，除非手动禁用。建议定期检查。

### Q: 可以多个项目共用一个 Key 吗？
**A**: 可以，使用"用户设置"即可全局共享

---

## 📚 参考文档

- [DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [通义万相 API](https://bailian.console.aliyun.com/)
- [计费说明](https://help.aliyun.com/zh/dashscope/billing-overview)

---

## 🎊 总结

**获取 API Key 只需 5 分钟！**

```
1. 访问 bailian.console.aliyun.com
2. 登录/注册阿里云
3. 创建 API Key
4. 复制粘贴到 VS Code
5. 开始生成视频！🎬
```

**配置改为 API Key 后，更简单了！** ✨

