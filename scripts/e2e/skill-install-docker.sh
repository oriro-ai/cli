#!/usr/bin/env bash
# Installs a prepared Oriro npm tarball in Docker and proves live OriroHub
# skill install works while uploaded archive installs stay disabled.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/lib/docker-e2e-image.sh"
source "$ROOT_DIR/scripts/lib/docker-e2e-package.sh"

IMAGE_NAME="$(docker_e2e_resolve_image "oriro-skill-install-e2e" ORIRO_SKILL_INSTALL_E2E_IMAGE)"
cleanup() {
  docker_e2e_cleanup_package_tgz "${PACKAGE_TGZ:-}"
}
trap cleanup EXIT

PACKAGE_TGZ="$(docker_e2e_prepare_package_tgz skill-install "${ORIRO_CURRENT_PACKAGE_TGZ:-}")"
ORIRO_TEST_STATE_SCRIPT_B64="$(docker_e2e_test_state_shell_b64 skill-install empty)"

docker_e2e_package_mount_args "$PACKAGE_TGZ"
docker_e2e_build_or_reuse "$IMAGE_NAME" skill-install "$ROOT_DIR/scripts/e2e/Dockerfile" "$ROOT_DIR" "bare"

echo "Running live OriroHub skill install Docker E2E..."
run_logged_print \
  skill-install-run \
  docker_e2e_run_with_harness \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e "ORIRO_TEST_STATE_SCRIPT_B64=$ORIRO_TEST_STATE_SCRIPT_B64" \
  -e "ORIRO_SKILL_INSTALL_E2E_QUERY=${ORIRO_SKILL_INSTALL_E2E_QUERY:-homeassistant}" \
  -e "ORIRO_SKILL_INSTALL_E2E_SLUG=${ORIRO_SKILL_INSTALL_E2E_SLUG:-}" \
  -e "ORIRO_SKILL_INSTALL_E2E_PREFERRED_SLUG=${ORIRO_SKILL_INSTALL_E2E_PREFERRED_SLUG:-homeassistant-skill}" \
  "${DOCKER_E2E_PACKAGE_ARGS[@]}" \
  "$IMAGE_NAME" \
  bash scripts/e2e/lib/skills/orirohub-install-proof.sh
