# ═══════════════════════════════════════════════════════════════════════════════
# Snacky — Development Environment Bootstrap (Windows)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Checks all prerequisites for local development and installs missing pieces.
# Safe to run multiple times (idempotent).
#
# Usage:
#   .\scripts\setup.ps1              # Full setup (check + install + configure)
#   .\scripts\setup.ps1 -CheckOnly   # Only verify prerequisites, install nothing
#
# Note: iOS builds are not supported on Windows. This script sets up
# everything needed for Android development and the Supabase backend.
#
# Requires: PowerShell 5.1+ (built into Windows 10/11)
# ═══════════════════════════════════════════════════════════════════════════════

[CmdletBinding()]
param(
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Constants ─────────────────────────────────────────────────────────────────

$REQUIRED_NODE_MAJOR = 22
$REQUIRED_PNPM_MAJOR = 10
$REQUIRED_JDK_MAJOR  = 17

$REPO_ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

$script:ResultsOk        = [System.Collections.Generic.List[string]]::new()
$script:ResultsInstalled = [System.Collections.Generic.List[string]]::new()
$script:ResultsWarn      = [System.Collections.Generic.List[string]]::new()
$script:ResultsFail      = [System.Collections.Generic.List[string]]::new()

# ── Helpers ───────────────────────────────────────────────────────────────────

function Write-Ok {
    param([string]$Tool, [string]$Detail = '')
    $pad = $Tool.PadRight(28)
    Write-Host "  " -NoNewline
    Write-Host "[OK]" -ForegroundColor Green -NoNewline
    Write-Host " $pad $Detail"
}

function Write-Warn {
    param([string]$Tool, [string]$Detail = '')
    $pad = $Tool.PadRight(28)
    Write-Host "  " -NoNewline
    Write-Host "[!!]" -ForegroundColor Yellow -NoNewline
    Write-Host " $pad $Detail"
}

function Write-Fail {
    param([string]$Tool, [string]$Detail = '')
    $pad = $Tool.PadRight(28)
    Write-Host "  " -NoNewline
    Write-Host "[XX]" -ForegroundColor Red -NoNewline
    Write-Host " $pad $Detail"
}

function Write-Info {
    param([string]$Message)
    Write-Host "   -> " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Step {
    param([string]$Title)
    Write-Host ""
    Write-Host "-- $Title --" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-WingetAvailable {
    Test-Command 'winget'
}

function Install-WithWinget {
    param([string]$PackageId, [string]$Name)
    if (Get-WingetAvailable) {
        Write-Info "Installing $Name via winget..."
        winget install --id $PackageId --accept-source-agreements --accept-package-agreements --silent
        return $true
    }
    return $false
}

# ── Prerequisite Checks ──────────────────────────────────────────────────────

function Test-Git {
    if (Test-Command 'git') {
        $v = git --version 2>&1 | ForEach-Object { ($_ -split ' ')[2] }
        Write-Ok 'Git' $v
        $script:ResultsOk.Add('Git')
    }
    else {
        if ($CheckOnly) {
            Write-Fail 'Git' 'not installed'
            $script:ResultsFail.Add('Git')
        }
        else {
            if (Install-WithWinget 'Git.Git' 'Git') {
                $script:ResultsInstalled.Add('Git')
            }
            else {
                Write-Fail 'Git' 'not installed — install from git-scm.com'
                $script:ResultsFail.Add('Git')
            }
        }
    }
}

function Test-NodeJs {
    if (Test-Command 'node') {
        $raw = (node -v) -replace 'v', ''
        $major = [int]($raw -split '\.')[0]
        if ($major -ge $REQUIRED_NODE_MAJOR) {
            Write-Ok 'Node.js' "v$raw"
            $script:ResultsOk.Add('Node.js')
        }
        else {
            Write-Fail 'Node.js' "v$raw — need >= v$REQUIRED_NODE_MAJOR"
            $script:ResultsFail.Add("Node.js >= $REQUIRED_NODE_MAJOR")
        }
    }
    else {
        if ($CheckOnly) {
            Write-Fail 'Node.js' 'not installed'
            $script:ResultsFail.Add('Node.js')
        }
        else {
            if (Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS') {
                $script:ResultsInstalled.Add('Node.js')
                Write-Warn 'Node.js' 'restart your terminal to pick up node in PATH'
            }
            else {
                Write-Fail 'Node.js' 'not installed — get from nodejs.org'
                $script:ResultsFail.Add('Node.js')
            }
        }
    }
}

function Test-Pnpm {
    if (Test-Command 'pnpm') {
        $raw = pnpm --version
        $major = [int]($raw -split '\.')[0]
        if ($major -ge $REQUIRED_PNPM_MAJOR) {
            Write-Ok 'pnpm' $raw
            $script:ResultsOk.Add('pnpm')
        }
        else {
            Write-Fail 'pnpm' "$raw — need >= $REQUIRED_PNPM_MAJOR"
            $script:ResultsFail.Add("pnpm >= $REQUIRED_PNPM_MAJOR")
        }
    }
    else {
        if ($CheckOnly) {
            Write-Fail 'pnpm' 'not installed'
            $script:ResultsFail.Add('pnpm')
        }
        else {
            Write-Info 'Installing pnpm via corepack...'
            if (Test-Command 'corepack') {
                corepack enable pnpm 2>$null
                corepack prepare pnpm@latest --activate 2>$null
            }
            else {
                npm install -g pnpm
            }
            $script:ResultsInstalled.Add('pnpm')
        }
    }
}

function Test-Docker {
    if (Test-Command 'docker') {
        try {
            $null = docker info 2>&1
            $v = (docker --version) -replace 'Docker version ', '' -replace ',.*', ''
            Write-Ok 'Docker' $v
            $script:ResultsOk.Add('Docker')
        }
        catch {
            Write-Warn 'Docker' 'installed but not running — start Docker Desktop'
            $script:ResultsWarn.Add('Docker (not running)')
        }
    }
    else {
        Write-Fail 'Docker' 'not installed — get Docker Desktop from docker.com'
        $script:ResultsFail.Add('Docker')
    }
}

function Test-SupabaseCli {
    if (Test-Command 'supabase') {
        $v = (supabase --version 2>&1) -split ' ' | Select-Object -Last 1
        Write-Ok 'Supabase CLI' $v
        $script:ResultsOk.Add('Supabase CLI')
    }
    else {
        if ($CheckOnly) {
            Write-Fail 'Supabase CLI' 'not installed'
            $script:ResultsFail.Add('Supabase CLI')
        }
        else {
            if (Test-Command 'scoop') {
                Write-Info 'Installing Supabase CLI via scoop...'
                scoop bucket add supabase https://github.com/supabase/scoop-bucket.git 2>$null
                scoop install supabase
                $script:ResultsInstalled.Add('Supabase CLI')
            }
            elseif (Install-WithWinget 'Supabase.CLI' 'Supabase CLI') {
                $script:ResultsInstalled.Add('Supabase CLI')
            }
            else {
                Write-Fail 'Supabase CLI' 'not installed — npm i -g supabase or install scoop/winget'
                $script:ResultsFail.Add('Supabase CLI')
            }
        }
    }
}

function Test-Jdk {
    if (Test-Command 'java') {
        $javaVer = java -version 2>&1 | Select-Object -First 1
        if ($javaVer -match '"(\d+)') {
            $major = [int]$Matches[1]
            if ($major -ge $REQUIRED_JDK_MAJOR) {
                Write-Ok 'JDK' ($javaVer -replace '.*"(\d+[^"]*)".*', '$1')
                $script:ResultsOk.Add('JDK')
            }
            else {
                Write-Fail 'JDK' "$major — need >= $REQUIRED_JDK_MAJOR"
                $script:ResultsFail.Add("JDK >= $REQUIRED_JDK_MAJOR")
            }
        }
        else {
            Write-Warn 'JDK' 'installed but could not parse version'
            $script:ResultsWarn.Add('JDK (version unknown)')
        }
    }
    else {
        if ($CheckOnly) {
            Write-Fail 'JDK' 'not installed (needed for Android builds)'
            $script:ResultsFail.Add('JDK')
        }
        else {
            if (Install-WithWinget "EclipseAdoptium.Temurin.$REQUIRED_JDK_MAJOR.JDK" "JDK $REQUIRED_JDK_MAJOR") {
                $script:ResultsInstalled.Add("JDK $REQUIRED_JDK_MAJOR")
                Write-Warn 'JDK' 'restart your terminal to pick up java in PATH'
            }
            else {
                Write-Fail 'JDK' "not installed — get Adoptium Temurin JDK $REQUIRED_JDK_MAJOR"
                $script:ResultsFail.Add('JDK')
            }
        }
    }
}

function Test-AndroidSdk {
    $sdkRoot = $env:ANDROID_HOME
    if (-not $sdkRoot) { $sdkRoot = $env:ANDROID_SDK_ROOT }
    if (-not $sdkRoot) {
        $default = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
        if (Test-Path $default) { $sdkRoot = $default }
    }

    if ($sdkRoot -and (Test-Path $sdkRoot)) {
        Write-Ok 'Android SDK' $sdkRoot
        $script:ResultsOk.Add('Android SDK')

        if (-not $env:ANDROID_HOME) {
            Write-Warn 'ANDROID_HOME' 'not set — add to your environment variables'
            $script:ResultsWarn.Add('ANDROID_HOME not set')
        }
    }
    else {
        Write-Warn 'Android SDK' 'not found — install Android Studio from developer.android.com'
        $script:ResultsWarn.Add('Android SDK')
    }
}

# ── Post-Check Setup ─────────────────────────────────────────────────────────

function Install-Dependencies {
    Write-Step 'Node dependencies'
    Push-Location $REPO_ROOT
    try {
        if (Test-Command 'pnpm') {
            try {
                pnpm install --frozen-lockfile 2>$null
            }
            catch {
                pnpm install
            }
            Write-Ok 'pnpm install' 'complete'
        }
        else {
            Write-Fail 'pnpm install' 'pnpm not available — skipping'
        }
    }
    finally {
        Pop-Location
    }
}

function Initialize-EnvFiles {
    Write-Step 'Environment files'

    $mobileEnv = Join-Path $REPO_ROOT 'apps\mobile\.env'
    $mobileExample = Join-Path $REPO_ROOT 'apps\mobile\.env.example'
    if (Test-Path $mobileEnv) {
        Write-Ok 'apps/mobile/.env' 'exists'
    }
    elseif (Test-Path $mobileExample) {
        Copy-Item $mobileExample $mobileEnv
        Write-Ok 'apps/mobile/.env' 'created from .env.example'
        Write-Warn 'apps/mobile/.env' 'edit with your actual values'
    }
    else {
        Write-Warn 'apps/mobile/.env' 'no example found — create manually'
    }

    $supaEnv = Join-Path $REPO_ROOT 'supabase\.env'
    $supaExample = Join-Path $REPO_ROOT 'supabase\.env.example'
    if (Test-Path $supaEnv) {
        Write-Ok 'supabase/.env' 'exists'
    }
    elseif (Test-Path $supaExample) {
        Copy-Item $supaExample $supaEnv
        Write-Ok 'supabase/.env' 'created from .env.example'
        Write-Warn 'supabase/.env' 'edit with your actual API keys'
    }
    else {
        Write-Warn 'supabase/.env' 'no example found — create manually'
    }
}

# ── Summary ───────────────────────────────────────────────────────────────────

function Write-Summary {
    Write-Step 'Summary'
    Write-Host ''

    if ($script:ResultsOk.Count -gt 0) {
        Write-Host '  ' -NoNewline
        Write-Host 'Ready    ' -ForegroundColor Green -NoNewline
        Write-Host ($script:ResultsOk -join ', ') -ForegroundColor DarkGray
    }
    if ($script:ResultsInstalled.Count -gt 0) {
        Write-Host '  ' -NoNewline
        Write-Host 'Installed' -ForegroundColor Blue -NoNewline
        Write-Host " $($script:ResultsInstalled -join ', ')"
    }
    if ($script:ResultsWarn.Count -gt 0) {
        Write-Host '  ' -NoNewline
        Write-Host 'Warnings ' -ForegroundColor Yellow -NoNewline
        Write-Host " $($script:ResultsWarn -join ', ')"
    }
    if ($script:ResultsFail.Count -gt 0) {
        Write-Host '  ' -NoNewline
        Write-Host 'Missing  ' -ForegroundColor Red -NoNewline
        Write-Host " $($script:ResultsFail -join ', ')"
        Write-Host ''
        Write-Host '  Some required tools are missing. Install them and re-run this script.' -ForegroundColor Red
        Write-Host ''
        exit 1
    }

    Write-Host ''
    Write-Host '  Environment is ready!' -ForegroundColor Green
    Write-Host ''
    Write-Host '  Quick start:' -ForegroundColor DarkGray
    Write-Host '    pnpm supabase:start      ' -NoNewline; Write-Host '# Start local Supabase' -ForegroundColor DarkGray
    Write-Host '    pnpm android              ' -NoNewline; Write-Host '# Run on Android emulator' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  Note: iOS builds require macOS. Use ./scripts/setup.sh there.' -ForegroundColor DarkGray
    Write-Host ''
}

# ── Main ──────────────────────────────────────────────────────────────────────

function Main {
    Write-Host ''
    Write-Host '+=================================================+' -ForegroundColor Cyan
    Write-Host '|       Snacky — Environment Setup (Windows)       |' -ForegroundColor Cyan
    Write-Host '+=================================================+' -ForegroundColor Cyan

    if ($CheckOnly) {
        Write-Info 'Check-only mode — nothing will be installed'
    }

    Write-Step 'System prerequisites'
    Test-Git

    Write-Step 'Runtime & package manager'
    Test-NodeJs
    Test-Pnpm

    Write-Step 'Mobile development tools'
    Test-Jdk
    Test-AndroidSdk

    Write-Step 'Backend & infrastructure'
    Test-Docker
    Test-SupabaseCli

    if (-not $CheckOnly -and $script:ResultsFail.Count -eq 0) {
        Install-Dependencies
        Initialize-EnvFiles
    }

    Write-Summary
}

Main
