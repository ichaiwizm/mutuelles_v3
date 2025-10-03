#!/usr/bin/env bash
set -euo pipefail

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "Erreur: powershell.exe introuvable (exécuter sous WSL sur Windows)." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: admin/cli/run_hl_from_wsl.sh --platform <slug> --flow admin/flows/<platform>/<slug>.hl.json --lead admin/leads/<lead>.json [options...]" >&2
  exit 2
fi

WIN_PWD=$(wslpath -w "$PWD")

ARGS=("$@")
join_ps_args() {
  local out=(); for a in "$@"; do a=${a//"/\`"}; out+=("$a"); done; (IFS=' '; printf '%s' "${out[*]}")
}

PS_SET_ENV=""
if [[ -n "${FLOW_USERNAME:-}" ]]; then U=${FLOW_USERNAME//"/\`"}; PS_SET_ENV+="\$env:FLOW_USERNAME=\"$U\"; "; fi
if [[ -n "${FLOW_PASSWORD:-}" ]]; then P=${FLOW_PASSWORD//"/\`"}; PS_SET_ENV+="\$env:FLOW_PASSWORD=\"$P\"; "; fi

PS_ARGS=$(join_ps_args "${ARGS[@]}")

powershell.exe -NoProfile -NonInteractive -Command \
  "$PS_SET_ENV cd $WIN_PWD; npx --yes cross-env ELECTRON_RUN_AS_NODE=1 electron admin/cli/run_hl_flow.mjs $PS_ARGS"
