#!/usr/bin/env bash
# OriroDock - Docker helpers for Oriro
# Inspired by Simon Willison's "Running Oriro in Docker"
# https://til.simonwillison.net/llms/oriro-docker
#
# Installation:
#   mkdir -p ~/.orirodock && curl -sL https://raw.githubusercontent.com/oriro/oriro/main/scripts/orirodock/orirodock-helpers.sh -o ~/.orirodock/orirodock-helpers.sh
#   echo 'source ~/.orirodock/orirodock-helpers.sh' >> ~/.zshrc
#
# Usage:
#   orirodock-help    # Show all available commands

# =============================================================================
# Colors
# =============================================================================
_CLR_RESET='\033[0m'
_CLR_BOLD='\033[1m'
_CLR_DIM='\033[2m'
_CLR_GREEN='\033[0;32m'
_CLR_YELLOW='\033[1;33m'
_CLR_BLUE='\033[0;34m'
_CLR_MAGENTA='\033[0;35m'
_CLR_CYAN='\033[0;36m'
_CLR_RED='\033[0;31m'

# Styled command output (green + bold)
_clr_cmd() {
  echo -e "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# Inline command for use in sentences
_cmd() {
  echo "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# =============================================================================
# Config
# =============================================================================
ORIRODOCK_CONFIG="${HOME}/.orirodock/config"

# Common paths to check for Oriro
ORIRODOCK_COMMON_PATHS=(
  "${HOME}/oriro"
  "${HOME}/workspace/oriro"
  "${HOME}/projects/oriro"
  "${HOME}/dev/oriro"
  "${HOME}/code/oriro"
  "${HOME}/src/oriro"
)

_orirodock_filter_warnings() {
  grep -v "^WARN\|^time="
}

_orirodock_trim_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  printf "%s" "$value"
}

_orirodock_mask_value() {
  local value="$1"
  local length=${#value}
  if (( length == 0 )); then
    printf "%s" "<empty>"
    return 0
  fi
  if (( length == 1 )); then
    printf "%s" "<redacted:1 char>"
    return 0
  fi
  printf "%s" "<redacted:${length} chars>"
}

_orirodock_browser_url_for_gateway_url() {
  local url="$1"
  case "$url" in
    http://127.0.0.1:18789*|http://localhost:18789*|https://127.0.0.1:18789*|https://localhost:18789*) ;;
    *)
      printf "%s" "$url"
      return 0
      ;;
  esac

  local published published_port
  published=$(_orirodock_compose port oriro-gateway 18789 2>/dev/null | head -n 1 | tr -d '\r')
  published_port="${published##*:}"
  if [[ ! "$published_port" =~ ^[0-9]+$ ]]; then
    printf "%s" "$url"
    return 0
  fi

  printf "%s" "${url/:18789/:${published_port}}"
}

_orirodock_read_config_dir() {
  if [[ ! -f "$ORIRODOCK_CONFIG" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^ORIRODOCK_DIR=//p' "$ORIRODOCK_CONFIG" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _orirodock_trim_quotes "$raw"
}

# Ensure ORIRODOCK_DIR is set and valid
_orirodock_ensure_dir() {
  # Already set and valid?
  if [[ -n "$ORIRODOCK_DIR" && -f "${ORIRODOCK_DIR}/docker-compose.yml" ]]; then
    return 0
  fi

  # Try loading from config
  local config_dir
  config_dir=$(_orirodock_read_config_dir)
  if [[ -n "$config_dir" && -f "${config_dir}/docker-compose.yml" ]]; then
    ORIRODOCK_DIR="$config_dir"
    return 0
  fi

  # Auto-detect from common paths
  local found_path=""
  for path in "${ORIRODOCK_COMMON_PATHS[@]}"; do
    if [[ -f "${path}/docker-compose.yml" ]]; then
      found_path="$path"
      break
    fi
  done

  if [[ -n "$found_path" ]]; then
    echo ""
    echo "ORIRO Found Oriro at: $found_path"
    echo -n "   Use this location? [Y/n] "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      echo ""
      echo "Set ORIRODOCK_DIR manually:"
      echo "  export ORIRODOCK_DIR=/path/to/oriro"
      return 1
    fi
    ORIRODOCK_DIR="$found_path"
  else
    echo ""
    echo "❌ Oriro not found in common locations."
    echo ""
    echo "Clone it first:"
    echo ""
    echo "  git clone https://github.com/oriro/oriro.git ~/oriro"
    echo "  cd ~/oriro && ./scripts/docker/setup.sh"
    echo ""
    echo "Or set ORIRODOCK_DIR if it's elsewhere:"
    echo ""
    echo "  export ORIRODOCK_DIR=/path/to/oriro"
    echo ""
    return 1
  fi

  # Save to config
  if [[ ! -d "${HOME}/.orirodock" ]]; then
    /bin/mkdir -p "${HOME}/.orirodock"
  fi
  echo "ORIRODOCK_DIR=\"$ORIRODOCK_DIR\"" > "$ORIRODOCK_CONFIG"
  echo "✅ Saved to $ORIRODOCK_CONFIG"
  echo ""
  return 0
}

# Wrapper to run docker compose commands
_orirodock_compose() {
  _orirodock_ensure_dir || return 1
  local compose_args=(-f "${ORIRODOCK_DIR}/docker-compose.yml")
  if [[ -f "${ORIRODOCK_DIR}/docker-compose.override.yml" ]]; then
    compose_args+=(-f "${ORIRODOCK_DIR}/docker-compose.override.yml")
  fi
  if [[ -f "${ORIRODOCK_DIR}/docker-compose.extra.yml" ]]; then
    compose_args+=(-f "${ORIRODOCK_DIR}/docker-compose.extra.yml")
  fi
  command docker compose "${compose_args[@]}" "$@"
}

_orirodock_read_env_token() {
  _orirodock_ensure_dir || return 1
  if [[ ! -f "${ORIRODOCK_DIR}/.env" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^ORIRO_GATEWAY_TOKEN=//p' "${ORIRODOCK_DIR}/.env" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _orirodock_trim_quotes "$raw"
}

# Basic Operations
orirodock-start() {
  _orirodock_compose up -d oriro-gateway
}

orirodock-stop() {
  _orirodock_compose down
}

orirodock-restart() {
  _orirodock_compose restart oriro-gateway
}

orirodock-logs() {
  _orirodock_compose logs -f oriro-gateway
}

orirodock-status() {
  _orirodock_compose ps
}

# Navigation
orirodock-cd() {
  _orirodock_ensure_dir || return 1
  cd "${ORIRODOCK_DIR}"
}

orirodock-config() {
  cd ~/.oriro
}

orirodock-show-config() {
  _orirodock_ensure_dir >/dev/null 2>&1 || true
  local config_dir="${HOME}/.oriro"
  echo -e "${_CLR_BOLD}Config directory:${_CLR_RESET} ${_CLR_CYAN}${config_dir}${_CLR_RESET}"
  echo ""

  # Show oriro.json
  if [[ -f "${config_dir}/oriro.json" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/oriro.json${_CLR_RESET}"
    echo -e "${_CLR_DIM}$(cat "${config_dir}/oriro.json")${_CLR_RESET}"
  else
    echo -e "${_CLR_YELLOW}No oriro.json found${_CLR_RESET}"
  fi
  echo ""

  # Show .env (mask secret values)
  if [[ -f "${config_dir}/.env" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_orirodock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${config_dir}/.env"
  else
    echo -e "${_CLR_YELLOW}No .env found${_CLR_RESET}"
  fi
  echo ""

  # Show project .env if available
  if [[ -n "$ORIRODOCK_DIR" && -f "${ORIRODOCK_DIR}/.env" ]]; then
    echo -e "${_CLR_BOLD}${ORIRODOCK_DIR}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_orirodock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${ORIRODOCK_DIR}/.env"
  fi
  echo ""
}

orirodock-workspace() {
  cd ~/.oriro/workspace
}

# Container Access
orirodock-shell() {
  _orirodock_compose exec oriro-gateway \
    bash -c 'echo "alias oriro=\"./oriro.mjs\"" > /tmp/.bashrc_oriro && bash --rcfile /tmp/.bashrc_oriro'
}

orirodock-exec() {
  _orirodock_compose exec oriro-gateway "$@"
}

orirodock-cli() {
  _orirodock_compose run --rm oriro-cli "$@"
}

# Maintenance
orirodock-update() {
  _orirodock_ensure_dir || return 1

  echo "🔄 Updating Oriro..."

  echo ""
  echo "📥 Pulling latest source..."
  git -C "${ORIRODOCK_DIR}" pull || { echo "❌ git pull failed"; return 1; }

  echo ""
  echo "🔨 Rebuilding Docker image (this may take a few minutes)..."
  _orirodock_compose build oriro-gateway || { echo "❌ Build failed"; return 1; }

  echo ""
  echo "♻️  Recreating container with new image..."
  _orirodock_compose down 2>&1 | _orirodock_filter_warnings
  _orirodock_compose up -d oriro-gateway 2>&1 | _orirodock_filter_warnings

  echo ""
  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Update complete!"
  echo -e "   Verify: $(_cmd orirodock-cli status)"
}

orirodock-rebuild() {
  _orirodock_compose build oriro-gateway
}

orirodock-clean() {
  _orirodock_compose down -v --remove-orphans
}

# Health check
orirodock-health() {
  _orirodock_ensure_dir || return 1
  local token
  token=$(_orirodock_read_env_token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${ORIRODOCK_DIR}/.env"
    return 1
  fi
  _orirodock_compose exec -e "ORIRO_GATEWAY_TOKEN=$token" oriro-gateway \
    node dist/index.js health
}

# Show gateway token
orirodock-token() {
  _orirodock_read_env_token
}

# Fix token configuration (run this once after setup)
orirodock-fix-token() {
  _orirodock_ensure_dir || return 1

  echo "🔧 Configuring gateway token..."
  local token
  token=$(orirodock-token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${ORIRODOCK_DIR}/.env"
    return 1
  fi

  echo "📝 Setting token: ${token:0:20}..."

  _orirodock_compose exec -e "TOKEN=$token" oriro-gateway \
    bash -c './oriro.mjs config set gateway.remote.token "$TOKEN" && ./oriro.mjs config set gateway.auth.token "$TOKEN"' 2>&1 | _orirodock_filter_warnings

  echo "🔍 Verifying token was saved..."
  local saved_token
  saved_token=$(_orirodock_compose exec oriro-gateway \
    bash -c "./oriro.mjs config get gateway.remote.token 2>/dev/null" 2>&1 | _orirodock_filter_warnings | tr -d '\r\n' | head -c 64)

  if [[ "$saved_token" == "$token" ]]; then
    echo "✅ Token saved correctly!"
  else
    echo "⚠️  Token mismatch detected"
    echo "   Expected: ${token:0:20}..."
    echo "   Got: ${saved_token:0:20}..."
  fi

  echo "🔄 Restarting gateway..."
  _orirodock_compose restart oriro-gateway 2>&1 | _orirodock_filter_warnings

  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Configuration complete!"
  echo -e "   Try: $(_cmd orirodock-devices)"
}

# Open dashboard in browser
orirodock-dashboard() {
  _orirodock_ensure_dir || return 1

  echo "ORIRO Getting dashboard URL..."
  local output exit_status url
  output=$(_orirodock_compose run --rm --no-deps oriro-cli dashboard --no-open 2>&1)
  exit_status=$?
  url=$(printf "%s\n" "$output" | _orirodock_filter_warnings | grep -o 'http[s]\?://[^[:space:]]*' | head -n 1)
  if [[ $exit_status -ne 0 ]]; then
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd orirodock-restart)"
    return 1
  fi

  if [[ -n "$url" ]]; then
    url=$(_orirodock_browser_url_for_gateway_url "$url")
    echo -e "✅ Opening: ${_CLR_CYAN}${url}${_CLR_RESET}"
    open "$url" 2>/dev/null || xdg-open "$url" 2>/dev/null || echo -e "   Please open manually: ${_CLR_CYAN}${url}${_CLR_RESET}"
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see ${_CLR_RED}'pairing required'${_CLR_CYAN} error:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd orirodock-devices)"
    echo "   2. Copy the Request ID from the Pending table"
    echo -e "   3. Run: $(_cmd 'orirodock-approve <request-id>')"
  else
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd orirodock-restart)"
  fi
}

# List device pairings
orirodock-devices() {
  _orirodock_ensure_dir || return 1

  echo "🔍 Checking device pairings..."
  local output exit_status
  output=$(_orirodock_compose exec oriro-gateway node dist/index.js devices list 2>&1)
  exit_status=$?
  printf "%s\n" "$output" | _orirodock_filter_warnings
  if [ $exit_status -ne 0 ]; then
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see token errors above:${_CLR_RESET}"
    echo -e "   1. Verify token is set: $(_cmd orirodock-token)"
    echo -e "   2. Try fixing the token automatically: $(_cmd orirodock-fix-token)"
    echo "   3. If you still see errors, try manual config inside container:"
    echo -e "      $(_cmd orirodock-shell)"
    echo -e "      $(_cmd 'oriro config get gateway.remote.token')"
    return 1
  fi

  echo ""
  echo -e "${_CLR_CYAN}💡 To approve a pairing request:${_CLR_RESET}"
  echo -e "   $(_cmd 'orirodock-approve <request-id>')"
}

# Approve device pairing request
orirodock-approve() {
  _orirodock_ensure_dir || return 1

  if [[ -z "$1" ]]; then
    echo -e "❌ Usage: $(_cmd 'orirodock-approve <request-id>')"
    echo ""
    echo -e "${_CLR_CYAN}💡 How to approve a device:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd orirodock-devices)"
    echo "   2. Find the Request ID in the Pending table (long UUID)"
    echo -e "   3. Run: $(_cmd 'orirodock-approve <that-request-id>')"
    echo ""
    echo "Example:"
    echo -e "   $(_cmd 'orirodock-approve 6f9db1bd-a1cc-4d3f-b643-2c195262464e')"
    return 1
  fi

  echo "✅ Approving device: $1"
  _orirodock_compose exec oriro-gateway \
    node dist/index.js devices approve "$1" 2>&1 | _orirodock_filter_warnings

  echo ""
  echo "✅ Device approved! Refresh your browser."
}

# Show all available orirodock helper commands
orirodock-help() {
  echo -e "\n${_CLR_BOLD}${_CLR_CYAN}ORIRO OriroDock - Docker Helpers for Oriro${_CLR_RESET}\n"

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚡ Basic Operations${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-start)       ${_CLR_DIM}Start the gateway${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-stop)        ${_CLR_DIM}Stop the gateway${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-restart)     ${_CLR_DIM}Restart the gateway${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-status)      ${_CLR_DIM}Check container status${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-logs)        ${_CLR_DIM}View live logs (follows)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🐚 Container Access${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-shell)       ${_CLR_DIM}Shell into container (oriro alias ready)${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-cli)         ${_CLR_DIM}Run CLI commands (e.g., orirodock-cli status)${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-exec) ${_CLR_CYAN}<cmd>${_CLR_RESET}  ${_CLR_DIM}Execute command in gateway container${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🌐 Web UI & Devices${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-dashboard)   ${_CLR_DIM}Open web UI in browser ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-devices)     ${_CLR_DIM}List device pairings ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-approve) ${_CLR_CYAN}<id>${_CLR_RESET} ${_CLR_DIM}Approve device pairing ${_CLR_CYAN}(with examples)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚙️  Setup & Configuration${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-fix-token)   ${_CLR_DIM}Configure gateway token ${_CLR_CYAN}(run once)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🔧 Maintenance${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-update)      ${_CLR_DIM}Pull, rebuild, and restart ${_CLR_CYAN}(one-command update)${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-rebuild)     ${_CLR_DIM}Rebuild Docker image only${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-clean)       ${_CLR_RED}⚠️  Remove containers & volumes (nuclear)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🛠️  Utilities${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-health)      ${_CLR_DIM}Run health check${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-token)       ${_CLR_DIM}Show gateway auth token${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-cd)          ${_CLR_DIM}Jump to oriro project directory${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-config)      ${_CLR_DIM}Open config directory (~/.oriro)${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-show-config) ${_CLR_DIM}Print config files with redacted values${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-workspace)   ${_CLR_DIM}Open workspace directory${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo -e "${_CLR_BOLD}${_CLR_GREEN}🚀 First Time Setup${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  1.${_CLR_RESET} $(_cmd orirodock-start)          ${_CLR_DIM}# Start the gateway${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  2.${_CLR_RESET} $(_cmd orirodock-fix-token)      ${_CLR_DIM}# Configure token${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  3.${_CLR_RESET} $(_cmd orirodock-dashboard)      ${_CLR_DIM}# Open web UI${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  4.${_CLR_RESET} $(_cmd orirodock-devices)        ${_CLR_DIM}# If pairing needed${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  5.${_CLR_RESET} $(_cmd orirodock-approve) ${_CLR_CYAN}<id>${_CLR_RESET}   ${_CLR_DIM}# Approve pairing${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_GREEN}💬 WhatsApp Setup${_CLR_RESET}"
  echo -e "  $(_cmd orirodock-shell)"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'oriro channels login --channel whatsapp')"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'oriro status')"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_CYAN}💡 All commands guide you through next steps!${_CLR_RESET}"
  echo -e "${_CLR_BLUE}📚 Docs: ${_CLR_RESET}${_CLR_CYAN}https://docs.oriro.ai${_CLR_RESET}"
  echo ""
}
