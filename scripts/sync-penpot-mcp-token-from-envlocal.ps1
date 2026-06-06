# Copies PENPOT_MCP_USER_TOKEN from repo .env.local into the Windows *User* environment
# variable of the same name, so Cursor MCP can resolve ${env:PENPOT_MCP_USER_TOKEN} in
# .cursor/mcp.json (Cursor does not load .env.local for remote HTTP MCP URLs).
# Run from repo root after rotating the token in .env.local, then fully restart Cursor.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $repoRoot ".env.local"

if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Error "Missing file: $envPath"
    exit 1
}

$content = Get-Content -LiteralPath $envPath -Raw
$prefix = "PENPOT_MCP_USER_TOKEN="
$token = $null

foreach ($line in $content -split "`r?`n") {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith("#")) { continue }
    if ($t.StartsWith($prefix)) {
        $token = $t.Substring($prefix.Length).Trim()
        if (
            ($token.Length -ge 2 -and $token.StartsWith('"') -and $token.EndsWith('"')) -or
            ($token.Length -ge 2 -and $token.StartsWith("'") -and $token.EndsWith("'"))
        ) {
            $token = $token.Substring(1, $token.Length - 2)
        }
        break
    }
}

if (-not $token) {
    Write-Error "No line starting with PENPOT_MCP_USER_TOKEN= found in .env.local"
    exit 1
}

[Environment]::SetEnvironmentVariable("PENPOT_MCP_USER_TOKEN", $token, "User")
Write-Host "Updated User environment variable PENPOT_MCP_USER_TOKEN from .env.local (length $($token.Length))."
Write-Host "Fully quit and restart Cursor so MCP picks up the new value."
