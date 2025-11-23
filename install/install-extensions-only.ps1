# VSCode 扩展安装脚本（仅安装插件）
# 将安装: VibeVideo 和 Qwen Code Companion

# 设置控制台编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VSCode 扩展安装脚本（仅安装插件）" -ForegroundColor Cyan
Write-Host "  将安装: VibeVideo 和 Qwen Code Companion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 VS Code 是否已安装
$codePath = Get-Command code -ErrorAction SilentlyContinue
if (-not $codePath) {
    Write-Host "[错误] 未检测到 VS Code 安装，或 VS Code 未添加到 PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 VS Code：" -ForegroundColor Yellow
    Write-Host "1. 访问 https://code.visualstudio.com/" -ForegroundColor White
    Write-Host "2. 下载并安装 VS Code" -ForegroundColor White
    Write-Host "3. 安装时请确保勾选 '添加到 PATH' 选项" -ForegroundColor White
    Write-Host "4. 安装完成后，重新运行此脚本" -ForegroundColor White
    Write-Host ""
    Write-Host "提示：如果您需要自动安装 VS Code，请使用 install-vscode-extensions-full.ps1" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "[✓] 检测到 VS Code 已安装" -ForegroundColor Green
Write-Host ""

# 显示 VS Code 版本
Write-Host "正在检查 VS Code 版本..."
try {
    $version = & code --version 2>$null | Select-Object -First 1
    Write-Host "[✓] VS Code 版本: $version" -ForegroundColor Green
} catch {
    Write-Host "[提示] 无法获取 VS Code 版本" -ForegroundColor Yellow
}
Write-Host ""

# 定义扩展 ID
$vibeVideoExt = "fastpen.vibevideo"
$qwenExt = "Qwen.qwen-code-companion"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  开始安装扩展..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

# 安装 VibeVideo 扩展
Write-Host "[1/2] 正在安装 VibeVideo 扩展..." -ForegroundColor Yellow
try {
    & code --install-extension $vibeVideoExt --force 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[✓] VibeVideo 扩展安装成功！" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[✗] VibeVideo 扩展安装失败" -ForegroundColor Red
        Write-Host "    扩展ID: $vibeVideoExt" -ForegroundColor Gray
        Write-Host "    请检查网络连接或扩展名称是否正确" -ForegroundColor Gray
        $failCount++
    }
} catch {
    Write-Host "[✗] VibeVideo 扩展安装时发生错误: $_" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# 安装 Qwen Code Companion 扩展
Write-Host "[2/2] 正在安装 Qwen Code Companion 扩展..." -ForegroundColor Yellow
try {
    & code --install-extension $qwenExt --force 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[✓] Qwen Code Companion 扩展安装成功！" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[✗] Qwen Code Companion 扩展安装失败" -ForegroundColor Red
        Write-Host "    扩展ID: $qwenExt" -ForegroundColor Gray
        Write-Host "    提示: 如果扩展ID不正确，请访问 VS Code 扩展市场手动安装" -ForegroundColor Gray
        $failCount++
    }
} catch {
    Write-Host "[✗] Qwen Code Companion 扩展安装时发生错误: $_" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# 验证安装
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  验证安装结果..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$installedExtensions = & code --list-extensions 2>$null

if ($installedExtensions -match [regex]::Escape($vibeVideoExt)) {
    Write-Host "[✓] VibeVideo: 已安装" -ForegroundColor Green
} else {
    Write-Host "[✗] VibeVideo: 未找到" -ForegroundColor Red
}

if ($installedExtensions -match [regex]::Escape($qwenExt)) {
    Write-Host "[✓] Qwen Code Companion: 已安装" -ForegroundColor Green
} else {
    Write-Host "[✗] Qwen Code Companion: 未找到" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  安装完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "安装统计: 成功 $successCount 个, 失败 $failCount 个" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "1. 请重启 VS Code 以确保扩展正常工作" -ForegroundColor White
Write-Host "2. 如果扩展未正确安装，请手动在 VS Code 扩展市场搜索安装" -ForegroundColor White
Write-Host "3. VibeVideo 扩展ID: $vibeVideoExt" -ForegroundColor Gray
Write-Host "4. Qwen Code Companion 扩展ID: $qwenExt" -ForegroundColor Gray
Write-Host ""
Write-Host "VS Code 扩展市场链接：" -ForegroundColor Yellow
Write-Host "  VibeVideo: https://marketplace.visualstudio.com/items?itemName=$vibeVideoExt" -ForegroundColor Cyan
Write-Host "  Qwen Code Companion: https://marketplace.visualstudio.com/items?itemName=$qwenExt" -ForegroundColor Cyan
Write-Host ""

Read-Host "按 Enter 键退出"

