# ORIRO CLI installer (Windows). One file, no Node.js.
#   irm https://oriro.ai/cli/install.ps1 | iex
$ErrorActionPreference = "Stop"

$Repo = "oriro-ai/cli"
$Base = if ($env:ORIRO_DOWNLOAD_BASE) { $env:ORIRO_DOWNLOAD_BASE } else { "https://github.com/$Repo/releases/latest/download" }
$Dir  = if ($env:ORIRO_BIN_DIR) { $env:ORIRO_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\oriro" }

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$asset = "oriro-win32-$arch.zip"
$url = "$Base/$asset"

Write-Host "  ORIRO CLI - downloading win32-$arch..."
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("oriro-" + [guid]::NewGuid())) -Force
try {
  $zip = Join-Path $tmp "oriro.zip"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $tmp -Force

  New-Item -ItemType Directory -Path $Dir -Force | Out-Null
  # The archive contains oriro.exe plus a native\ sidecar folder; copy both.
  Copy-Item -Path (Join-Path $tmp "oriro.exe") -Destination $Dir -Force
  if (Test-Path (Join-Path $tmp "native")) {
    Copy-Item -Path (Join-Path $tmp "native") -Destination $Dir -Recurse -Force
  }

  # Add to the user PATH if missing.
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$Dir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$Dir", "User")
    Write-Host "  Added $Dir to your PATH (restart your terminal to use 'oriro')."
  }
  Write-Host "  Installed to $Dir\oriro.exe"
  Write-Host "  Run:  oriro"
  Write-Host "  First launch picks your language and turns on Guardian automatically."
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
