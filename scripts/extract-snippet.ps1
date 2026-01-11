param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [int]$Before = 40,
    [int]$After = 40,
    [switch]$IgnoreCase,
    [switch]$Literal,
    [switch]$All
)

if (-not (Test-Path -Path $File)) {
    Write-Error "File not found: $File"
    exit 1
}

$useRg = Get-Command rg -ErrorAction SilentlyContinue
$lineNumbers = @()

if ($useRg) {
    $rgArgs = @("-n")
    if ($IgnoreCase) { $rgArgs += "-i" }
    if ($Literal) { $rgArgs += "-F" }
    $rgArgs += $Pattern
    $rgArgs += $File
    $rgOutput = & rg @rgArgs
    if (-not $rgOutput) {
        Write-Output "No matches."
        exit 2
    }
    foreach ($line in $rgOutput) {
        $parts = $line.Split(":", 2)
        if ($parts.Count -ge 1) {
            $lineNumbers += [int]$parts[0]
        }
    }
} else {
    $selectArgs = @{
        Path = $File
        Pattern = $Pattern
    }
    if ($IgnoreCase) { $selectArgs.CaseSensitive = $false } else { $selectArgs.CaseSensitive = $true }
    if ($Literal) { $selectArgs.SimpleMatch = $true }
    $found = Select-String @selectArgs
    if (-not $found) {
        Write-Output "No matches."
        exit 2
    }
    $lineNumbers = $found | ForEach-Object { $_.LineNumber }
}

if (-not $All) {
    $lineNumbers = $lineNumbers | Select-Object -First 1
}

foreach ($lineNumber in $lineNumbers) {
    $start = [Math]::Max(1, $lineNumber - $Before)
    $end = $lineNumber + $After
    $count = $end - $start + 1

    Write-Output ("=== {0}:{1} ===" -f $File, $lineNumber)
    $lines = Get-Content -Path $File | Select-Object -Skip ($start - 1) -First $count
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $ln = $start + $i
        Write-Output ("{0,6}: {1}" -f $ln, $lines[$i])
    }
    if ($All) { Write-Output "" }
}
