# Script pour configurer PowerShell en UTF-8
# Exécuter avant de lancer les scripts Node.js

Write-Host "Configuration de PowerShell pour UTF-8..." -ForegroundColor Cyan

# Changer l'encodage de la console en UTF-8 (65001)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
chcp 65001 | Out-Null

Write-Host "✓ Encodage UTF-8 activé pour cette session" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Cette configuration est temporaire." -ForegroundColor Yellow
Write-Host "Pour une configuration permanente, ajoutez ces lignes à votre profil PowerShell:" -ForegroundColor Yellow
Write-Host ""
Write-Host '$PROFILE contient:' -ForegroundColor Cyan
Write-Host '  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8' -ForegroundColor Gray
Write-Host '  chcp 65001 | Out-Null' -ForegroundColor Gray
Write-Host ""

