# Windows installer for ASPPM. Run it from PowerShell, in the project folder:
#     powershell -ExecutionPolicy Bypass -File .\setup.ps1
#
# It checks for Node.js and PostgreSQL, offers to install whichever is missing (using winget,
# which comes with Windows 10/11), then installs the project and runs  npm run setup.
# It is safe to run again: anything already installed or configured is skipped.
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Update-SessionPath {
    # picks up programs installed a moment ago, without opening a new window
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

function Test-Command($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Confirm-Install($what) {
    $answer = Read-Host "$what is not installed. Install it now? [Y/n]"
    return ($answer -eq '' -or $answer -match '^[Yy]')
}

function Install-WithWinget($id, $label, $extraArgs) {
    if (-not (Test-Command 'winget')) {
        throw "winget is not available on this computer. Install $label by hand (see the README, 'Installing the tools by hand'), then run this script again."
    }
    Write-Host "Installing $label ..." -ForegroundColor Cyan
    winget install --id $id -e --accept-package-agreements --accept-source-agreements @extraArgs
    if ($LASTEXITCODE -ne 0) { throw "The installation of $label did not finish (winget exit code $LASTEXITCODE)." }
    Update-SessionPath
}

Write-Host "`n=== ASPPM installer ===" -ForegroundColor Green

# ---- 1. Node.js 20 or newer
Write-Host "`n[1/3] Node.js"
$needNode = $true
if (Test-Command 'node') {
    $major = [int](((node -v) -replace '^v', '').Split('.')[0])
    if ($major -ge 20) { Write-Host "      ok: Node.js $(node -v)"; $needNode = $false }
    else { Write-Host "      Node.js $(node -v) is too old (need 20 or newer)." }
}
if ($needNode) {
    if (-not (Confirm-Install 'Node.js 20 or newer')) { throw 'Node.js is required. Stopping.' }
    Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS' @()
    if (-not (Test-Command 'node')) { throw 'Node.js was installed but is not visible yet. Close this window, open a new PowerShell, and run this script again.' }
    Write-Host "      ok: Node.js $(node -v)"
}

# ---- 2. PostgreSQL
Write-Host "`n[2/3] PostgreSQL"
$service = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $service) {
    if (-not (Confirm-Install 'PostgreSQL')) { throw 'PostgreSQL is required. Stopping.' }
    Write-Host '      Choose a password for the PostgreSQL administrator ("postgres").'
    Write-Host '      Use letters and digits only, at least 8 characters, and write it down: setup asks for it once.'
    do {
        $secure = Read-Host '      Administrator password' -AsSecureString
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        $valid = $plain -match '^[A-Za-z0-9]{8,}$'
        if (-not $valid) { Write-Host '      Letters and digits only, at least 8 characters.' -ForegroundColor Yellow }
    } until ($valid)
    $override = "--mode unattended --unattendedmodeui none --superpassword $plain --serverport 5432"
    Install-WithWinget 'PostgreSQL.PostgreSQL.17' 'PostgreSQL 17' @('--override', $override)
    $env:PG_ADMIN_PASSWORD = $plain   # only for this window, so setup does not ask for it again
    $service = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $service) { throw 'PostgreSQL was installed but its service was not found. Restart the computer and run this script again.' }
}
if ($service.Status -ne 'Running') {
    Write-Host "      Starting the PostgreSQL service ($($service.Name)) ..."
    Start-Service -Name $service.Name
}
Write-Host "      ok: service $($service.Name) is running"

# ---- 3. The project
Write-Host "`n[3/3] Installing the project"
if (-not (Test-Path 'package.json')) { throw 'package.json not found. Run this script from inside the ASPPM folder.' }
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed. If it ran out of memory, run:  $env:NODE_OPTIONS="--max-old-space-size=4096"  and try again.' }
npm run setup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
