#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/lib/docker-e2e-image.sh"
IMAGE_NAME="$(docker_e2e_resolve_image "oriro-plugins-e2e" ORIRO_PLUGINS_E2E_IMAGE)"
ORIRO_DOCKER_E2E_LOG_PRINT_BYTES="$(
  docker_e2e_read_positive_int_env ORIRO_DOCKER_E2E_LOG_PRINT_BYTES 65536
)"
ORIRO_HUB_PREFLIGHT_BODY_MAX_BYTES="$(
  docker_e2e_read_positive_int_env ORIRO_PLUGINS_E2E_ORIROHUB_PREFLIGHT_BODY_MAX_BYTES 1048576
)"
ORIRO_HUB_PREFLIGHT_TIMEOUT_MS="$(
  docker_e2e_read_positive_int_env ORIRO_PLUGINS_E2E_ORIROHUB_PREFLIGHT_TIMEOUT_MS 30000
)"
PLUGINS_CLI_TIMEOUT="${ORIRO_PLUGINS_CLI_TIMEOUT:-180s}"

docker_e2e_build_or_reuse "$IMAGE_NAME" plugins

ORIRO_TEST_STATE_SCRIPT_B64="$(docker_e2e_test_state_shell_b64 plugins empty)"
DOCKER_ENV_ARGS=(
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  -e "ORIRO_DOCKER_E2E_LOG_PRINT_BYTES=$ORIRO_DOCKER_E2E_LOG_PRINT_BYTES"
  -e "ORIRO_PLUGINS_E2E_ORIROHUB_PREFLIGHT_BODY_MAX_BYTES=$ORIRO_HUB_PREFLIGHT_BODY_MAX_BYTES"
  -e "ORIRO_PLUGINS_E2E_ORIROHUB_PREFLIGHT_TIMEOUT_MS=$ORIRO_HUB_PREFLIGHT_TIMEOUT_MS"
  -e "ORIRO_PLUGINS_CLI_TIMEOUT=$PLUGINS_CLI_TIMEOUT"
  -e "ORIRO_TEST_STATE_SCRIPT_B64=$ORIRO_TEST_STATE_SCRIPT_B64"
)
for env_name in \
  ORIRO_PLUGINS_E2E_ORIROHUB \
  ORIRO_PLUGINS_E2E_LIVE_ORIROHUB \
  ORIRO_PLUGINS_E2E_ORIROHUB_SPEC \
  ORIRO_PLUGINS_E2E_ORIROHUB_ID; do
  env_value="${!env_name:-}"
  if [[ -n "$env_value" && "$env_value" != "undefined" && "$env_value" != "null" ]]; then
    DOCKER_ENV_ARGS+=(-e "$env_name")
  fi
done
if [[ "${ORIRO_PLUGINS_E2E_LIVE_ORIROHUB:-0}" = "1" ]]; then
  for env_name in \
    ORIRO_ORIROHUB_URL \
    ORIROHUB_URL \
    ORIRO_ORIROHUB_TOKEN \
    ORIROHUB_TOKEN \
    ORIROHUB_AUTH_TOKEN \
    ORIRO_PLUGINS_E2E_LIVE_NPM_REGISTRY; do
    env_value="${!env_name:-}"
    if [[ -n "$env_value" && "$env_value" != "undefined" && "$env_value" != "null" ]]; then
      DOCKER_ENV_ARGS+=(-e "$env_name")
    fi
  done
fi

echo "Running plugins Docker E2E..."
docker_e2e_run_logged_print_with_harness \
  plugins-run \
  "${DOCKER_ENV_ARGS[@]}" \
  "$IMAGE_NAME" \
  bash scripts/e2e/lib/plugins/sweep.sh

echo "OK"
