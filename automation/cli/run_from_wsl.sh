#!/usr/bin/env bash
# Wrapper WSL -> PowerShell pour exécuter le runner CLI unifié côté Windows
# Credentials are read from .env file (no env propagation needed)

set -euo pipefail

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "Erreur: powershell.exe introuvable (exécuter sous WSL sur Windows)." >&2
  exit 1
fi

if [[ $# -lt 2 ]]; then
  echo "Usage: admin/cli/run_from_wsl.sh <platform> <flowSlugOrPath> [options...]" >&2
  echo "Exemple: admin/cli/run_from_wsl.sh alptis alptis_sante_select_pro_full --headless" >&2
  echo "" >&2
  echo "Credentials must be in .env file at project root." >&2
  exit 2
fi

# Convertit le cwd WSL en chemin Windows pour PowerShell
WIN_PWD=$(wslpath -w "$PWD")

# Construit la ligne d'arguments
CLI_ARGS=("$@")

# Assemblage sécurisé pour PowerShell
join_ps_args() {
  # échappe simplement les guillemets doubles pour PowerShell (\" → `")
  local out=()
  for a in "$@"; do
    a=${a//"/\`"}
    out+=("$a")
  done
  (IFS=' '; printf '%s' "${out[*]}")
}

PS_ARGS=$(join_ps_args "${CLI_ARGS[@]}")

# Exécute la commande dans PowerShell Windows
# .env sera lu directement par run.mjs côté Windows
powershell.exe -NoProfile -NonInteractive -Command \
  "cd $WIN_PWD; npx --yes cross-env ELECTRON_RUN_AS_NODE=1 electron admin/cli/run.mjs $PS_ARGS"
