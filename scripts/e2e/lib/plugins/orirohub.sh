run_plugins_orirohub_scenario() {
  if [ "${ORIRO_PLUGINS_E2E_ORIROHUB:-1}" = "0" ]; then
    echo "Skipping OriroHub plugin install and uninstall (ORIRO_PLUGINS_E2E_ORIROHUB=0)."
  else
    echo "Testing OriroHub plugin install and uninstall..."
    ORIROHUB_PLUGIN_SPEC="${ORIRO_PLUGINS_E2E_ORIROHUB_SPEC:-orirohub:@oriro/kitchen-sink}"
    ORIROHUB_PLUGIN_ID="${ORIRO_PLUGINS_E2E_ORIROHUB_ID:-oriro-kitchen-sink-fixture}"
    export ORIROHUB_PLUGIN_SPEC ORIROHUB_PLUGIN_ID

    start_orirohub_fixture_server() {
      local fixture_dir="$1"
      local server_log="$fixture_dir/orirohub-fixture.log"
      local server_port_file="$fixture_dir/orirohub-fixture-port"
      local server_pid_file="$fixture_dir/orirohub-fixture-pid"

      oriro_plugins_validate_fixture_log_print_bytes || return $?

      node scripts/e2e/lib/orirohub-fixture-server.cjs plugins "$server_port_file" >"$server_log" 2>&1 &
      local server_pid="$!"
      echo "$server_pid" >"$server_pid_file"
      oriro_plugins_register_fixture_pid_file "$server_pid_file"

      for _ in $(seq 1 100); do
        if [[ -s "$server_port_file" ]]; then
          export ORIRO_ORIROHUB_URL="http://127.0.0.1:$(cat "$server_port_file")"
          return 0
        fi
        if ! kill -0 "$server_pid" 2>/dev/null; then
          oriro_plugins_print_fixture_log "$server_log"
          return 1
        fi
        sleep 0.1
      done

      oriro_plugins_print_fixture_log "$server_log"
      echo "Timed out waiting for OriroHub fixture server." >&2
      return 1
    }

    if [[ "${ORIRO_PLUGINS_E2E_LIVE_ORIROHUB:-0}" = "1" ]]; then
      export ORIRO_ORIROHUB_URL="${ORIRO_ORIROHUB_URL:-${ORIROHUB_URL:-https://orirohub.ai}}"
      export NPM_CONFIG_REGISTRY="${ORIRO_PLUGINS_E2E_LIVE_NPM_REGISTRY:-https://registry.npmjs.org/}"
    else
      # Keep the release-path smoke hermetic; live OriroHub can rate-limit CI.
      if [[ -n "${ORIRO_ORIROHUB_URL:-}" || -n "${ORIROHUB_URL:-}" ]]; then
        echo "Ignoring ambient OriroHub URL for fixture-mode plugin E2E; set ORIRO_PLUGINS_E2E_LIVE_ORIROHUB=1 for live OriroHub."
      fi
      unset ORIRO_ORIROHUB_URL ORIROHUB_URL
      orirohub_fixture_dir="$(mktemp -d "$ORIRO_PLUGINS_TMP_DIR/oriro-orirohub-fixture.XXXXXX")"
      local fixture_status=0
      start_orirohub_fixture_server "$orirohub_fixture_dir" || fixture_status="$?"
      if [[ "$fixture_status" -ne 0 ]]; then
        return "$fixture_status"
      fi
    fi

    node scripts/e2e/lib/plugins/assertions.mjs orirohub-preflight

    run_plugins_oriro_logged install-orirohub plugins install "$ORIROHUB_PLUGIN_SPEC"
    run_plugins_oriro_capture "$ORIRO_PLUGINS_TMP_DIR/plugins-orirohub-installed.json" plugins list --json
    run_plugins_oriro_capture "$ORIRO_PLUGINS_TMP_DIR/plugins-orirohub-inspect.json" plugins inspect "$ORIROHUB_PLUGIN_ID" --json

    node scripts/e2e/lib/plugins/assertions.mjs orirohub-installed

    oriro_e2e_maybe_timeout "$ORIRO_PLUGINS_CLI_TIMEOUT" node "$ORIRO_ENTRY" plugins update "$ORIROHUB_PLUGIN_ID" >"$ORIRO_PLUGINS_TMP_DIR/plugins-orirohub-update.log" 2>&1
    run_plugins_oriro_capture "$ORIRO_PLUGINS_TMP_DIR/plugins-orirohub-updated.json" plugins list --json
    run_plugins_oriro_capture "$ORIRO_PLUGINS_TMP_DIR/plugins-orirohub-updated-inspect.json" plugins inspect "$ORIROHUB_PLUGIN_ID" --json

    node scripts/e2e/lib/plugins/assertions.mjs orirohub-updated

    run_plugins_oriro_logged uninstall-orirohub plugins uninstall "$ORIROHUB_PLUGIN_SPEC" --force
    run_plugins_oriro_capture "$ORIRO_PLUGINS_TMP_DIR/plugins-orirohub-uninstalled.json" plugins list --json

    node scripts/e2e/lib/plugins/assertions.mjs orirohub-removed
  fi
}
