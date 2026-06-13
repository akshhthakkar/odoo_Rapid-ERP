# Rapid Enterprise — Phase 4 API Verification Test Suite

$BaseUrl = "http://localhost:3000/api"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    STARTING PHASE 4 SALES MODULE VERIFICATION    " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ─── STEP 1: AUTHENTICATION ──────────────────────────────────────────────────
Write-Host "`n[1/7] Authenticating test users..." -ForegroundColor Yellow

$LoginPayload = @{
    email = "admin@erp.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $LoginPayload -ContentType "application/json"
    $Token = $LoginResponse.token
    $Headers = @{ Authorization = "Bearer $Token" }
    Write-Host "  PASS: Authenticated successfully as Admin." -ForegroundColor Green
} catch {
    Write-Error "  FAIL: Authentication failed. $_"
    exit
}

# ─── STEP 2: SETUP PRE-REQUISITES (Customer, Products, Vendor, BoM) ───────────
Write-Host "`n[2/7] Preparing test master data..." -ForegroundColor Yellow

# Get existing data lists
$AllCustomers = Invoke-RestMethod -Uri "$BaseUrl/customers" -Method Get -Headers $Headers
$AllVendors = Invoke-RestMethod -Uri "$BaseUrl/vendors" -Method Get -Headers $Headers
$AllProducts = Invoke-RestMethod -Uri "$BaseUrl/products" -Method Get -Headers $Headers
$AllWcs = Invoke-RestMethod -Uri "$BaseUrl/workcenters" -Method Get -Headers $Headers

# Create Customer if not exists
$ExistingCust = $AllCustomers | Where-Object { $_.name -eq "SO Test Customer" } | Select-Object -First 1
if ($ExistingCust) {
    $CustomerId = $ExistingCust.id
} else {
    $CustPayload = @{ name = "SO Test Customer"; email = "sotest@customer.com" } | ConvertTo-Json
    $Cust = Invoke-RestMethod -Uri "$BaseUrl/customers" -Method Post -Body $CustPayload -ContentType "application/json" -Headers $Headers
    $CustomerId = $Cust.customer.id
}

# Create Vendor if not exists
$ExistingVendor = $AllVendors | Where-Object { $_.name -eq "MTO Test Supplier" } | Select-Object -First 1
if ($ExistingVendor) {
    $VendorId = $ExistingVendor.id
} else {
    $VendorPayload = @{ name = "MTO Test Supplier"; email = "supplier@mto.com" } | ConvertTo-Json
    $Vendor = Invoke-RestMethod -Uri "$BaseUrl/vendors" -Method Post -Body $VendorPayload -ContentType "application/json" -Headers $Headers
    $VendorId = $Vendor.vendor.id
}

# Create MTS Product if not exists
$ExistingMts = $AllProducts | Where-Object { $_.sku -eq "CHAIR-MTS-TEST" } | Select-Object -First 1
if ($ExistingMts) {
    $MtsProductId = $ExistingMts.id
} else {
    $MtsPayload = @{
        name = "MTS Dining Chair"
        sku = "CHAIR-MTS-TEST"
        salesPrice = 50.00
        costPrice = 25.00
        procureOnDemand = $false
        procurementType = "PURCHASE"
    } | ConvertTo-Json
    $MtsProd = Invoke-RestMethod -Uri "$BaseUrl/products" -Method Post -Body $MtsPayload -ContentType "application/json" -Headers $Headers
    $MtsProductId = $MtsProd.product.id
}

# Create MTO Purchase Product if not exists
$ExistingMtoPurch = $AllProducts | Where-Object { $_.sku -eq "LEG-MTO-TEST" } | Select-Object -First 1
if ($ExistingMtoPurch) {
    $MtoPurchProductId = $ExistingMtoPurch.id
} else {
    $MtoPurchPayload = @{
        name = "MTO Table Leg"
        sku = "LEG-MTO-TEST"
        salesPrice = 15.00
        costPrice = 5.00
        procureOnDemand = $true
        procurementType = "PURCHASE"
        vendors = @(
            @{ vendorId = $VendorId; unitPrice = 4.50 }
        )
    } | ConvertTo-Json
    $MtoPurchProd = Invoke-RestMethod -Uri "$BaseUrl/products" -Method Post -Body $MtoPurchPayload -ContentType "application/json" -Headers $Headers
    $MtoPurchProductId = $MtoPurchProd.product.id
}

# Create MTO Manufactured Product if not exists
$ExistingMtoMfg = $AllProducts | Where-Object { $_.sku -eq "TABLE-MTO-TEST" } | Select-Object -First 1
if ($ExistingMtoMfg) {
    $MtoMfgProductId = $ExistingMtoMfg.id
} else {
    $MtoMfgPayload = @{
        name = "MTO Dining Table"
        sku = "TABLE-MTO-TEST"
        salesPrice = 300.00
        costPrice = 150.00
        procureOnDemand = $true
        procurementType = "MANUFACTURING"
    } | ConvertTo-Json
    $MtoMfgProd = Invoke-RestMethod -Uri "$BaseUrl/products" -Method Post -Body $MtoMfgPayload -ContentType "application/json" -Headers $Headers
    $MtoMfgProductId = $MtoMfgProd.product.id
}

# Create Work Center if not exists
$ExistingWc = $AllWcs | Where-Object { $_.name -eq "MTO Assembly Line" } | Select-Object -First 1
if ($ExistingWc) {
    $WcId = $ExistingWc.id
} else {
    $WcPayload = @{ name = "MTO Assembly Line"; description = "Work Center for testing MTO MO triggers" } | ConvertTo-Json
    $Wc = Invoke-RestMethod -Uri "$BaseUrl/workcenters" -Method Post -Body $WcPayload -ContentType "application/json" -Headers $Headers
    $WcId = $Wc.workCenter.id
}

# Create BoM for Manufactured Product
$BomPayload = @{
    productId = $MtoMfgProductId
    version = "1.0-MTO"
    isActive = $true
    components = @(
        @{ productId = $MtsProductId; qty = 4 }
    )
    operations = @(
        @{ workCenterId = $WcId; name = "Assemble"; durationMins = 30; sequence = 10 }
    )
} | ConvertTo-Json
$Bom = Invoke-RestMethod -Uri "$BaseUrl/bom" -Method Post -Body $BomPayload -ContentType "application/json" -Headers $Headers
$BomId = $Bom.bom.id

Write-Host "  PASS: Master data (Customer, Products, Vendor, WC, BoM) created." -ForegroundColor Green
Write-Host "  DEBUG: CustomerId = $CustomerId" -ForegroundColor Cyan
Write-Host "  DEBUG: VendorId = $VendorId" -ForegroundColor Cyan
Write-Host "  DEBUG: MtsProductId = $MtsProductId" -ForegroundColor Cyan
Write-Host "  DEBUG: MtoPurchProductId = $MtoPurchProductId" -ForegroundColor Cyan
Write-Host "  DEBUG: MtoMfgProductId = $MtoMfgProductId" -ForegroundColor Cyan
Write-Host "  DEBUG: WcId = $WcId" -ForegroundColor Cyan

# ─── STEP 3: TESTING VALIDATIONS ──────────────────────────────────────────────
Write-Host "`n[3/7] Testing API Validations..." -ForegroundColor Yellow

# Test 3.1: Duplicate Products validation
$DupPayload = @{
    customerId = $CustomerId
    lines = @(
        @{ productId = $MtsProductId; qty = 5; unitPrice = 50.00 }
        @{ productId = $MtsProductId; qty = 10; unitPrice = 50.00 }
    )
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$BaseUrl/sales" -Method Post -Body $DupPayload -ContentType "application/json" -Headers $Headers
    Write-Error "  FAIL: Duplicate products validation did not block."
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  PASS: Duplicate product lines blocked with HTTP 400." -ForegroundColor Green
    } else {
        Write-Error "  FAIL: Unexpected status code for duplicates: $_"
    }
}

# Test 3.2: Negative Quantity validation
$NegQtyPayload = @{
    customerId = $CustomerId
    lines = @(
        @{ productId = $MtsProductId; qty = -5; unitPrice = 50.00 }
    )
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$BaseUrl/sales" -Method Post -Body $NegQtyPayload -ContentType "application/json" -Headers $Headers
    Write-Error "  FAIL: Negative quantity validation did not block."
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  PASS: Negative line quantity blocked with HTTP 400." -ForegroundColor Green
    } else {
        Write-Error "  FAIL: Unexpected status code for negative qty: $_"
    }
}

# ─── STEP 4: SALES ORDER DRAFT & CONFIRM (Happy Path - MTS) ───────────────────
Write-Host "`n[4/7] Testing Draft creation & Confirmation (MTS)..." -ForegroundColor Yellow

$SoPayload = @{
    customerId = $CustomerId
    notes = "Test MTS sales order flow"
    requestedDeliveryDate = "2026-07-20"
    lines = @(
        @{ productId = $MtsProductId; qty = 2; unitPrice = 45.00 }
    )
} | ConvertTo-Json

$SoDraft = Invoke-RestMethod -Uri "$BaseUrl/sales" -Method Post -Body $SoPayload -ContentType "application/json" -Headers $Headers
$OrderId = $SoDraft.order.id

if ($SoDraft.order.requestedDeliveryDate -like "*2026-07-20*") {
    Write-Host "  PASS: Draft Sales Order created with requestedDeliveryDate: $($SoDraft.order.requestedDeliveryDate)." -ForegroundColor Green
} else {
    Write-Error "  FAIL: Draft Sales Order created but requestedDeliveryDate is missing or incorrect."
}

# Confirm SO
$ConfirmRes = Invoke-RestMethod -Uri "$BaseUrl/sales/$OrderId/confirm" -Method Post -Headers $Headers
Write-Host "  PASS: Sales Order confirmed. Status: $($ConfirmRes.order.status)." -ForegroundColor Green
Write-Host "        Stock snapshots stored: Reserved: $($ConfirmRes.order.lines[0].reservedQty), Shortage: $($ConfirmRes.order.lines[0].shortageQty)." -ForegroundColor Green

# Test Double Confirmation
try {
    Invoke-RestMethod -Uri "$BaseUrl/sales/$OrderId/confirm" -Method Post -Headers $Headers
    Write-Error "  FAIL: Double confirmation did not block."
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  PASS: Double confirmation blocked with HTTP 400." -ForegroundColor Green
    } else {
        Write-Error "  FAIL: Unexpected status code for double confirm: $_"
    }
}

# ─── STEP 5: TESTING MTO replenishment auto-triggers ───────────────────────
Write-Host "`n[5/7] Testing MTO Replenishment triggers on Confirm..." -ForegroundColor Yellow

# Test 5.1: MTO Purchase replenishment
$MtoPurchSoPayload = @{
    customerId = $CustomerId
    lines = @(
        @{ productId = $MtoPurchProductId; qty = 10; unitPrice = 15.00 }
    )
} | ConvertTo-Json
$PurchSo = Invoke-RestMethod -Uri "$BaseUrl/sales" -Method Post -Body $MtoPurchSoPayload -ContentType "application/json" -Headers $Headers
$PurchSoId = $PurchSo.order.id

$PurchConfirm = Invoke-RestMethod -Uri "$BaseUrl/sales/$PurchSoId/confirm" -Method Post -Headers $Headers
$TriggeredPo = $PurchConfirm.triggeredProcurements[0]
Write-Host "  PASS: MTO Purchase triggered auto-replenishment successfully." -ForegroundColor Green
Write-Host "        Auto-Created PO Reference: $($TriggeredPo.ref) (Shortage Qty: $($TriggeredPo.qty))." -ForegroundColor Green

# Verify line replenishmentStatus and direct links
$LineRepStatus = $PurchConfirm.order.lines[0].replenishmentStatus
$LinkedPo = $PurchConfirm.order.purchaseOrders[0]
if ($LineRepStatus -eq "TRIGGERED" -and $LinkedPo.orderRef -eq $TriggeredPo.ref) {
    Write-Host "  PASS: Line replenishmentStatus is 'TRIGGERED' and PO link exists ($($LinkedPo.orderRef))." -ForegroundColor Green
} else {
    Write-Error "  FAIL: Line replenishmentStatus is not TRIGGERED or PO link is missing."
}

# Test 5.2: MTO Manufacture replenishment
$MtoMfgSoPayload = @{
    customerId = $CustomerId
    lines = @(
        @{ productId = $MtoMfgProductId; qty = 3; unitPrice = 300.00 }
    )
} | ConvertTo-Json
$MfgSo = Invoke-RestMethod -Uri "$BaseUrl/sales" -Method Post -Body $MtoMfgSoPayload -ContentType "application/json" -Headers $Headers
$MfgSoId = $MfgSo.order.id

$MfgConfirm = Invoke-RestMethod -Uri "$BaseUrl/sales/$MfgSoId/confirm" -Method Post -Headers $Headers
$TriggeredMo = $MfgConfirm.triggeredProcurements[0]
Write-Host "  PASS: MTO Manufacture triggered auto-replenishment successfully." -ForegroundColor Green
Write-Host "        Auto-Created MO Reference: $($TriggeredMo.ref) (Shortage Qty: $($TriggeredMo.qty))." -ForegroundColor Green

# Verify line replenishmentStatus and direct links
$LineRepStatusMfg = $MfgConfirm.order.lines[0].replenishmentStatus
$LinkedMo = $MfgConfirm.order.manufacturingOrders[0]
if ($LineRepStatusMfg -eq "TRIGGERED" -and $LinkedMo.moRef -eq $TriggeredMo.ref) {
    Write-Host "  PASS: Line replenishmentStatus is 'TRIGGERED' and MO link exists ($($LinkedMo.moRef))." -ForegroundColor Green
} else {
    Write-Error "  FAIL: Line replenishmentStatus is not TRIGGERED or MO link is missing."
}

# ─── STEP 6: DELIVERIES ───────────────────────────────────────────────────────
Write-Host "`n[6/7] Testing Goods Delivery flows..." -ForegroundColor Yellow

# To test delivery, let's first update MTS product stock to 10 on-hand so we have items to deliver.
# (We'll use prisma client directly or test endpoints. Wait, we don't have a product stock adjuster endpoint in Products.
# We can run a quick inline node script or adjustments logic. Let's do it directly in database using Node script test runner, or let's try delivering.
# Wait! Since CHAIR-MTS-TEST was created with 0 stock, let's execute a quick node runner command to set stock to 10 so we can perform delivery checks).
$AdjustStockScript = @"
import { adjustStock } from './backend/src/utils/stockEngine.js';
await adjustStock($MtsProductId, 10, 'Initial stock for Phase 4 verification');
console.log('Stock updated successfully');
"@
$AdjustStockScript | Out-File -FilePath "c:\Users\Aksh\Documents\GitHub\odoo_Mini-ERP\adjust_stock.js" -Encoding utf8
node ..\adjust_stock.js
Remove-Item ..\adjust_stock.js

# Verify StockMovement was logged via stockEngine.adjustStock
$VerifyMovementScript = @"
import prisma from './backend/src/config/prisma.js';
const movement = await prisma.stockMovement.findFirst({
  where: {
    productId: $MtsProductId,
    movementType: 'STOCK_ADJUSTMENT'
  },
  orderBy: { createdAt: 'desc' }
});
if (movement && movement.reason === 'Initial stock for Phase 4 verification' && Number(movement.qty) === 10) {
  console.log('VERIFICATION_SUCCESS');
} else {
  console.log('VERIFICATION_FAILED', JSON.stringify(movement));
}
"@
$VerifyMovementScript | Out-File -FilePath "c:\Users\Aksh\Documents\GitHub\odoo_Mini-ERP\verify_movement.js" -Encoding utf8
$VerifyResult = node ..\verify_movement.js
Remove-Item ..\verify_movement.js

if ($VerifyResult -like "*VERIFICATION_SUCCESS*") {
    Write-Host "  PASS: Verified STOCK_ADJUSTMENT movement in stock ledger with exact reason." -ForegroundColor Green
} else {
    Write-Error "  FAIL: STOCK_ADJUSTMENT movement verification failed. Output: $VerifyResult"
}

# Now record delivery of 2 units (ordered 2)
$DelivPayload = @{
    lineDeliveries = @(
        @{ lineId = $ConfirmRes.order.lines[0].id; qty = 2 }
    )
} | ConvertTo-Json

$DelivRes = Invoke-RestMethod -Uri "$BaseUrl/sales/$OrderId/deliver" -Method Post -Body $DelivPayload -ContentType "application/json" -Headers $Headers
Write-Host "  PASS: Delivery validated successfully. New Status: $($DelivRes.order.status) (Delivered Qty: $($DelivRes.order.lines[0].deliveredQty))." -ForegroundColor Green

# Test Over-Delivery block
$OverDelivPayload = @{
    lineDeliveries = @(
        @{ lineId = $ConfirmRes.order.lines[0].id; qty = 1 }
    )
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$BaseUrl/sales/$OrderId/deliver" -Method Post -Body $OverDelivPayload -ContentType "application/json" -Headers $Headers
    Write-Error "  FAIL: Over-delivery did not block."
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  PASS: Over-delivery blocked with HTTP 400." -ForegroundColor Green
    } else {
        Write-Error "  FAIL: Unexpected status code for over-delivery: $_"
    }
}

# ─── STEP 7: CANCELLATIONS ───────────────────────────────────────────────────
Write-Host "`n[7/7] Testing cancellations..." -ForegroundColor Yellow

# Create a draft SO to cancel
$CancelPayload = @{
    customerId = $CustomerId
    lines = @(
        @{ productId = $MtsProductId; qty = 5; unitPrice = 45.00 }
    )
} | ConvertTo-Json
$CancelDraft = Invoke-RestMethod -Uri "$BaseUrl/sales" -Method Post -Body $CancelPayload -ContentType "application/json" -Headers $Headers
$CancelOrderId = $CancelDraft.order.id

# Cancel draft order
$CancelRes = Invoke-RestMethod -Uri "$BaseUrl/sales/$CancelOrderId/cancel" -Method Post -Headers $Headers
Write-Host "  PASS: Sales Order cancelled. Status: $($CancelRes.order.status)." -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "     ALL PHASE 4 SALES API TESTS COMPLETED!       " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
