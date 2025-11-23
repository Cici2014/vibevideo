@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   VSCode 扩展一键安装脚本
echo   将安装: VibeVideo 和 Qwen Code Companion
echo ========================================
echo.

:: 检查是否以管理员身份运行
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 建议以管理员身份运行此脚本以获得最佳体验
    echo.
)

:: 检查 VS Code 是否已安装
where code >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到 VS Code 安装，或 VS Code 未添加到 PATH
    echo.
    echo 正在尝试自动下载并安装 VS Code...
    echo.
    
    :: 设置下载地址和临时文件路径
    set VSCODE_URL=https://update.code.visualstudio.com/latest/win32-x64-user/stable
    set TEMP_DIR=%TEMP%
    set INSTALLER_PATH=%TEMP_DIR%\VSCodeUserSetup.exe
    
    echo [1/2] 正在下载 VS Code...
    echo       下载地址: %VSCODE_URL%
    echo       保存位置: %INSTALLER_PATH%
    echo.
    
    :: 使用 PowerShell 下载 VS Code
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%VSCODE_URL%' -OutFile '%INSTALLER_PATH%' -UseBasicParsing}"
    
    if exist "%INSTALLER_PATH%" (
        echo [✓] VS Code 下载完成
        echo.
        
        echo [2/2] 正在安装 VS Code...
        echo       这将自动添加到 PATH，无需手动操作
        echo.
        
        :: 静默安装，自动添加到 PATH，不自动运行
        "%INSTALLER_PATH%" /VERYSILENT /NORESTART /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath
        
        if %errorlevel% equ 0 (
            echo [✓] VS Code 安装完成
            echo.
            
            :: 刷新环境变量（重新获取 PATH）
            call refreshenv >nul 2>&1
            if %errorlevel% neq 0 (
                :: 如果 refreshenv 不可用，手动刷新 PATH
                for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYSTEM_PATH=%%b"
                for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%b"
                set "PATH=%SYSTEM_PATH%;%USER_PATH%"
            )
            
            :: 等待一下让安装完成
            timeout /t 3 /nobreak >nul
            
            :: 再次检查是否安装成功
            where code >nul 2>&1
            if %errorlevel% neq 0 (
                echo [提示] VS Code 已安装，但可能需要重启终端才能使用 'code' 命令
                echo       请关闭当前窗口，重新打开命令提示符，然后重新运行此脚本
                echo.
                pause
                exit /b 0
            )
        ) else (
            echo [✗] VS Code 安装失败
            echo.
            echo 请手动安装 VS Code：
            echo 1. 访问 https://code.visualstudio.com/
            echo 2. 下载并安装 VS Code
            echo 3. 安装时请确保勾选 "添加到 PATH" 选项
            echo.
            del "%INSTALLER_PATH%" >nul 2>&1
            pause
            exit /b 1
        )
        
        :: 清理临时文件
        del "%INSTALLER_PATH%" >nul 2>&1
    ) else (
        echo [✗] VS Code 下载失败
        echo.
        echo 请手动安装 VS Code：
        echo 1. 访问 https://code.visualstudio.com/
        echo 2. 下载并安装 VS Code
        echo 3. 安装时请确保勾选 "添加到 PATH" 选项
        echo.
        pause
        exit /b 1
    )
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

