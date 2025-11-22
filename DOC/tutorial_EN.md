# Vibe Video Tutorial

**Create Videos Like Writing Code**

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Storyboard Specification](#storyboard-specification)
4. [Core Features](#core-features)
5. [FAQ](#faq)

---

## Introduction

Vibe Video is a VS Code extension that lets you **create videos like writing code**:

- 📝 **Write scripts in Markdown**
- 🤖 **AI generates storyboard structure**
- 🎬 **Batch generate video clips**
- ✅ **Iterate and optimize**

### Workflow

```
Write Script → AI Generates Project Structure → Generate Images → Generate Videos → Compose Final Video → Complete
     ↑                                                                                                          ↓
     └────────────────────────────────── Review/Iterate ←─────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Environment Setup

Please refer to the **[Editor Setup Guide](other/editor-setup_EN.md)** to complete editor environment configuration.

### 2. Configure API Key

Vibe Video requires an AI service provider API Key:

1. **Get API Key**
   - Tongyi Wanxiang (Recommended): Visit [DashScope Console](https://bailian.console.aliyun.com/)
   - Replicate: Visit [Replicate](https://replicate.com/)
   - Google Gemini: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Configure**
   - `Ctrl+,` → Search `vibevideo` → Set Provider and API Key
   - Or `Ctrl+Shift+P` → `Vibe Video: Configure Video AI`

### 3. Create Project

1. Create folder and open: `File → Open Folder`
2. Initialize project: `Ctrl+Shift+P` → `Vibe Video: Initialize Project`

Project structure:
```
MyVideoProject/
├── Script.md            # Your script
├── subjects/            # Characters/Subjects
├── scenes/              # Scenes
├── storyboards/         # Storyboard scripts
├── first-frames/        # First frames
├── video-clip/          # Video clips
├── output/              # Final composed video
│   └── final.mp4
└── ...
```

### 4. Write Script

Edit `Script.md`:

```markdown
# My Video

## Scene 1: Opening

The main character walks on a city street, smiling and waving at the camera.

## Scene 2: Showcase

The main character enters a coffee shop and enjoys a good time.
```

### 5. AI Generate Project Structure

Use AI assistant (see [Editor Setup Guide](other/editor-setup_EN.md)) to generate project structure.

Enter in AI chat window:
```
Generate complete project structure based on Script.md, including:
1. Extract all subjects (characters), save to subjects/ directory
2. Extract all scenes, save to scenes/ directory
3. Split scenes into 5s or 10s storyboards
4. Generate detailed scripts for each storyboard, save to storyboards/ directory
5. Generate first frame descriptions for each storyboard, save to first-frames/ directory
```

### 6. Generate Resources

Batch generate:
- `Vibe Video: Generate All Subjects` - Generate subject images
- `Vibe Video: Generate All Scenes` - Generate scene images
- `Vibe Video: Generate First Frames` - Generate first frame images
- `Vibe Video: Generate All Videos` - Generate videos

Or right-click resources to select generate commands.

### 7. Compose Final Video ⭐

After generating all video clips, compose them into a final video:

- `Vibe Video: Compose Video` - Compose all video clips into final video

The final video will be saved to `output/final.mp4`.

**Note**: FFmpeg is required for video composition. The extension will automatically detect and guide you to install FFmpeg if needed.

---

## Storyboard Specification

### Standard Format

```markdown
# Scene Title

- **Duration**: 5s or 10s (**Only 5s or 10s**)
- **Subject**: character1, character2 (optional)
- **Scene**: scene name (optional)
- **Reference**: first-frames/xxx-first-frame.png (optional)
- **First Frame**: first-frames/xxx-first-frame.png (optional)
- **Last Frame**: first-frames/xxx-last-frame.png (optional)

**Prompt**: A complete integrated description containing video content, sound, aesthetics, and style.
```

### Field Descriptions

- **Duration** (Required): Only 5s or 10s
- **Subject** (Optional): Character list, ensures consistent character appearance
- **Scene** (Optional): Scene name, for reusing scene resources
- **Reference** (Recommended): Using reference images makes generation more controllable
- **First Frame** (Optional): For image-to-video generation
- **Last Frame** (Optional): For first-last frame video generation
- **Prompt** (Required): **Must be a complete integrated description, cannot be listed separately**

### Prompt Examples

❌ **Wrong**:
```markdown
**Video Prompt**: Camera pushes forward
**Sound Prompt**: Light background music
**Aesthetic Control**: Bright sunlight
```

✅ **Correct**:
```markdown
**Prompt**: Camera slowly pushes forward, the main character approaches from afar, smiling and waving at the camera, light and cheerful background music, sunlight filters through tall buildings, creating a warm and bright atmosphere.
```

### Complete Example

```markdown
# Opening Shot

- **Duration**: 5s
- **Subject**: Main Character
- **Scene**: City Street
- **First Frame**: first-frames/01-opening-first-frame.png

**Prompt**: Camera slowly pushes forward, showcasing the bustling city street scene, the main character approaches from afar, smiling and waving at the camera, light and cheerful background music, sunlight filters through tall buildings, creating a warm and bright atmosphere, cinematic quality visuals with high color saturation.
```

---

## Core Features

### Project Management

- **Initialize Project**: `Vibe Video: Initialize Project`
- **Project Stats**: `Vibe Video: Show Project Stats`
- **Quality Check**: `Vibe Video: Check Storyboards Quality`

### Resource Generation

#### Subject Generation
- Purpose: Ensure consistent character appearance
- Features: White background for easy compositing
- Command: `Vibe Video: Generate All Subjects`

#### Scene Generation
- Purpose: Create background environments
- Features: Reusable
- Command: `Vibe Video: Generate All Scenes`

#### First Frame Generation
- Text-to-Image: `Vibe Video: Generate First Frames`
- Composition: `Vibe Video: Compose All First Frames` (using subject + scene)

#### Video Generation
- **Image-to-Video** (Recommended): Use first frame image + prompt
- **Text-to-Video**: Only use text prompt
- **First-Last Frame Video** (Advanced): Use first frame + last frame images

#### Video Composition ⭐
- **Compose Video**: `Vibe Video: Compose Video` - Merge all video clips into final video
- Uses FFmpeg to combine clips in storyboard order
- Output: `output/final.mp4`
- Automatically handles missing clips (prompts user and allows continuation)

### Configuration Management

- View Config: `Vibe Video: Show Current Config`
- Modify Config: `Ctrl+,` → Search `vibevideo`

Main Configuration Items:
- `vibevideo.provider`: AI Service Provider (default: `tongyi-wanxiang`)
  - Options: `tongyi-wanxiang`, `replicate`, `google`
- `vibevideo.dashscope.apiKey`: DashScope API Key (for Tongyi Wanxiang)
- `vibevideo.replicate.apiKey`: Replicate API Token (for Replicate)
- `vibevideo.google.apiKey`: Google API Key (for Google Gemini)
- `vibevideo.video.resolution`: Video Resolution (default: `720P`)

---

## FAQ

**Q: Can storyboard duration be other values?**  
A: No. Only **5s or 10s**.

**Q: Can prompts be listed separately?**  
A: No. Must be a complete integrated description.

**Q: How to reference images?**  
A: Use relative paths in storyboard script: `- **Reference**: ref-img/product.jpg`

**Q: What to do if generation fails?**  
A: Check API Key, network connection, API quota, and view error messages in VS Code output panel.

**Q: Can I use locally deployed models?**  
A: Yes. Configure `vibevideo.dashscope.baseUrl` to your local service address.

**Q: How do I compose all video clips into a final video?**  
A: Use `Vibe Video: Compose Video` command. FFmpeg is required - the extension will guide you to install it if needed.

**Q: What if FFmpeg is not installed?**  
A: The extension will automatically detect FFmpeg and guide you to install it. You can install FFmpeg from system PATH or via npm package.

---

## Need Help?

- 📖 [Editor Setup Guide](other/editor-setup_EN.md)
- 📚 [API Key Guide](API-KEY-Guide_EN.md)
- 📧 Email: cici_yiyi@qq.com
- 💬 WeChat: Scan QR code (see README)

**Enjoy creating videos with Vibe Video!** 🎬

