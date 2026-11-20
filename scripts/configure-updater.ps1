# Run once from the repository root:
# powershell -ExecutionPolicy Bypass -File .\scripts\configure-updater.ps1 -Repository "OWNER/REPO"
param(
    [Parameter(Mandatory=$true)][string]$Repository,
    [string]$PublicKeyFile = "$HOME\.tauri\berloga.key.pub"
)
$ErrorActionPreference = "Stop"
if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    throw 'Repository must have the format OWNER/REPO'
}
if (-not (Test-Path $PublicKeyFile)) {
    throw "Public key not found: $PublicKeyFile. Generate it first: npm run tauri signer generate -- -w `"$HOME\.tauri\berloga.key`""
}
$path = Join-Path (Split-Path $PSScriptRoot -Parent) 'src-tauri\tauri.conf.json'
if (-not (Test-Path $path)) { throw "Missing $path. Run this script inside the Berloga repository." }
$config = Get-Content $path -Raw | ConvertFrom-Json
$key = (Get-Content $PublicKeyFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($key)) { throw "Public key file is empty: $PublicKeyFile" }
if (-not $config.plugins) { $config | Add-Member -NotePropertyName plugins -NotePropertyValue ([pscustomobject]@{}) }
$updater = [pscustomobject]@{
    pubkey = $key
    endpoints = @("https://github.com/$Repository/releases/latest/download/latest.json")
    windows = [pscustomobject]@{ installMode = 'passive' }
}
if ($config.plugins.PSObject.Properties.Name -contains 'updater') {
    $config.plugins.updater = $updater
} else {
    $config.plugins | Add-Member -NotePropertyName updater -NotePropertyValue $updater
}
if (-not ($config.bundle.PSObject.Properties.Name -contains 'createUpdaterArtifacts')) {
    $config.bundle | Add-Member -NotePropertyName createUpdaterArtifacts -NotePropertyValue $true
} else { $config.bundle.createUpdaterArtifacts = $true }
[System.IO.File]::WriteAllText($path, ($config | ConvertTo-Json -Depth 32), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Updater configured for $Repository" -ForegroundColor Green
Write-Host 'Do not commit the private key. Add TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD to GitHub Secrets.'
