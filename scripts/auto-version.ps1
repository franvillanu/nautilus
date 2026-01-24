<#
.SYNOPSIS
    Auto-updates version strings based on file content hashes.
    Eliminates manual version string maintenance.

.DESCRIPTION
    Scans all JS/CSS files, computes content hashes, and updates
    all import/reference version strings automatically.

.EXAMPLE
    ./scripts/auto-version.ps1
    ./scripts/auto-version.ps1 -DryRun
    ./scripts/auto-version.ps1 -Verbose
#>

param(
    [switch]$DryRun,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Find repo root - works whether called from scripts/ or repo root
$root = if ($PSScriptRoot) {
    Split-Path -Parent $PSScriptRoot  # scripts/ -> repo root
} else {
    Get-Location
}

# Verify we're in the right place by checking for app.js
if (-not (Test-Path (Join-Path $root "app.js"))) {
    # Try current directory
    $root = Get-Location
}
if (-not (Test-Path (Join-Path $root "app.js"))) {
    Write-Host "  ERROR: Could not find repo root (no app.js found)" -ForegroundColor Red
    exit 1
}

# Files that need version tracking
$trackedExtensions = @(".js", ".css")

# Files that contain references (imports, links, etc.)
$referenceFiles = @(
    "index.html",
    "app.js",
    "storage-client.js",
    "src/main.js",
    "src/core/viewLoader.js",
    "src/core/events.js",
    "src/core/state.js",
    "src/services/storage.js"
)

# Directories to scan for tracked files
$scanDirs = @(
    ".",
    "src/views",
    "src/core",
    "src/utils",
    "src/config",
    "src/components",
    "src/services",
    "src/ui"
)

# Directories/files to exclude
$excludePatterns = @(
    "node_modules",
    ".git",
    "scripts",
    "specs",
    "plans",
    "templates",
    ".sdd",
    "test-",
    "lock/"
)

function Get-ContentHash {
    param([string]$FilePath)
    $content = Get-Content -Path $FilePath -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return $null }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ([BitConverter]::ToString($hash) -replace '-', '').Substring(0, 8).ToLower()
}

function Should-Exclude {
    param([string]$Path)
    foreach ($pattern in $excludePatterns) {
        if ($Path -like "*$pattern*") { return $true }
    }
    return $false
}

function Get-TrackedFiles {
    $files = @{}
    foreach ($dir in $scanDirs) {
        $fullDir = Join-Path $root $dir
        if (-not (Test-Path $fullDir)) { continue }

        Get-ChildItem -Path $fullDir -File | Where-Object {
            $trackedExtensions -contains $_.Extension -and
            -not (Should-Exclude $_.FullName)
        } | ForEach-Object {
            $relativePath = $_.FullName.Replace($root, "").TrimStart("\", "/").Replace("\", "/")
            $hash = Get-ContentHash $_.FullName
            if ($hash) {
                $files[$relativePath] = $hash
            }
        }
    }
    return $files
}

function Update-References {
    param(
        [hashtable]$FileHashes,
        [switch]$DryRun
    )

    $updatedCount = 0
    $totalReplacements = 0

    foreach ($refFile in $referenceFiles) {
        $refPath = Join-Path $root $refFile
        if (-not (Test-Path $refPath)) {
            if ($Verbose) { Write-Host "  Skipping (not found): $refFile" -ForegroundColor DarkGray }
            continue
        }

        $content = Get-Content -Path $refPath -Raw
        $originalContent = $content
        $fileReplacements = 0

        foreach ($trackedFile in $FileHashes.Keys) {
            $hash = $FileHashes[$trackedFile]
            $fileName = Split-Path -Leaf $trackedFile
            $fileNameNoExt = [System.IO.Path]::GetFileNameWithoutExtension($trackedFile)

            # Build regex patterns to match various reference styles
            # Matches: file.js?v=anything or file.css?v=anything
            $patterns = @(
                # Direct filename references: "app.js?v=xxx" or 'app.js?v=xxx'
                "($fileName)\?v=[a-zA-Z0-9_-]+"
                # Relative path references: "./src/views/dashboard.js?v=xxx"
                "([\.\/a-zA-Z0-9_-]*$fileName)\?v=[a-zA-Z0-9_-]+"
            )

            foreach ($pattern in $patterns) {
                $regex = [regex]$pattern
                $matches = $regex.Matches($content)

                foreach ($match in $matches) {
                    $oldRef = $match.Value
                    $pathPart = $match.Groups[1].Value
                    $newRef = "$pathPart?v=$hash"

                    if ($oldRef -ne $newRef) {
                        $content = $content.Replace($oldRef, $newRef)
                        $fileReplacements++
                        if ($Verbose) {
                            Write-Host "    $refFile : $oldRef -> ?v=$hash" -ForegroundColor Cyan
                        }
                    }
                }
            }
        }

        if ($content -ne $originalContent) {
            $updatedCount++
            $totalReplacements += $fileReplacements

            if (-not $DryRun) {
                Set-Content -Path $refPath -Value $content -NoNewline
                Write-Host "  Updated: $refFile ($fileReplacements replacements)" -ForegroundColor Green
            } else {
                Write-Host "  Would update: $refFile ($fileReplacements replacements)" -ForegroundColor Yellow
            }
        }
    }

    return @{
        FilesUpdated = $updatedCount
        TotalReplacements = $totalReplacements
    }
}

# Main execution
Write-Host "`n=== Auto-Version Script ===" -ForegroundColor Magenta
if ($DryRun) {
    Write-Host "(DRY RUN - no files will be modified)" -ForegroundColor Yellow
}
Write-Host ""

# Step 1: Compute hashes for all tracked files
Write-Host "Step 1: Computing content hashes..." -ForegroundColor White
$fileHashes = Get-TrackedFiles

if ($Verbose) {
    Write-Host "  Tracked files:" -ForegroundColor DarkGray
    foreach ($file in $fileHashes.Keys | Sort-Object) {
        Write-Host "    $file = $($fileHashes[$file])" -ForegroundColor DarkGray
    }
}
Write-Host "  Found $($fileHashes.Count) tracked files" -ForegroundColor Gray

# Step 2: Update references
Write-Host "`nStep 2: Updating references..." -ForegroundColor White
$result = Update-References -FileHashes $fileHashes -DryRun:$DryRun

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Magenta
if ($result.FilesUpdated -eq 0) {
    Write-Host "  All version strings are up to date!" -ForegroundColor Green
} else {
    if ($DryRun) {
        Write-Host "  Would update $($result.FilesUpdated) file(s) with $($result.TotalReplacements) replacement(s)" -ForegroundColor Yellow
        Write-Host "  Run without -DryRun to apply changes" -ForegroundColor Yellow
    } else {
        Write-Host "  Updated $($result.FilesUpdated) file(s) with $($result.TotalReplacements) replacement(s)" -ForegroundColor Green
    }
}
Write-Host ""
