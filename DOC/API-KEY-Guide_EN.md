# DashScope API Key Guide

## 🔑 What is DashScope API Key?

DashScope is Alibaba Cloud's AI model service platform, and Tongyi Wanxiang's API is on this platform.

**API Key Format**: `sk-xxxxxxxxxxxxxxxx`

---

## 📝 Getting Started (5 minutes)

### 1. Visit DashScope Console

Click the link:
```
https://bailian.console.aliyun.com/
```

Or:
```
https://dashscope.console.aliyun.com/
```

### 2. Log in to Alibaba Cloud Account

If you don't have an account, you need to register first:
- Visit https://www.aliyun.com/
- Click "Free Registration"
- Complete phone verification

### 3. Activate DashScope Service

First-time access may require:
- Agree to service agreement
- Complete real-name verification
- Activate service (usually has free quota)

### 4. Create/View API Key

In the console:
1. Find the **API Key Management** page
2. Click **"Create API Key"** or view existing Key
3. Copy the API Key (format: `sk-xxxxx`)

### 5. Paste into VS Code

1. Open VS Code
2. Press `Ctrl+,` to open settings
3. Search for `vibevideo`
4. Paste in **Dashscope: Api Key**
5. Done!

---

## 💰 Pricing Information

### Free Quota
New users usually have free quota to test functionality.

### Billing Method
- Text-to-image: Per image
- Text-to-video: Per second
- Check console for specific prices

### Monitor Usage
In DashScope console you can view:
- Usage statistics
- Remaining quota
- Billing details

---

## ✅ Verify Configuration

### Verify in VS Code

#### Method 1: View Configuration
```
Ctrl+Shift+P → "Vibe Video: Show Current Config"
```

Should display:
```
Current Provider: tongyi-wanxiang
Status: ✓ Configured
API Key: sk-xxxxx...
```

#### Method 2: Test Generation
```
Ctrl+Shift+P → "Vibe Video: Generate First Frames"
```

If configured correctly, it will actually call the API (ensure there are storyboards with `firstFramePrompt`)

---

## 🔒 Security Recommendations

### 1. Don't Share API Key
- ❌ Don't screenshot settings page containing API Key
- ❌ Don't commit settings.json to Git
- ❌ Don't hardcode in code

### 2. Configuration Storage Location

**Recommended**: User Settings (Global)
```
Location: C:\Users\YourName\AppData\Roaming\Code\User\settings.json
Not tracked by Git
```

**Avoid**: Workspace Settings (Project)
```
Location: project/.vscode/settings.json
May be accidentally committed to Git
```

### 3. Regular Rotation
- If you suspect leakage, immediately disable in console
- Create new API Key
- Update VS Code settings

### 4. .gitignore Configuration
If using workspace settings, add:
```gitignore
.vscode/settings.json
```

---

## 🆚 Comparison: API Key vs AccessKey

| | AccessKey (Old Solution) | API Key (New Solution) ⭐ |
|---|---|---|
| Number of Fields | 2 (ID + Secret) | 1 ✅ |
| Authentication Method | Requires signature algorithm | Bearer Token ✅ |
| Implementation Complexity | High (100+ lines of signature code) | Low (0 lines) ✅ |
| Configuration Simplicity | Complex | Simple ✅ |
| Dependencies | May need SDK | Zero dependencies ✅ |

**Conclusion**: API Key method is simpler and more lightweight!

---

## 💡 Frequently Asked Questions

### Q: Where is the API Key?
**A**: Visit https://bailian.console.aliyun.com/, in the API Key Management page

### Q: What format is it?
**A**: Usually a long string starting with `sk-`

### Q: How much free quota is there?
**A**: Check the console's "Resource Packages" or "Billing Center"

### Q: Will the API Key expire?
**A**: Generally not, unless manually disabled. Recommend regular checks.

### Q: Can multiple projects share one Key?
**A**: Yes, use "User Settings" for global sharing

---

## 📚 Reference Documentation

- [DashScope Documentation](https://help.aliyun.com/zh/dashscope/)
- [Tongyi Wanxiang API](https://bailian.console.aliyun.com/)
- [Billing Information](https://help.aliyun.com/zh/dashscope/billing-overview)

---

## 🎊 Summary

**Getting an API Key only takes 5 minutes!**

```
1. Visit bailian.console.aliyun.com
2. Log in/Register Alibaba Cloud
3. Create API Key
4. Copy and paste into VS Code
5. Start generating videos! 🎬
```

**After switching to API Key configuration, it's much simpler!** ✨

