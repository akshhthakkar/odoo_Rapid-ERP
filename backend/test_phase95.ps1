# Phase 9.5 — E2E Test Suite Runner
Write-Host "Running Phase 9.5 E2E Verification Suite..." -ForegroundColor Cyan
node test_phase95.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Phase 9.5 Tests Failed!" -ForegroundColor Red
    Exit 1
} else {
    Write-Host "✅ Phase 9.5 Tests Passed!" -ForegroundColor Green
    Exit 0
}
