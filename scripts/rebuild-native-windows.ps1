# Rebuild native modules for Windows
# Run this from PowerShell if you get NODE_MODULE_VERSION errors

Write-Host "🔧 Rebuilding better-sqlite3 for Windows Node.js..." -ForegroundColor Cyan

# Kill any processes that might lock the file
Write-Host "Closing any running Electron processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*electron*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Rebuild
Write-Host "Running npm rebuild better-sqlite3..." -ForegroundColor Yellow
npm rebuild better-sqlite3

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Rebuild successful!" -ForegroundColor Green
    Write-Host "You can now run the CLI from WSL: npm run flow:run ..." -ForegroundColor Green
} else {
    Write-Host "❌ Rebuild failed. Try closing all Electron/Node processes manually and run again." -ForegroundColor Red
    exit 1
}
