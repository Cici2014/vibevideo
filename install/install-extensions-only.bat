@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   VSCode 扩展安装脚本（仅安装插件）
echo   将安装: VibeVideo 和 Qwen Code Companion
echo ========================================
echo.

:: 检查 VS Code 是否已安装
where code >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 VS Code 安装，或 VS Code 未添加到 PATH
    echo.
    echo 请先安装 VS Code：
    echo 1. 访问 https://code.visualstudio.com/
    echo 2. 下载并安装 VS Code
    echo 3. 安装时请确保勾选 "添加到 PATH" 选项
    echo 4. 安装完成后，重新运行此脚本
    echo.
    echo 提示：如果您需要自动安装 VS Code，请使用 install-vscode-extensions-full.bat
    echo.
    pause
    exit /b 1
)

echo [✓] 检测到 VS Code 已安装
echo.

:: 显示 VS Code 版本
echo 正在检查 VS Code 版本...
for /f "tokens=*" %%i in ('code --version ^| findstr /r "^[0-9]"') do (
    set VERSION=%%i
    goto :version_found
)
:version_found
echo [✓] VS Code 版本: %VERSION%
echo.

:: 定义扩展 ID
set VIBEVIDEO_EXT=fastpen.vibevideo
set QWEN_EXT=Qwen.qwen-code-companion

echo ========================================
echo   开始安装扩展...
echo ========================================
echo.

set SUCCESS_COUNT=0
set FAIL_COUNT=0

:: 安装 VibeVideo 扩展
echo [1/2] 正在安装 VibeVideo 扩展...
code --install-extension %VIBEVIDEO_EXT% --force >nul 2>&1
set INSTALL_RESULT=%ERRORLEVEL%
if !INSTALL_RESULT! equ 0 (
    echo [✓] VibeVideo 扩展安装成功！
    set /a SUCCESS_COUNT+=1
) else (
    echo [✗] VibeVideo 扩展安装失败
    echo     扩展ID: %VIBEVIDEO_EXT%
    echo     请检查网络连接或扩展名称是否正确
    set /a FAIL_COUNT+=1
)
echo.

:: 安装 Qwen Code Companion 扩展
echo [2/2] 正在安装 Qwen Code Companion 扩展...
code --install-extension %QWEN_EXT% --force >nul 2>&1
set INSTALL_RESULT=%ERRORLEVEL%
if !INSTALL_RESULT! equ 0 (
    echo [✓] Qwen Code Companion 扩展安装成功！
    set /a SUCCESS_COUNT+=1
) else (
    echo [✗] Qwen Code Companion 扩展安装失败
    echo     扩展ID: %QWEN_EXT%
    echo     提示: 如果扩展ID不正确，请访问 VS Code 扩展市场手动安装
    set /a FAIL_COUNT+=1
)
echo.

:: 验证安装
echo ========================================
echo   验证安装结果...
echo ========================================
echo.

code --list-extensions | findstr /i "%VIBEVIDEO_EXT%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] VibeVideo: 已安装
) else (
    echo [✗] VibeVideo: 未找到
)

code --list-extensions | findstr /i "%QWEN_EXT%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Qwen Code Companion: 已安装
) else (
    echo [✗] Qwen Code Companion: 未找到
)

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 安装统计: 成功 !SUCCESS_COUNT! 个, 失败 !FAIL_COUNT! 个
echo.
echo 提示：
echo 1. 请重启 VS Code 以确保扩展正常工作
echo 2. 如果扩展未正确安装，请手动在 VS Code 扩展市场搜索安装
echo 3. VibeVideo 扩展ID: %VIBEVIDEO_EXT%
echo 4. Qwen Code Companion 扩展ID: %QWEN_EXT%
echo.
echo VS Code 扩展市场链接：
echo   VibeVideo: https://marketplace.visualstudio.com/items?itemName=%VIBEVIDEO_EXT%
echo   Qwen Code Companion: https://marketplace.visualstudio.com/items?itemName=%QWEN_EXT%
echo.
pause

