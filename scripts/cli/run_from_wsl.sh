#!/usr/bin/env bash
# Wrapper WSL -> PowerShell pour exécuter le runner CLI côté Windows
# Objectif: reproduire l'exécution PowerShell (Chrome/Playwright natifs Windows)
# sans toucher à la DB et en gardant les secrets hors de la ligne de commande.

set -euo pipefail

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "Erreur: powershell.exe introuvable (exécuter sous WSL sur Windows)." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/cli/run_from_wsl.sh <slug|--file flow.json> [options...]" >&2
  echo "Exemple: scripts/cli/run_from_wsl.sh alptis_login --mode headless --report html" >&2
  exit 2
fi

# Convertit le cwd WSL en chemin Windows pour PowerShell
WIN_PWD=$(wslpath -w "$PWD")

# Premier argument: slug ou --file
FIRST_ARG=$1; shift || true

# Construit la ligne d'arguments pour le script electron
CLI_ARGS=()
CLI_ARGS+=("$FIRST_ARG")
while [[ $# -gt 0 ]]; do
  CLI_ARGS+=("$1"); shift
done

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

PS_SET_ENV=""
if [[ -n "${FLOW_USERNAME:-}" ]]; then
  U=${FLOW_USERNAME//"/\`"}
  PS_SET_ENV+="$env:FLOW_USERNAME=\"$U\"; "
fi
if [[ -n "${FLOW_PASSWORD:-}" ]]; then
  P=${FLOW_PASSWORD//"/\`"}
  PS_SET_ENV+="$env:FLOW_PASSWORD=\"$P\"; "
fi

PS_ARGS=$(join_ps_args "${CLI_ARGS[@]}")

# Exécute la commande dans PowerShell Windows
powershell.exe -NoProfile -NonInteractive -Command \
  "$PS_SET_ENV cd $WIN_PWD; npx --yes cross-env ELECTRON_RUN_AS_NODE=1 electron scripts/cli/run_flow.mjs $PS_ARGS"

