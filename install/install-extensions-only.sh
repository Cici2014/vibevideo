#!/bin/bash
# VSCode 扩展安装脚本（仅安装插件）
# 支持 macOS 和 Linux
# 将安装: VibeVideo 和 Qwen Code Companion

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  VSCode 扩展安装脚本（仅安装插件）${NC}"
echo -e "${CYAN}  将安装: VibeVideo 和 Qwen Code Companion${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 检测操作系统
OS="Unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
fi

echo -e "${YELLOW}[信息] 检测到操作系统: $OS${NC}"
echo ""

# 检查 VS Code 是否已安装
if ! command -v code &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 VS Code 安装，或 VS Code 未添加到 PATH${NC}"
    echo ""
    echo "请先安装 VS Code："
    echo "1. 访问 https://code.visualstudio.com/"
    echo "2. 下载并安装 VS Code"
    echo "3. macOS 用户：打开 VS Code，按 Cmd+Shift+P，输入 'Shell Command: Install code command in PATH'"
    echo "4. Linux 用户：确保 VS Code 已添加到 PATH"
    echo "5. 安装完成后，重新运行此脚本"
    echo ""
    echo -e "${YELLOW}提示：如果您需要自动安装 VS Code，请使用 install-vscode-extensions-full.sh${NC}"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

echo -e "${GREEN}[✓] 检测到 VS Code 已安装${NC}"
echo ""

# 显示 VS Code 版本
echo "正在检查 VS Code 版本..."
if VERSION=$(code --version 2>/dev/null | head -n 1); then
    echo -e "${GREEN}[✓] VS Code 版本: $VERSION${NC}"
else
    echo -e "${YELLOW}[提示] 无法获取 VS Code 版本${NC}"
fi
echo ""

# 定义扩展 ID
VIBEVIDEO_EXT="fastpen.vibevideo"
QWEN_EXT="Qwen.qwen-code-companion"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  开始安装扩展...${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

# 安装 VibeVideo 扩展
echo -e "${YELLOW}[1/2] 正在安装 VibeVideo 扩展...${NC}"
if code --install-extension "$VIBEVIDEO_EXT" --force >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] VibeVideo 扩展安装成功！${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}[✗] VibeVideo 扩展安装失败${NC}"
    echo "    扩展ID: $VIBEVIDEO_EXT"
    echo "    请检查网络连接或扩展名称是否正确"
    ((FAIL_COUNT++))
fi
echo ""

# 安装 Qwen Code Companion 扩展
echo -e "${YELLOW}[2/2] 正在安装 Qwen Code Companion 扩展...${NC}"
if code --install-extension "$QWEN_EXT" --force >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] Qwen Code Companion 扩展安装成功！${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}[✗] Qwen Code Companion 扩展安装失败${NC}"
    echo "    扩展ID: $QWEN_EXT"
    echo "    提示: 如果扩展ID不正确，请访问 VS Code 扩展市场手动安装"
    ((FAIL_COUNT++))
fi
echo ""

# 验证安装
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  验证安装结果...${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

INSTALLED_EXTENSIONS=$(code --list-extensions 2>/dev/null)

if echo "$INSTALLED_EXTENSIONS" | grep -qi "$VIBEVIDEO_EXT"; then
    echo -e "${GREEN}[✓] VibeVideo: 已安装${NC}"
else
    echo -e "${RED}[✗] VibeVideo: 未找到${NC}"
fi

if echo "$INSTALLED_EXTENSIONS" | grep -qi "$QWEN_EXT"; then
    echo -e "${GREEN}[✓] Qwen Code Companion: 已安装${NC}"
else
    echo -e "${RED}[✗] Qwen Code Companion: 未找到${NC}"
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  安装完成！${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "安装统计: 成功 ${GREEN}$SUCCESS_COUNT${NC} 个, 失败 ${RED}$FAIL_COUNT${NC} 个"
echo ""
echo -e "${YELLOW}提示：${NC}"
echo "1. 请重启 VS Code 以确保扩展正常工作"
echo "2. 如果扩展未正确安装，请手动在 VS Code 扩展市场搜索安装"
echo "3. VibeVideo 扩展ID: $VIBEVIDEO_EXT"
echo "4. Qwen Code Companion 扩展ID: $QWEN_EXT"
echo ""
echo -e "${YELLOW}VS Code 扩展市场链接：${NC}"
echo "  VibeVideo: https://marketplace.visualstudio.com/items?itemName=$VIBEVIDEO_EXT"
echo "  Qwen Code Companion: https://marketplace.visualstudio.com/items?itemName=$QWEN_EXT"
echo ""

read -p "按 Enter 键退出..."

