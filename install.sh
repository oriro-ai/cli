#!/usr/bin/env bash
# ORIRO CLI installer (macOS / Linux). One file, no Node.js.
#   curl -fsSL https://oriro.ai/cli/install.sh | bash
set -euo pipefail

REPO="oriro-ai/cli"
BASE="${ORIRO_DOWNLOAD_BASE:-https://github.com/${REPO}/releases/latest/download}"
BIN_DIR="${ORIRO_BIN_DIR:-$HOME/.local/bin}"

say() { printf "  %s\n" "$1"; }
err() { printf "  error: %s\n" "$1" >&2; exit 1; }

# Detect platform + arch.
os="$(uname -s)"; arch="$(uname -m)"
case "$os" in
  Darwin) os="darwin" ;;
  Linux)  os="linux" ;;
  *) err "unsupported OS: $os (use the PowerShell installer on Windows)" ;;
esac
case "$arch" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) err "unsupported arch: $arch" ;;
esac

asset="oriro-${os}-${arch}.tar.gz"
url="${BASE}/${asset}"

say "ORIRO CLI — downloading ${os}-${arch}…"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/oriro.tar.gz" || err "download failed: $url"
tar -xzf "$tmp/oriro.tar.gz" -C "$tmp"

mkdir -p "$BIN_DIR"
# The archive contains `oriro` plus a `native/` sidecar folder; install both together.
cp -R "$tmp"/oriro "$tmp"/native "$BIN_DIR"/ 2>/dev/null || cp "$tmp"/oriro "$BIN_DIR"/oriro
chmod +x "$BIN_DIR/oriro"

say "Installed to ${BIN_DIR}/oriro"
case ":$PATH:" in
  *":$BIN_DIR:"*) : ;;
  *) say "Add to PATH:  export PATH=\"$BIN_DIR:\$PATH\"  (add to your ~/.bashrc or ~/.zshrc)" ;;
esac
say "Run:  oriro"
say "First launch picks your language and turns on Guardian automatically."
