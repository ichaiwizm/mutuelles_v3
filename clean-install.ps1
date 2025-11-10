#!/usr/bin/env pwsh
# Script simple de nettoyage et reinstallation

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  NETTOYAGE EN COURS..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Etape 1 : Fermer tous les processus Electron
Write-Host ""
Write-Host "[1/3] Fermeture des processus Electron..." -ForegroundColor Yellow
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    $electronProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "      OK - Processus Electron arretes" -ForegroundColor Green
} else {
    Write-Host "      INFO - Aucun processus Electron actif" -ForegroundColor Gray
}

# Etape 2 : Supprimer node_modules
Write-Host ""
Write-Host "[2/3] Suppression de node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    try {
        Remove-Item -Path "node_modules" -Recurse -Force -Confirm:$false -ErrorAction Stop
        Write-Host "      OK - node_modules supprime" -ForegroundColor Green
    } catch {
        Write-Host "      ERREUR - Impossible de supprimer node_modules" -ForegroundColor Red
        Write-Host "      $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        
        # Identifier les processus qui pourraient bloquer les fichiers
        Write-Host "Recherche des processus bloquants..." -ForegroundColor Yellow
        Write-Host ""
        
        # Chercher tous les processus avec "node", "electron", "code" dans le nom
        $suspectProcesses = Get-Process | Where-Object {
            $_.ProcessName -match "node|electron|code|vscode|cursor"
        } | Select-Object ProcessName, Id, Path
        
        if ($suspectProcesses) {
            Write-Host "Processus suspects trouves :" -ForegroundColor Yellow
            Write-Host ""
            foreach ($proc in $suspectProcesses) {
                $procName = $proc.ProcessName
                $procId = $proc.Id
                $procPath = if ($proc.Path) { $proc.Path } else { "N/A" }
                
                Write-Host "  - Processus : $procName" -ForegroundColor Cyan
                Write-Host "    PID       : $procId" -ForegroundColor Cyan
                Write-Host "    Chemin    : $procPath" -ForegroundColor Gray
                Write-Host "    Commande  : taskkill /F /PID $procId" -ForegroundColor Green
                Write-Host ""
            }
            
            Write-Host "=============================================" -ForegroundColor Yellow
            Write-Host "COMMANDE POUR TUER TOUS LES PROCESSUS :" -ForegroundColor Yellow
            Write-Host "=============================================" -ForegroundColor Yellow
            $pids = ($suspectProcesses | ForEach-Object { $_.Id }) -join " /PID "
            $killCommand = "taskkill /F /PID $pids"
            Write-Host ""
            Write-Host $killCommand -ForegroundColor Green
            Write-Host ""
            Write-Host "=============================================" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Copiez-collez la commande ci-dessus dans le terminal," -ForegroundColor White
            Write-Host "puis relancez : npm run clean" -ForegroundColor White
        } else {
            Write-Host "Aucun processus suspect trouve." -ForegroundColor Gray
            Write-Host ""
            Write-Host "Le fichier pourrait etre bloque par :" -ForegroundColor Yellow
            Write-Host "  - Windows Defender / Antivirus" -ForegroundColor Gray
            Write-Host "  - Service d'indexation Windows" -ForegroundColor Gray
            Write-Host "  - Un service systeme" -ForegroundColor Gray
            Write-Host ""
            Write-Host "SOLUTION : Redemarrez l'ordinateur" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "ABANDON - Nettoyage annule" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "      INFO - node_modules n'existe pas" -ForegroundColor Gray
}

# Etape 3 : Reinstaller
Write-Host ""
Write-Host "[3/3] Installation des dependances..." -ForegroundColor Yellow
Write-Host ""
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERREUR - Installation echouee" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  SUCCES !" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
