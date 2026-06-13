Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "   Phase 7 — Inventory & Warehouse Management Test Runner   " -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

Set-Location $PSScriptRoot

# Verify backend is reachable
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5
    Write-Host "  Backend: ONLINE ($($health.service))" -ForegroundColor Green
} catch {
    Write-Host "  Backend is NOT running. Start it with: npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host ""
node test_phase7.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  All Phase 7 tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  Phase 7 tests FAILED. See output above." -ForegroundColor Red
}
