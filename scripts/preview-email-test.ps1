param()

# ---- HARD DEFAULTS (do not require remembering flags) ----
$UserId  = "moony"
$Port    = 8787
$OutFile = "email-preview.html"
$Open    = $true
# ----------------------------------------------------------

$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:$Port"
$url = "$baseUrl/api/notifications?dryRun=true&force=true&userId=$UserId"

Write-Host "Fetching email preview for user '$UserId'"

$response = Invoke-RestMethod -Uri $url

if (-not $response.previewHtml) {
  Write-Error "previewHtml not found. Available keys:"
  $response.PSObject.Properties.Name | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Set-Content -Path $OutFile -Value $response.previewHtml -Encoding UTF8
Write-Host "Wrote $OutFile"

if ($Open) {
  Start-Process (Resolve-Path $OutFile)
}
