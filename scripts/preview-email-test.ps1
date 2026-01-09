param(
  [string]$UserId = "moony",
  [int]$Port = 8787,
  [string]$OutFile = "email-preview.html",
  [switch]$Open,
  [switch]$BacklogOn,
  [switch]$BacklogOff
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:$Port"
$notificationsUrl = "$baseUrl/api/notifications?dryRun=true&force=true&userId=$UserId"

function Set-BacklogSetting([bool]$enabled) {
  # This expects your local dev environment to accept settings updates.
  # If your settings endpoint requires auth locally, you'll need to add a token header here.
  $body = @{ emailNotificationsIncludeBacklog = $enabled } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$baseUrl/api/settings" -ContentType "application/json" -Body $body | Out-Null
}

if ($BacklogOff) { Set-BacklogSetting $false }
if ($BacklogOn)  { Set-BacklogSetting $true }

$response = Invoke-RestMethod -Uri $notificationsUrl

if (-not $response.previewHtml) {
  throw "previewHtml not found in response. Keys: $($response.PSObject.Properties.Name -join ', ')"
}

Set-Content -Path $OutFile -Value $response.previewHtml -Encoding UTF8

if ($Open) {
  Start-Process (Resolve-Path $OutFile)
} else {
  Write-Host "Wrote $OutFile"
}
