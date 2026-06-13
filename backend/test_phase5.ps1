# ============================================================
# test_phase5.ps1 - Phase 5: Purchase Management & Goods Receipt
# ============================================================
# Usage:  .\test_phase5.ps1
# Requires: backend running on localhost:3000
# ============================================================

$BASE = "http://localhost:3000/api"
$pass = 0
$fail = 0

function Assert($label, $condition) {
    if ($condition) {
        Write-Host "  [PASS] $label" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $label" -ForegroundColor Red
        $script:fail++
    }
}

function POST($url, $body, $token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        return Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body ($body | ConvertTo-Json -Depth 10) -ErrorAction Stop
    } catch {
        return $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    }
}

function GET($url, $token = $null) {
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        return Invoke-RestMethod -Uri $url -Method GET -Headers $headers -ErrorAction Stop
    } catch {
        return $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  Phase 5 - Purchase Management Verification" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# SETUP: Register Tenant A
Write-Host "SETUP: Registering Tenant A..." -ForegroundColor Yellow
$slugA  = "pa-$(Get-Random -Maximum 99999)"
$regA   = POST "$BASE/company/register" @{ companyName = "Purchase Tenant A $slugA"; adminName = "Admin A"; email = "aa.$slugA@test.com"; password = "Password123!" }
$tokenA = $regA.token
Assert "Tenant A registration" ($tokenA -ne $null)

# SETUP: Create Vendor
Write-Host "SETUP: Creating Vendor..." -ForegroundColor Yellow
$vendorRes = POST "$BASE/vendors" @{ name = "Test Supplier"; email = "sup@test.com"; phone = "9999999999" } $tokenA
$vendorId  = $vendorRes.vendor.id
Assert "Vendor created" ($vendorId -gt 0)

# SETUP: Create Product
Write-Host "SETUP: Creating Product..." -ForegroundColor Yellow
$sku       = "P5-$(Get-Random -Maximum 99999)"
$prodRes   = POST "$BASE/products" @{ name = "Phase5 Widget"; sku = $sku; salesPrice = 50; costPrice = 20; onHandQty = 0; reorderPoint = 0; procureOnDemand = $false; procurementType = "PURCHASE" } $tokenA
$productId = $prodRes.product.id
Assert "Product created" ($productId -gt 0)

Write-Host ""

# ==================================================================
# TEST 1 - Create Draft Purchase Order
# ==================================================================
Write-Host "TEST 1: Create Draft Purchase Order" -ForegroundColor Cyan
$poRes = POST "$BASE/purchase" @{
    vendorId             = $vendorId
    lines                = @(@{ productId = $productId; qty = 100; unitCost = 20 })
    notes                = "Phase5 test PO"
    expectedDeliveryDate = "2026-12-31"
} $tokenA

$poId  = $poRes.purchaseOrder.id
$poRef = $poRes.purchaseOrder.orderRef

Assert "PO created (ID assigned)"     ($poId -gt 0)
Assert "PO status = DRAFT"            ($poRes.purchaseOrder.status -eq "DRAFT")
Assert "PO ref matches PO-NNNN"       ($poRef -match "^PO-\d{4}$")
Assert "PO expectedDeliveryDate set"  ($poRes.purchaseOrder.expectedDeliveryDate -ne $null)

Write-Host ""

# ==================================================================
# TEST 2 - Confirm Purchase Order
# ==================================================================
Write-Host "TEST 2: Confirm Purchase Order" -ForegroundColor Cyan
$confirmRes = POST "$BASE/purchase/$poId/confirm" @{} $tokenA

Assert "Confirm returns PO"             ($confirmRes.purchaseOrder -ne $null)
Assert "PO status = SENT after confirm" ($confirmRes.purchaseOrder.status -eq "SENT")

Write-Host ""

# ==================================================================
# TEST 3 - Partial Receipt (40 of 100)
# ==================================================================
Write-Host "TEST 3: Partial Receipt (40 of 100)" -ForegroundColor Cyan

$poDetail = GET "$BASE/purchase/$poId" $tokenA
$lineId   = $poDetail.lines[0].id

$r3 = POST "$BASE/purchase/$poId/receive" @{
    receipts = @(@{ lineId = $lineId; receivedQty = 40 })
    notes    = "First partial delivery"
} $tokenA

Assert "Receive returns PO"               ($r3.purchaseOrder -ne $null)
Assert "PO status = PARTIALLY_RECEIVED"   ($r3.purchaseOrder.status -eq "PARTIALLY_RECEIVED")

$poA3 = GET "$BASE/purchase/$poId" $tokenA
Assert "Line receivedQty = 40"            ($poA3.lines[0].receivedQty -eq 40)
Assert "Line remainingQty = 60"           ($poA3.lines[0].remainingQty -eq 60)
Assert "Line receiptProgress = 40"        ($poA3.lines[0].receiptProgress -eq 40)
Assert "Receipt history has 1 entry"      ($poA3.receipts.Count -eq 1)

Write-Host ""

# ==================================================================
# TEST 4 - Full Receipt (remaining 60)
# ==================================================================
Write-Host "TEST 4: Full Receipt (remaining 60)" -ForegroundColor Cyan
$r4 = POST "$BASE/purchase/$poId/receive" @{
    receipts = @(@{ lineId = $lineId; receivedQty = 60 })
    notes    = "Final delivery"
} $tokenA

Assert "Full receive returns PO"                ($r4.purchaseOrder -ne $null)
Assert "PO status = RECEIVED after full receipt" ($r4.purchaseOrder.status -eq "RECEIVED")
Assert "receivedDate is set"                     ($r4.purchaseOrder.receivedDate -ne $null)

$poA4 = GET "$BASE/purchase/$poId" $tokenA
Assert "Line receivedQty = 100"                 ($poA4.lines[0].receivedQty -eq 100)
Assert "Line remainingQty = 0"                  ($poA4.lines[0].remainingQty -eq 0)
Assert "Line receiptProgress = 100"             ($poA4.lines[0].receiptProgress -eq 100)
Assert "Receipt history has 2 entries"          ($poA4.receipts.Count -eq 2)

Write-Host ""

# ==================================================================
# TEST 5 - Over-receipt guard (expect 400)
# ==================================================================
Write-Host "TEST 5: Over-receipt guard" -ForegroundColor Cyan
$h5 = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $tokenA" }
try {
    Invoke-RestMethod -Uri "$BASE/purchase/$poId/receive" -Method POST -Headers $h5 `
        -Body (@{ receipts = @(@{ lineId = $lineId; receivedQty = 1 }) } | ConvertTo-Json -Depth 10) -ErrorAction Stop
    Assert "Over-receipt should have failed" $false
} catch {
    $sc  = $_.Exception.Response.StatusCode.value__
    $msg = $_.ErrorDetails.Message
    Assert "Over-receipt blocked (400 or error)" ($sc -eq 400 -or $msg -match "Cannot receive|RECEIVED|remaining|Cannot modify")
}

Write-Host ""

# ==================================================================
# TEST 6 - Cancel after receipt (blocked)
# ==================================================================
Write-Host "TEST 6: Cancel after goods received (must be blocked)" -ForegroundColor Cyan
$h6 = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $tokenA" }
try {
    Invoke-RestMethod -Uri "$BASE/purchase/$poId/cancel" -Method POST -Headers $h6 -Body "{}" -ErrorAction Stop
    Assert "Cancel after receipt should have failed" $false
} catch {
    $sc  = $_.Exception.Response.StatusCode.value__
    $msg = $_.ErrorDetails.Message
    Assert "Cancel after receipt blocked" ($sc -eq 400 -or $msg -match "Cannot cancel|Cannot modify|received inventory|RECEIVED")
}

Write-Host ""

# ==================================================================
# TEST 7 - Multi-tenant isolation
# ==================================================================
Write-Host "TEST 7: Multi-tenant isolation" -ForegroundColor Cyan
$slugB  = "pb-$(Get-Random -Maximum 99999)"
$regB   = POST "$BASE/company/register" @{ companyName = "Purchase Tenant B $slugB"; adminName = "Admin B"; email = "bb.$slugB@test.com"; password = "Password123!" }
$tokenB = $regB.token
Assert "Tenant B registration" ($tokenB -ne $null)

$crossRes = GET "$BASE/purchase/$poId" $tokenB
Assert "Cross-tenant access blocked" ($crossRes -eq $null -or $crossRes.id -eq $null -or $crossRes.message -match "not found")

$vbRes  = POST "$BASE/vendors"  @{ name = "Vendor B"; email = "vb@b.com"; phone = "1111111111" } $tokenB
$pbRes  = POST "$BASE/products" @{ name = "Prod B"; sku = "B-$(Get-Random -Maximum 9999)"; salesPrice = 10; costPrice = 5; onHandQty = 0; reorderPoint = 0 } $tokenB
$poBRes = POST "$BASE/purchase" @{ vendorId = $vbRes.vendor.id; lines = @(@{ productId = $pbRes.product.id; qty = 10; unitCost = 5 }) } $tokenB

Assert "Tenant B PO created"          ($poBRes.purchaseOrder.id -gt 0)
Assert "Tenant B PO ref is PO-NNNN"   ($poBRes.purchaseOrder.orderRef -match "^PO-\d{4}$")

Write-Host ""

# ==================================================================
# TEST 8 - Stock ledger: PURCHASE_RECEIPT movement exists
# ==================================================================
Write-Host "TEST 8: Stock ledger PURCHASE_RECEIPT movement exists" -ForegroundColor Cyan

$lc = GET "$BASE/purchase/$poId" $tokenA
Assert "PO receipt history >= 2 (proxy for stock movements)" ($lc.receipts.Count -ge 2)

$allP   = GET "$BASE/products" $tokenA
$thePro = $allP | Where-Object { $_.id -eq $productId }
Assert "Product onHandQty = 100 after receipts" ($thePro.onHandQty -eq 100)

Write-Host ""

# ==================================================================
# TEST 9 - Multi-receipt sequence (3 separate receipts)
# ==================================================================
Write-Host "TEST 9: Multi-receipt sequence (3 receipts)" -ForegroundColor Cyan

$vRes9  = POST "$BASE/vendors"  @{ name = "Vendor T9"; email = "t9@t.com"; phone = "2222222222" } $tokenA
$sku9   = "T9-$(Get-Random -Maximum 99999)"
$pRes9  = POST "$BASE/products" @{ name = "Test9 Widget"; sku = $sku9; salesPrice = 10; costPrice = 8; onHandQty = 0; reorderPoint = 0 } $tokenA
$po9    = POST "$BASE/purchase" @{ vendorId = $vRes9.vendor.id; lines = @(@{ productId = $pRes9.product.id; qty = 100; unitCost = 8 }) } $tokenA
$poId9  = $po9.purchaseOrder.id
POST "$BASE/purchase/$poId9/confirm" @{} $tokenA | Out-Null

$pd9    = GET "$BASE/purchase/$poId9" $tokenA
$lid9   = $pd9.lines[0].id

$rc1 = POST "$BASE/purchase/$poId9/receive" @{ receipts = @(@{ lineId = $lid9; receivedQty = 25 }) } $tokenA
Assert "Receipt 1: PARTIALLY_RECEIVED" ($rc1.purchaseOrder.status -eq "PARTIALLY_RECEIVED")

$rc2 = POST "$BASE/purchase/$poId9/receive" @{ receipts = @(@{ lineId = $lid9; receivedQty = 25 }) } $tokenA
Assert "Receipt 2: PARTIALLY_RECEIVED" ($rc2.purchaseOrder.status -eq "PARTIALLY_RECEIVED")

$rc3 = POST "$BASE/purchase/$poId9/receive" @{ receipts = @(@{ lineId = $lid9; receivedQty = 50 }) } $tokenA
Assert "Receipt 3: RECEIVED"           ($rc3.purchaseOrder.status -eq "RECEIVED")

$pf9 = GET "$BASE/purchase/$poId9" $tokenA
Assert "PO has exactly 3 receipt records"  ($pf9.receipts.Count -eq 3)
Assert "Total receivedQty = 100"           ($pf9.lines[0].receivedQty -eq 100)
Assert "receiptProgress = 100"             ($pf9.lines[0].receiptProgress -eq 100)

Write-Host ""

# ==================================================================
# TEST 10 - Stock movement count (3 PURCHASE_RECEIPT entries)
# ==================================================================
Write-Host "TEST 10: Stock movement count verification" -ForegroundColor Cyan

$ap10   = GET "$BASE/products" $tokenA
$tp9    = $ap10 | Where-Object { $_.id -eq $pRes9.product.id }
$tp9Qty = $tp9.onHandQty
$tp9Cst = $tp9.lastPurchaseCost

Assert "Product onHandQty = 100 (3 receipts accumulated)" ($tp9Qty -eq 100)
Assert "Product lastPurchaseCost updated to 8"            ($tp9Cst -eq 8)
Assert "Receipt count = 3 (= 3 stock movements)"         ($pf9.receipts.Count -eq 3)

$rl1 = $pf9.receipts[0].lines
$rl2 = $pf9.receipts[1].lines
$rl3 = $pf9.receipts[2].lines

Assert "Receipt 1 qty = 25"   ($rl1[0].qty -eq 25)
Assert "Receipt 2 qty = 25"   ($rl2[0].qty -eq 25)
Assert "Receipt 3 qty = 50"   ($rl3[0].qty -eq 50)

Write-Host ""

# ==================================================================
# SUMMARY
# ==================================================================
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $pass passed / $($pass + $fail) total" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

if ($fail -eq 0) {
    Write-Host ""
    Write-Host "  ALL TESTS PASSED -- Phase 5 is production-ready!" -ForegroundColor Green
    Write-Host "  Mark Phase 5 done in DashboardPage.jsx" -ForegroundColor Green
} else {
    Write-Host ""
    $m = "  $fail TEST(S) FAILED -- DO NOT mark Phase 5 as done yet."
    Write-Host $m -ForegroundColor Red
}

Write-Host ""
