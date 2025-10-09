# Guide : Afficher correctement les emojis et caractères UTF-8 dans PowerShell

## Pourquoi les caractères s'affichent mal ?

PowerShell Windows utilise par défaut l'encodage **CP850** (ou Windows-1252), qui ne supporte pas :
- Les emojis (🔍📊✅⚠️🎉💥📈)
- Les caractères de dessin Unicode (═)
- Les caractères accentués dans certains cas

## Solutions

### 🚀 Solution 1 : Utiliser Windows Terminal (RECOMMANDÉ)

**Windows Terminal** supporte nativement UTF-8 et les emojis.

1. **Installer Windows Terminal** :
   - Via le Microsoft Store : [Windows Terminal](https://aka.ms/terminal)
   - Ou via winget : `winget install Microsoft.WindowsTerminal`

2. **Ouvrir Windows Terminal** et lancer vos scripts normalement :
   ```powershell
   npm run leads:verify-all
   ```

✅ **Avantages** : Fonctionne immédiatement, support complet des emojis, meilleure expérience

---

### ⚡ Solution 2 : Configurer PowerShell temporairement

Exécuter cette commande **avant** de lancer vos scripts :

```powershell
chcp 65001
```

Ou utiliser le script fourni :

```powershell
.\scripts\setup_terminal_utf8.ps1
npm run leads:verify-all
```

❌ **Inconvénient** : À refaire à chaque nouvelle session PowerShell

---

### 🔧 Solution 3 : Configuration permanente de PowerShell

Ajouter l'encodage UTF-8 au profil PowerShell :

1. **Ouvrir le profil PowerShell** :
   ```powershell
   notepad $PROFILE
   ```
   
   Si le fichier n'existe pas :
   ```powershell
   New-Item -Path $PROFILE -ItemType File -Force
   notepad $PROFILE
   ```

2. **Ajouter ces lignes** au début du fichier :
   ```powershell
   # Forcer l'encodage UTF-8 pour tous les scripts
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   [Console]::InputEncoding = [System.Text.Encoding]::UTF8
   $OutputEncoding = [System.Text.Encoding]::UTF8
   chcp 65001 | Out-Null
   ```

3. **Sauvegarder** et **redémarrer PowerShell**

4. **Tester** :
   ```powershell
   npm run leads:verify-all
   ```

✅ **Avantages** : Configuration permanente, fonctionne pour tous les scripts

---

### 🎨 Solution 4 : Utiliser une meilleure police

Certaines polices ne supportent pas tous les emojis. Configurer une police qui les supporte :

**Polices recommandées** :
- **Cascadia Code** (incluse avec Windows Terminal)
- **JetBrains Mono**
- **Fira Code**
- **Consolas** (par défaut mais limitée)

**Dans PowerShell classique** :
1. Clic droit sur la barre de titre → Propriétés
2. Onglet "Police"
3. Choisir "Cascadia Code" ou "Cascadia Mono"

---

## Test rapide

Pour tester si votre terminal supporte UTF-8 :

```powershell
Write-Host "Test UTF-8: 🔍 📊 ✅ ⚠️ 🎉 💥 📈 ═══"
```

Si vous voyez les emojis correctement, c'est bon ! ✅

---

## Recommandation finale

**➡️ Utilisez Windows Terminal** : C'est la solution la plus simple et la plus moderne. Microsoft recommande maintenant Windows Terminal comme terminal par défaut.

Si vous ne pouvez pas installer Windows Terminal, utilisez la **Solution 3** (configuration permanente du profil PowerShell).

