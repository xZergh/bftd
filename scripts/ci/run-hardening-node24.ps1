$ErrorActionPreference = "Stop"

$nodeVersion = "24.14.1"
$cursorHelperPath = "c:\Users\infar\AppData\Local\Programs\cursor\resources\app\resources\helpers;"

nvm use $nodeVersion | Out-Null

$nvmRoot = (nvm root | Select-String "Current Root:\s*(.+)$").Matches[0].Groups[1].Value.Trim()
if ([string]::IsNullOrWhiteSpace($nvmRoot)) {
  throw "Unable to resolve nvm root."
}

$nodeDir = Join-Path $nvmRoot "v$nodeVersion"
if (-not (Test-Path $nodeDir)) {
  throw "Node v$nodeVersion is not installed under nvm. Install it with: nvm install $nodeVersion"
}

$env:Path = "$nodeDir;" + ($env:Path -replace [regex]::Escape($cursorHelperPath), "")

Write-Host "Using node: $(node -v)"
Write-Host "Using npm: $(npm -v)"

npm run ci:hardening
