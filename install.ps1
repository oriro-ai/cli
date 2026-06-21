# ORIRO CLI installer (Windows) — prebuilt npm package, NO compiled binary, NO code signing.
#   irm https://oriro.ai/cli/install.ps1 | iex
#
# Installs ORIRO as a prebuilt npm package (the `oriro-<version>.tgz` from `npm pack`,
# which already contains dist\; native deps are auto-fetched by npm on install).
# Requires a JS runtime (npm preferred; bun fallback). Never compiles, never signs.
$ErrorActionPreference = "Stop"

$Repo = if ($env:ORIRO_REPO) { $env:ORIRO_REPO } else { "oriro-ai/cli" }
$Api  = "https://api.github.com/repos/$Repo/releases/latest"

function Have($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

# --- 1. Require a JS runtime ------------------------------------------------
$PM = $null
if     (Have npm)  { $PM = "npm" }
elseif (Have pnpm) { $PM = "pnpm" }
elseif (Have bun)  { $PM = "bun" }
else {
  Write-Host "  No JavaScript runtime found (need npm, pnpm, or bun)."
  Write-Host "  Install bun (no Node.js required), then install ORIRO globally:"
  Write-Host ""
  Write-Host '    irm https://bun.sh/install.ps1 | iex; bun install -g oriro'
  Write-Host ""
  Write-Host "  Then re-run this installer, or just use the bun command above."
  return
}

# --- 2. Resolve an optional GitHub token (private repo download) ------------
# Public repo works with NO token. Order: ORIRO_GITHUB_TOKEN > GITHUB_TOKEN > gh auth token.
$Token = if ($env:ORIRO_GITHUB_TOKEN) { $env:ORIRO_GITHUB_TOKEN }
         elseif ($env:GITHUB_TOKEN)   { $env:GITHUB_TOKEN }
         else { $null }
if (-not $Token -and (Have gh)) {
  try { $Token = (gh auth token 2>$null) } catch { $Token = $null }
  if ($Token) { $Token = $Token.Trim() }
}

# Header builder (token, if any, lives only in this hashtable — never printed).
function Auth-Headers($accept) {
  $h = @{ "Accept" = $accept; "X-GitHub-Api-Version" = "2022-11-28"; "User-Agent" = "oriro-installer" }
  if ($Token) { $h["Authorization"] = "Bearer $Token" }
  return $h
}

# --- 3. Find and download the .tgz release asset ---------------------------
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("oriro-" + [guid]::NewGuid())) -Force
try {
  Write-Host "  ORIRO CLI - querying latest release of $Repo..."
  try {
    $release = Invoke-RestMethod -Uri $Api -Headers (Auth-Headers "application/vnd.github+json")
  } catch {
    if (-not $Token) {
      throw "Could not read latest release. The repo may be private - set `$env:ORIRO_GITHUB_TOKEN (or GITHUB_TOKEN, or run 'gh auth login')."
    }
    throw "Could not read latest release (check that your token has access to $Repo)."
  }

  $asset = $release.assets | Where-Object { $_.name -like "*.tgz" } | Select-Object -First 1
  if (-not $asset) { throw "No .tgz asset found on the latest release of $Repo." }

  $tgz = Join-Path $tmp $asset.name
  Write-Host ("  Downloading {0}..." -f $asset.name)
  # Asset API URL + Accept: application/octet-stream so private-repo assets stream as bytes.
  Invoke-WebRequest -Uri $asset.url -Headers (Auth-Headers "application/octet-stream") -OutFile $tgz -UseBasicParsing
  if (-not (Test-Path $tgz) -or (Get-Item $tgz).Length -eq 0) { throw "Downloaded asset is empty." }

  # --- 4. Install the prebuilt package globally ----------------------------
  Write-Host "  Installing with $PM (prebuilt package - no compile, no signing)..."
  switch ($PM) {
    "npm"  { & npm  i   -g $tgz }
    "pnpm" { & pnpm add -g $tgz }
    "bun"  { & bun  add -g $tgz }
  }
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "$PM install failed (exit $LASTEXITCODE)." }

  # --- 5. Verify -----------------------------------------------------------
  if (Have oriro) {
    $ver = try { (& oriro --version) 2>$null } catch { "oriro" }
    Write-Host ("  Installed: {0}" -f $ver)
    Write-Host "  Run:  oriro"
    Write-Host "  First launch picks your language and turns on Guardian automatically."
  } else {
    Write-Host "  Installed, but 'oriro' is not on PATH yet - open a new terminal (npm global bin may need a shell restart)."
  }
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
