Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host "  🚧 LOCAL DEV SERVER 🚧" -ForegroundColor Red
Write-Host "  NOT PRODUCTION!" -ForegroundColor Red
Write-Host "  Local:  http://127.0.0.1:8788" -ForegroundColor Cyan
Write-Host "  Prod:   https://nautilus-dky.pages.dev" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Yellow
npx wrangler pages dev .
