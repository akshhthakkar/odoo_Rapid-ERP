Write-Host "Running Phase 8 Analytics E2E Tests..." -ForegroundColor Cyan
node test_phase8.js
if ($LastExitCode -eq 0) {
    Write-Host "All Phase 8 Analytics Tests Passed!" -ForegroundColor Green
    Exit 0
} else {
    Write-Host "Some tests failed or test suite crashed!" -ForegroundColor Red
    Exit 1
}
