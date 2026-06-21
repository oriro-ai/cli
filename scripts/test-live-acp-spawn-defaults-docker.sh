#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${ORIRO_LIVE_ACP_BIND_AGENTS:-}" && "${ORIRO_LIVE_ACP_BIND_AGENTS}" != "codex" ]]; then
  echo "ERROR: ACP spawn defaults Docker test supports only ORIRO_LIVE_ACP_BIND_AGENTS=codex." >&2
  exit 1
fi

export ORIRO_LIVE_ACP_BIND_AGENTS=codex
export ORIRO_LIVE_ACP_BIND_TEST_FILES="${ORIRO_LIVE_ACP_BIND_TEST_FILES:-src/gateway/gateway-acp-spawn-defaults.live.test.ts}"
export ORIRO_LIVE_ACP_SPAWN_DEFAULTS=1
export ORIRO_LIVE_ACP_SPAWN_DEFAULTS_MODEL="${ORIRO_LIVE_ACP_SPAWN_DEFAULTS_MODEL:-openai/gpt-5.5}"
export ORIRO_LIVE_ACP_SPAWN_DEFAULTS_THINKING="${ORIRO_LIVE_ACP_SPAWN_DEFAULTS_THINKING:-high}"
export ORIRO_LIVE_ACP_BIND_CODEX_MODEL="${ORIRO_LIVE_ACP_BIND_CODEX_MODEL:-gpt-5.5}"

exec bash "$SCRIPT_DIR/test-live-acp-bind-docker.sh"
