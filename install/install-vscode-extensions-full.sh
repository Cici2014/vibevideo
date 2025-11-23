#!/bin/bash
# VSCode 扩展一键安装脚本
# 支持 macOS 和 Linux
# 将安装: VibeVideo 和 Qwen Code Companion

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  VSCode 扩展一键安装脚本${NC}"
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

# 检查是否以 root 身份运行（通常不需要，但提示）
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}[提示] 检测到以 root 身份运行，通常不需要${NC}"
    echo ""
fi

# 检查 VS Code 是否已安装
if ! command -v code &> /dev/null; then
    echo -e "${RED}[警告] 未检测到 VS Code 安装，或 VS Code 未添加到 PATH${NC}"
    echo ""
    echo -e "${YELLOW}正在尝试自动下载并安装 VS Code...${NC}"
    echo ""
    
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    if [ "$OS" == "macOS" ]; then
        # macOS 安装流程
        echo -e "${YELLOW}[1/3] 正在下载 VS Code...${NC}"
        VSCODE_URL="https://update.code.visualstudio.com/latest/darwin/stable"
        DOWNLOAD_FILE="$TEMP_DIR/VSCode-darwin.zip"
        
        if command -v curl &> /dev/null; then
            curl -L "$VSCODE_URL" -o "$DOWNLOAD_FILE" --progress-bar
        elif command -v wget &> /dev/null; then
            wget "$VSCODE_URL" -O "$DOWNLOAD_FILE" --progress=bar:force 2>&1
        else
            echo -e "${RED}[✗] 未找到 curl 或 wget，无法下载${NC}"
            echo "请手动安装 VS Code：https://code.visualstudio.com/"
            exit 1
        fi
        
        if [ -f "$DOWNLOAD_FILE" ]; then
            echo -e "${GREEN}[✓] VS Code 下载完成${NC}"
            echo ""
            
            echo -e "${YELLOW}[2/3] 正在解压 VS Code...${NC}"
            unzip -q "$DOWNLOAD_FILE" -d "$TEMP_DIR"
            
            echo -e "${YELLOW}[3/3] 正在安装 VS Code 到 Applications...${NC}"
            if [ -d "$TEMP_DIR/Visual Studio Code.app" ]; then
                # 如果已存在，先删除
                rm -rf "/Applications/Visual Studio Code.app" 2>/dev/null
                # 复制到 Applications
                cp -R "$TEMP_DIR/Visual Studio Code.app" "/Applications/"
                
                if [ -d "/Applications/Visual Studio Code.app" ]; then
                    echo -e "${GREEN}[✓] VS Code 安装完成${NC}"
                    echo ""
                    
                    # 添加命令行工具到 PATH
                    echo -e "${YELLOW}正在添加命令行工具到 PATH...${NC}"
                    VSCODE_PATH="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
                    
                    # 创建符号链接到 /usr/local/bin
                    if [ -f "$VSCODE_PATH" ]; then
                        sudo ln -sf "$VSCODE_PATH" /usr/local/bin/code 2>/dev/null
                        
                        # 检查是否成功
                        if command -v code &> /dev/null; then
                            echo -e "${GREEN}[✓] 命令行工具已添加到 PATH${NC}"
                        else
                            echo -e "${YELLOW}[提示] 命令行工具需要手动添加${NC}"
                            echo "请打开 VS Code，按 Cmd+Shift+P，输入 'Shell Command: Install code command in PATH'"
                        fi
                    fi
                else
                    echo -e "${RED}[✗] VS Code 安装失败${NC}"
                    exit 1
                fi
            else
                echo -e "${RED}[✗] 解压文件结构不正确${NC}"
                exit 1
            fi
        else
            echo -e "${RED}[✗] VS Code 下载失败${NC}"
            exit 1
        fi
        
    elif [ "$OS" == "Linux" ]; then
        # Linux 安装流程
        echo -e "${YELLOW}[1/2] 检测 Linux 发行版...${NC}"
        
        # 检测发行版
        if [ -f /etc/debian_version ]; then
            # Debian/Ubuntu
            DISTRO="deb"
            VSCODE_URL="https://update.code.visualstudio.com/latest/linux-deb-x64/stable"
            DOWNLOAD_FILE="$TEMP_DIR/code.deb"
        elif [ -f /etc/redhat-release ]; then
            # Fedora/RHEL
            DISTRO="rpm"
            VSCODE_URL="https://update.code.visualstudio.com/latest/linux-rpm-x64/stable"
            DOWNLOAD_FILE="$TEMP_DIR/code.rpm"
        else
            echo -e "${RED}[✗] 无法检测 Linux 发行版${NC}"
            echo "请手动安装 VS Code：https://code.visualstudio.com/"
            exit 1
        fi
        
        echo -e "${GREEN}[✓] 检测到 $DISTRO 发行版${NC}"
        echo ""
        
        echo -e "${YELLOW}[2/2] 正在下载并安装 VS Code...${NC}"
        
        if command -v curl &> /dev/null; then
            curl -L "$VSCODE_URL" -o "$DOWNLOAD_FILE" --progress-bar
        elif command -v wget &> /dev/null; then
            wget "$VSCODE_URL" -O "$DOWNLOAD_FILE" --progress=bar:force 2>&1
        else
            echo -e "${RED}[✗] 未找到 curl 或 wget，无法下载${NC}"
            exit 1
        fi
        
        if [ -f "$DOWNLOAD_FILE" ]; then
            echo -e "${GREEN}[✓] VS Code 下载完成${NC}"
            
            # 安装
            if [ "$DISTRO" == "deb" ]; then
                if command -v sudo &> /dev/null; then
                    sudo dpkg -i "$DOWNLOAD_FILE" 2>/dev/null
                    sudo apt-get install -f -y >/dev/null 2>&1
                else
                    dpkg -i "$DOWNLOAD_FILE" 2>/dev/null
                    apt-get install -f -y >/dev/null 2>&1
                fi
            elif [ "$DISTRO" == "rpm" ]; then
                if command -v sudo &> /dev/null; then
                    sudo rpm -ivh "$DOWNLOAD_FILE" >/dev/null 2>&1
                else
                    rpm -ivh "$DOWNLOAD_FILE" >/dev/null 2>&1
                fi
            fi
            
            # 检查安装结果
            if command -v code &> /dev/null; then
                echo -e "${GREEN}[✓] VS Code 安装完成${NC}"
            else
                echo -e "${YELLOW}[提示] VS Code 可能已安装，但需要刷新 PATH${NC}"
                echo "请重新打开终端或运行: export PATH=\"\$PATH:/usr/local/bin\""
            fi
        else
            echo -e "${RED}[✗] VS Code 下载失败${NC}"
            exit 1
        fi
    else
        echo -e "${RED}[✗] 不支持的操作系统${NC}"
        echo "请手动安装 VS Code：https://code.visualstudio.com/"
        exit 1
    fi
    
    echo ""
    
    # 再次检查是否安装成功
    if ! command -v code &> /dev/null; then
        echo -e "${YELLOW}[提示] VS Code 已安装，但可能需要重启终端才能使用 'code' 命令${NC}"
        echo "请重启终端，然后重新运行此脚本"
        exit 0
    fi
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

