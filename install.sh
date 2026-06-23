#!/usr/bin/env sh
# ORIRO CLI installer (macOS / Linux) — prebuilt npm package, NO compiled binary, NO code signing.
#   curl -fsSL https://oriro.ai/cli/install.sh | bash
#
# Installs ORIRO as a prebuilt npm package (the `oriro-<version>.tgz` from `npm pack`,
# which already contains dist/; native deps are auto-fetched by npm on install).
# Requires a JS runtime (npm preferred; bun fallback). Never compiles, never signs.
set -eu

REPO="${ORIRO_REPO:-oriro-ai/cli}"
API="https://api.github.com/repos/${REPO}/releases/latest"

say()  { printf "  %s\n" "$1"; }
warn() { printf "  warning: %s\n" "$1" >&2; }
err()  { printf "  error: %s\n" "$1" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# --- 1. Require a JS runtime ------------------------------------------------
# Prefer npm. If no JS runtime at all, point at the zero-Node bun one-liner.
PM=""
if have npm; then
  PM="npm"
elif have pnpm; then
  PM="pnpm"
elif have bun; then
  PM="bun"
else
  say "No JavaScript runtime found (need npm, pnpm, or bun)."
  say "Install bun (no Node.js required), then install ORIRO globally:"
  say ""
  say "    curl -fsSL https://bun.sh/install | bash && bun install -g @oriro/cli"
  say ""
  say "Then re-run this installer, or just use the bun command above."
  exit 0
fi

# --- 2. Resolve an optional GitHub token (private repo download) ------------
# Public repo works with NO token. Order: ORIRO_GITHUB_TOKEN > GITHUB_TOKEN > gh auth token.
TOKEN="${ORIRO_GITHUB_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ] && have gh; then
  TOKEN="$(gh auth token 2>/dev/null || true)"
fi

have curl || err "curl is required."

# Auth-aware curl wrapper. Token (if any) is passed via header and never echoed.
auth_curl() {
  # usage: auth_curl <accept-header> <url> [extra curl args...]
  _accept="$1"; _url="$2"; shift 2
  if [ -n "$TOKEN" ]; then
    curl -fsSL -H "Authorization: Bearer ${TOKEN}" -H "Accept: ${_accept}" \
         -H "X-GitHub-Api-Version: 2022-11-28" "$@" "$_url"
  else
    curl -fsSL -H "Accept: ${_accept}" -H "X-GitHub-Api-Version: 2022-11-28" "$@" "$_url"
  fi
}

# --- 3. Find and download the .tgz release asset ---------------------------
tmp="$(mktemp -d 2>/dev/null || mktemp -d -t oriro)"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "ORIRO CLI — querying latest release of ${REPO}…"
release_json="$tmp/release.json"
if ! auth_curl "application/vnd.github+json" "$API" -o "$release_json"; then
  if [ -z "$TOKEN" ]; then
    err "could not read latest release. The repo may be private — set ORIRO_GITHUB_TOKEN (or GITHUB_TOKEN, or run 'gh auth login')."
  fi
  err "could not read latest release (check that your token has access to ${REPO})."
fi

# Extract, for the first asset whose name ends in .tgz, either its asset API "url"
# (streams the binary with an auth header on private repos) or its "name".
read_asset() {
  # $1 = key to extract (url|name)
  if have node; then
    node -e '
      const fs=require("fs");
      const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
      const a=(r.assets||[]).find(x=>/\.tgz$/.test(x.name||""));
      if(!a){process.exit(3);}
      process.stdout.write(String(a[process.argv[2]]||""));
    ' "$release_json" "$1" 2>/dev/null
  elif have python3; then
    python3 - "$release_json" "$1" <<'PY' 2>/dev/null
import json,sys
r=json.load(open(sys.argv[1]))
a=next((x for x in r.get("assets",[]) if str(x.get("name","")).endswith(".tgz")),None)
if not a: sys.exit(3)
sys.stdout.write(str(a.get(sys.argv[2],"")))
PY
  else
    # Minimal awk fallback for the GitHub releases JSON shape (one field per line).
    awk -v key="$1" '
      /"url":/ {url=$0}
      /"name":/ {name=$0}
      /\.tgz"/ {
        line=(key=="name")?name:url;
        gsub(/.*: *"/,"",line); gsub(/".*/,"",line); print line; exit
      }
    ' "$release_json"
  fi
}

asset_api_url="$(read_asset url || true)"
asset_name="$(read_asset name || true)"
[ -n "$asset_api_url" ] || err "no .tgz asset found on the latest release of ${REPO}."
[ -n "$asset_name" ] || asset_name="oriro.tgz"

tgz="$tmp/$asset_name"
say "Downloading ${asset_name}…"
# Asset API URL + Accept: application/octet-stream so private-repo assets stream as bytes.
if ! auth_curl "application/octet-stream" "$asset_api_url" -o "$tgz"; then
  err "download failed for ${asset_name}."
fi
[ -s "$tgz" ] || err "downloaded asset is empty."

# --- 4. Install the prebuilt package globally ------------------------------
say "Installing with ${PM} (prebuilt package — no compile, no signing)…"
case "$PM" in
  npm)  npm  i   -g "$tgz" ;;
  pnpm) pnpm add -g "$tgz" ;;
  bun)  bun  add -g "$tgz" ;;
esac

# --- 5. Verify -------------------------------------------------------------
if have oriro; then
  say "Installed: $(oriro --version 2>/dev/null || echo 'oriro')"
  say "Run:  oriro"
  say "First launch picks your language and turns on Guardian automatically."
else
  warn "Installed, but 'oriro' is not on PATH yet — open a new terminal, or check your global bin (e.g. 'npm bin -g')."
fi
