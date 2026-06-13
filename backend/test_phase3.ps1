# PowerShell Test Script for Phase 3: Bill of Materials Backend Validation

$ErrorActionPreference = "Stop"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    STARTING PHASE 3 BOM MODULE VERIFICATION     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# Generic curl runner to avoid PowerShell stream bugs
function Invoke-CurlRequest($method, $path, $token, $payload) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    $bodyFile = $null
    
    $argsList = @("-s", "-o", $tempFile, "-w", "%{http_code}", "-X", $method, "$baseUrl$path")
    $argsList += @("-H", "Content-Type: application/json")
    
    if ($token) {
        $argsList += @("-H", "Authorization: Bearer $token")
    }
    if ($payload) {
        $bodyJson = $payload | ConvertTo-Json -Compress
        $bodyFile = [System.IO.Path]::GetTempFileName()
        # Set-Content adds newlines by default, we can write bytes or use Out-File or Set-Content with -NoNewline if supported
        [System.IO.File]::WriteAllText($bodyFile, $bodyJson)
        $argsList += @("-d", "@$bodyFile")
    }
    
    $statusCodeStr = & curl.exe $argsList
    $statusCode = [int]$statusCodeStr
    
    $content = Get-Content -Raw -Path $tempFile
    Remove-Item -Path $tempFile -Force
    if ($bodyFile) {
        Remove-Item -Path $bodyFile -Force
    }
    
    return [PSCustomObject]@{
        statusCode = $statusCode
        content    = $content
    }
}

# 1. Setup Database
Write-Host "`n[1/7] Preparing database with test helper..." -ForegroundColor Yellow
$setupResult = node src/modules/bom/bom.test-helper.js setup
Write-Host $setupResult -ForegroundColor Gray

# Helper function for API POST Login
function Get-AuthToken($email, $password) {
    $res = Invoke-CurlRequest "POST" "/auth/login" $null @{ email = $email; password = $password }
    if ($res.statusCode -ne 200) {
        Write-Host "Login failed for $email with status $($res.statusCode)" -ForegroundColor Red
        exit 1
    }
    $obj = $res.content | ConvertFrom-Json
    return $obj.token
}

# 2. Authenticating Users
Write-Host "`n[2/7] Authenticating test users..." -ForegroundColor Yellow
$adminToken = Get-AuthToken "admin@erp.com" "Admin@123"
$mfgToken   = Get-AuthToken "mark@erp.com" "Pass@123"
$salesToken = Get-AuthToken "sarah@erp.com" "Pass@123"
Write-Host "Successfully obtained JWT tokens." -ForegroundColor Green

# Fetch Products and Work Centers
Write-Host "`n[3/7] Fetching products and work centers to resolve dynamic IDs..." -ForegroundColor Yellow
$productsRes = Invoke-CurlRequest "GET" "/products" $adminToken $null
$products = $productsRes.content | ConvertFrom-Json

$wcRes = Invoke-CurlRequest "GET" "/workcenters" $adminToken $null
$workCenters = $wcRes.content | ConvertFrom-Json

# Resolve Product IDs
$finishedProduct = $products | Where-Object { $_.sku -eq "TABLE-DINING-01" }
$legProduct      = $products | Where-Object { $_.sku -eq "LEG-OAK-01" }
$topProduct      = $products | Where-Object { $_.sku -eq "TOP-OAK-01" }
$screwProduct    = $products | Where-Object { $_.sku -eq "SCREW-STEEL-01" }

if (-not $finishedProduct -or -not $legProduct -or -not $topProduct -or -not $screwProduct) {
    Write-Host "Failed to resolve product IDs from the database." -ForegroundColor Red
    exit 1
}

$productId = $finishedProduct.id
$legId     = $legProduct.id
$topId     = $topProduct.id
$screwId   = $screwProduct.id

Write-Host "Product IDs resolved:" -ForegroundColor Gray
Write-Host "  Finished Product (TABLE-DINING-01): ID $productId" -ForegroundColor Gray
Write-Host "  Oak Leg (LEG-OAK-01): ID $legId" -ForegroundColor Gray
Write-Host "  Oak Table Top (TOP-OAK-01): ID $topId" -ForegroundColor Gray
Write-Host "  Steel Screw Box (SCREW-STEEL-01): ID $screwId" -ForegroundColor Gray

# Resolve Work Center IDs
$assemblyLine = $workCenters | Where-Object { $_.name -eq "Assembly Line" }
$paintFloor   = $workCenters | Where-Object { $_.name -eq "Paint Floor" }

if (-not $assemblyLine -or -not $paintFloor) {
    Write-Host "Failed to resolve work centers." -ForegroundColor Red
    exit 1
}

$assemblyWcId = $assemblyLine.id
$paintWcId    = $paintFloor.id

Write-Host "Work Center IDs resolved:" -ForegroundColor Gray
Write-Host "  Assembly Line: ID $assemblyWcId" -ForegroundColor Gray
Write-Host "  Paint Floor:   ID $paintWcId" -ForegroundColor Gray

# 3. Test Role Access Guard (Sales role block)
Write-Host "`n[4/7] Testing Access Guards (RBAC)..." -ForegroundColor Yellow
$bomPayload = @{
    productId = $productId
    version = "1.0"
    components = @(
        @{ productId = $legId; qty = 4 }
    )
    operations = @(
        @{ workCenterId = $assemblyWcId; name = "Assembly"; durationMins = 30; sequence = 1 }
    )
}

$res = Invoke-CurlRequest "POST" "/bom" $salesToken $bomPayload
if ($res.statusCode -eq 403) {
    Write-Host "  PASS: SALES_USER was blocked with HTTP 403 (Forbidden) as expected." -ForegroundColor Green
} else {
    Write-Host "  FAIL: Expected 403 Forbidden, but received HTTP $($res.statusCode)" -ForegroundColor Red
    exit 1
}

# 5. Create BoM (Happy Path)
Write-Host "`n[5/7] Testing BoM Creation (Happy Path)..." -ForegroundColor Yellow
$validBomPayload = @{
    productId = $productId
    version = "v1.0-test"
    components = @(
        @{ productId = $legId; qty = 4 }
        @{ productId = $topId; qty = 1 }
        @{ productId = $screwId; qty = 16 }
    )
    operations = @(
        @{ workCenterId = $assemblyWcId; name = "Assemble Frame"; durationMins = 30; sequence = 1 }
        @{ workCenterId = $paintWcId; name = "Stain & Paint"; durationMins = 20; sequence = 2 }
    )
}

$createRes = Invoke-CurlRequest "POST" "/bom" $mfgToken $validBomPayload
if ($createRes.statusCode -eq 201) {
    $createResponse = $createRes.content | ConvertFrom-Json
    $bomId1 = $createResponse.bom.id
    
    # Assertions
    if ($createResponse.bom.componentCount -eq 3 -and $createResponse.bom.operationCount -eq 2 -and $createResponse.bom.totalOperationTime -eq 50) {
        Write-Host "  PASS: BoM created successfully with ID $bomId1." -ForegroundColor Green
        Write-Host "        Components Count: $($createResponse.bom.componentCount) (Expected: 3)" -ForegroundColor Green
        Write-Host "        Operations Count: $($createResponse.bom.operationCount) (Expected: 2)" -ForegroundColor Green
        Write-Host "        Total Time (mins): $($createResponse.bom.totalOperationTime) (Expected: 50)" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: Computed summary metrics are incorrect:" -ForegroundColor Red
        Write-Host "        Got: Component Count=$($createResponse.bom.componentCount), Operation Count=$($createResponse.bom.operationCount), Time=$($createResponse.bom.totalOperationTime)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  FAIL: Happy path BoM creation returned status $($createRes.statusCode). Body: $($createRes.content)" -ForegroundColor Red
    exit 1
}

# 6. Validation Rules Testing
Write-Host "`n[6/7] Testing Validation Rules (Circular Dependencies, Empty blocks)..." -ForegroundColor Yellow

# Function to execute test and expect 400 with specific keyword
function Assert-BadRequest($payload, $token, $testName, $keyword) {
    $res = Invoke-CurlRequest "POST" "/bom" $token $payload
    $statusCode = $res.statusCode
    $errorResponse = $res.content | ConvertFrom-Json
    $msg = $errorResponse.message

    if ($statusCode -eq 400 -and $msg -match $keyword) {
        Write-Host "  PASS: $testName rejected with 400: '$msg'" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  FAIL: $testName failed. Got Status=$statusCode, Message='$msg' (Expected keyword: '$keyword')" -ForegroundColor Red
        return $false
    }
}

$v1 = Assert-BadRequest @{
    productId = $legId # Leg is finished product
    version = "1.0"
    components = @( @{ productId = $productId; qty = 1 } ) # Dining table is component (Circular dependency)
    operations = @( @{ workCenterId = $assemblyWcId; name = "Make Leg"; durationMins = 10; sequence = 1 } )
} $mfgToken "Circular dependency check" "circular"

$v2 = Assert-BadRequest @{
    productId = $productId
    version = "1.0"
    components = @( @{ productId = $productId; qty = 1 } ) # Self-reference
    operations = @( @{ workCenterId = $assemblyWcId; name = "Assemble self"; durationMins = 10; sequence = 1 } )
} $mfgToken "Self-reference check" "itself"

$v3 = Assert-BadRequest @{
    productId = $productId
    version = "1.0"
    components = @() # Empty components
    operations = @( @{ workCenterId = $assemblyWcId; name = "Assemble"; durationMins = 10; sequence = 1 } )
} $mfgToken "Empty components check" "component is required"

$v4 = Assert-BadRequest @{
    productId = $productId
    version = "1.0"
    components = @( @{ productId = $legId; qty = 4 } )
    operations = @() # Empty operations
} $mfgToken "Empty operations check" "operation is required"

$v5 = Assert-BadRequest @{
    productId = 999999 # Non-existent product
    version = "1.0"
    components = @( @{ productId = $legId; qty = 4 } )
    operations = @( @{ workCenterId = $assemblyWcId; name = "Assemble"; durationMins = 10; sequence = 1 } )
} $mfgToken "Non-existent product check" "does not exist"

$v6 = Assert-BadRequest @{
    productId = $productId
    version = "1.0"
    components = @( @{ productId = 999999; qty = 4 } ) # Non-existent component
    operations = @( @{ workCenterId = $assemblyWcId; name = "Assemble"; durationMins = 10; sequence = 1 } )
} $mfgToken "Non-existent component check" "do not exist"

$v7 = Assert-BadRequest @{
    productId = $productId
    version = "1.0"
    components = @( @{ productId = $legId; qty = 4 } )
    operations = @( @{ workCenterId = 999999; name = "Assemble"; durationMins = 10; sequence = 1 } ) # Non-existent work center
} $mfgToken "Non-existent work center check" "do not exist"

if (-not ($v1 -and $v2 -and $v3 -and $v4 -and $v5 -and $v6 -and $v7)) {
    Write-Host "One or more validation rules tests failed." -ForegroundColor Red
    exit 1
}

# 7. Conflict Resolution & Lock Tests
Write-Host "`n[7/7] Testing Conflict Resolution (Active BoMs) and Locks..." -ForegroundColor Yellow

# Create a second active BoM for TABLE-DINING-01
$validBomPayload2 = @{
    productId = $productId
    version = "v1.1-test"
    components = @(
        @{ productId = $legId; qty = 4 }
        @{ productId = $topId; qty = 1 }
        @{ productId = $screwId; qty = 16 }
    )
    operations = @(
        @{ workCenterId = $assemblyWcId; name = "Assemble Frame"; durationMins = 35; sequence = 1 }
        @{ workCenterId = $paintWcId; name = "Stain & Paint"; durationMins = 25; sequence = 2 }
    )
}

$createRes2 = Invoke-CurlRequest "POST" "/bom" $mfgToken $validBomPayload2
if ($createRes2.statusCode -eq 201) {
    $createResponse2 = $createRes2.content | ConvertFrom-Json
    $bomId2 = $createResponse2.bom.id
    Write-Host "  PASS: Second BoM created successfully with ID $bomId2 (Version: v1.1-test)." -ForegroundColor Green

    # Verify that the first BoM has been deactivated
    $getBom1Res = Invoke-CurlRequest "GET" "/bom/$bomId1" $adminToken $null
    $bom1 = $getBom1Res.content | ConvertFrom-Json
    if ($bom1.isActive -eq $false) {
        Write-Host "  PASS: First BoM (ID $bomId1) deactivated automatically." -ForegroundColor Green
    } else {
        Write-Host "  FAIL: First BoM (ID $bomId1) is still active." -ForegroundColor Red
        exit 1
    }

    # Verify that the active BoM retrieved for the product is the second BoM
    $getActiveBomRes = Invoke-CurlRequest "GET" "/bom/product/$productId" $adminToken $null
    $activeProductBom = $getActiveBomRes.content | ConvertFrom-Json
    if ($activeProductBom.id -eq $bomId2) {
        Write-Host "  PASS: Active BoM for product $productId is the new one (ID $bomId2)." -ForegroundColor Green
    } else {
        Write-Host "  FAIL: Active BoM for product is not ID $bomId2, it is ID $($activeProductBom.id)." -ForegroundColor Red
        exit 1
    }

    # Now create a mock Manufacturing Order referencing the active BoM
    Write-Host "  Creating mock manufacturing order referencing BoM ID $bomId2..." -ForegroundColor Gray
    $moResultStr = node src/modules/bom/bom.test-helper.js create-mo $bomId2
    $moJson = $moResultStr | Where-Object { $_ -match "^\s*{" }
    $moResult = $moJson | ConvertFrom-Json
    if (-not $moResult.success) {
        Write-Host "  FAIL: Could not create mock manufacturing order." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Mock Manufacturing Order created with ID $($moResult.moId) (Ref: $($moResult.moRef))." -ForegroundColor Gray

    # Attempt to EDIT BoM 2 (PUT request)
    $updatePayload = @{
        productId = $productId
        version = "v1.1-test-updated"
        components = @( @{ productId = $legId; qty = 4 } )
        operations = @( @{ workCenterId = $assemblyWcId; name = "Assembly"; durationMins = 35; sequence = 1 } )
    }
    $editRes = Invoke-CurlRequest "PUT" "/bom/$bomId2" $mfgToken $updatePayload
    $editError = $editRes.content | ConvertFrom-Json
    
    if ($editRes.statusCode -eq 400 -and $editError.message -match "referenced by active/confirmed") {
        Write-Host "  PASS: Update operation correctly blocked with 400: '$($editError.message)'" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: BoM edit was not blocked while active MO exists. Status=$($editRes.statusCode), Message='$($editError.message)'" -ForegroundColor Red
        exit 1
    }

    # Attempt to DELETE BoM 2 (DELETE request / soft delete)
    $deleteRes = Invoke-CurlRequest "DELETE" "/bom/$bomId2" $mfgToken $null
    $deleteError = $deleteRes.content | ConvertFrom-Json
    
    if ($deleteRes.statusCode -eq 400 -and $deleteError.message -match "referenced by active/confirmed") {
        Write-Host "  PASS: Delete operation correctly blocked with 400: '$($deleteError.message)'" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: BoM deletion was not blocked while active MO exists. Status=$($deleteRes.statusCode), Message='$($deleteError.message)'" -ForegroundColor Red
        exit 1
    }

} else {
    Write-Host "  FAIL: Failed to create second BoM: Status $($createRes2.statusCode), Body: $($createRes2.content)" -ForegroundColor Red
    exit 1
}

# --- ADDITIONAL VERIFICATIONS (5 CHECKS) ---
Write-Host "`n--- RUNNING 5 ADDITIONAL VERIFICATION CHECKS ---" -ForegroundColor Yellow

# Check 1: GET /bom List Performance
Write-Host "`n[Check 1/5] Testing GET /bom performance with 50+ BoMs..." -ForegroundColor Yellow
$perfSeed = node src/modules/bom/bom.test-helper.js create-many 50

$startTime = Get-Date
$perfListRes = Invoke-CurlRequest "GET" "/bom" $adminToken $null
$endTime = Get-Date
$elapsed = ($endTime - $startTime).TotalMilliseconds

$perfBoms = $perfListRes.content | ConvertFrom-Json
if ($perfListRes.statusCode -eq 200 -and $perfBoms.length -ge 50) {
    Write-Host "  PASS: Successfully listed $($perfBoms.length) BoMs." -ForegroundColor Green
    Write-Host "        Response Time: $elapsed ms (Target: < 500ms)" -ForegroundColor Green
    if ($elapsed -lt 500) {
        Write-Host "        Performance target met." -ForegroundColor Green
    } else {
        Write-Host "        WARNING: Response time is above 500ms, but request succeeded." -ForegroundColor Yellow
    }
} else {
    Write-Host "  FAIL: GET /bom list performance check failed. Status: $($perfListRes.statusCode)" -ForegroundColor Red
    exit 1
}

# Check 2: Soft Delete Retrieval
Write-Host "`n[Check 2/5] Testing Soft Delete Retrieval..." -ForegroundColor Yellow
# Create a new active BoM to delete
$sdBomPayload = @{
    productId = $productId
    version = "v-soft-delete-test"
    components = @( @{ productId = $legId; qty = 1 } )
    operations = @( @{ workCenterId = $assemblyWcId; name = "Assembly"; durationMins = 5; sequence = 1 } )
}
$sdCreateRes = Invoke-CurlRequest "POST" "/bom" $mfgToken $sdBomPayload
$sdBom = ($sdCreateRes.content | ConvertFrom-Json).bom
$sdBomId = $sdBom.id

# Soft delete it
$sdDeleteRes = Invoke-CurlRequest "DELETE" "/bom/$sdBomId" $mfgToken $null
if ($sdDeleteRes.statusCode -ne 200) {
    Write-Host "  FAIL: Could not soft delete test BoM. Status: $($sdDeleteRes.statusCode)" -ForegroundColor Red
    exit 1
}

# Call GET /bom and verify it's NOT returned by default
$sdListRes1 = Invoke-CurlRequest "GET" "/bom" $adminToken $null
$sdListBoms1 = $sdListRes1.content | ConvertFrom-Json
$foundInDefault = $sdListBoms1 | Where-Object { $_.id -eq $sdBomId }
if ($null -eq $foundInDefault) {
    Write-Host "  PASS: Soft deleted BoM (ID $sdBomId) is NOT returned by default GET /bom list." -ForegroundColor Green
} else {
    Write-Host "  FAIL: Soft deleted BoM (ID $sdBomId) was returned by default GET /bom list." -ForegroundColor Red
    exit 1
}

# Call GET /bom?includeInactive=true and verify it IS returned
$sdListRes2 = Invoke-CurlRequest "GET" "/bom?includeInactive=true" $adminToken $null
$sdListBoms2 = $sdListRes2.content | ConvertFrom-Json
$foundInIncludeInactive = $sdListBoms2 | Where-Object { $_.id -eq $sdBomId }
if ($foundInIncludeInactive) {
    Write-Host "  PASS: Soft deleted BoM (ID $sdBomId) is returned when includeInactive=true." -ForegroundColor Green
} else {
    Write-Host "  FAIL: Soft deleted BoM (ID $sdBomId) was not returned with includeInactive=true." -ForegroundColor Red
    exit 1
}

# Check 3: Product Endpoint for No Active BoM (Expected: 404, not 500)
Write-Host "`n[Check 3/5] Testing GET /bom/product/:productId for no active BoM..." -ForegroundColor Yellow
# Use a product that has no BoM (e.g. Oak Leg has no BoM)
$noActiveRes = Invoke-CurlRequest "GET" "/bom/product/$legId" $adminToken $null
$noActiveErr = $noActiveRes.content | ConvertFrom-Json
if ($noActiveRes.statusCode -eq 404 -and $noActiveErr.message -match "No active Bill of Materials found") {
    Write-Host "  PASS: Correctly returned HTTP 404 with message: '$($noActiveErr.message)'" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Expected 404 with active BoM message, but got Status=$($noActiveRes.statusCode), Body=$($noActiveRes.content)" -ForegroundColor Red
    exit 1
}

# Check 4: Duplicate Operations Sequence
Write-Host "`n[Check 4/5] Testing Duplicate Operations Sequence validation..." -ForegroundColor Yellow
$dupSeqPayload = @{
    productId = $productId
    version = "v-dup-seq-test"
    components = @( @{ productId = $legId; qty = 1 } )
    operations = @(
        @{ workCenterId = $assemblyWcId; name = "Operation 1"; durationMins = 5; sequence = 1 }
        @{ workCenterId = $assemblyWcId; name = "Operation 2"; durationMins = 5; sequence = 1 }
    )
}
$dupSeqRes = Invoke-CurlRequest "POST" "/bom" $mfgToken $dupSeqPayload
$dupSeqErr = $dupSeqRes.content | ConvertFrom-Json
if ($dupSeqRes.statusCode -eq 400 -and $dupSeqErr.message -match "Duplicate operation sequences") {
    Write-Host "  PASS: Duplicate sequences correctly rejected with HTTP 400: '$($dupSeqErr.message)'" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Expected 400 with duplicate sequences message, but got Status=$($dupSeqRes.statusCode), Body=$($dupSeqRes.content)" -ForegroundColor Red
    exit 1
}

# Check 5: Large Circular Chains (A->B->C->D->A)
Write-Host "`n[Check 5/5] Testing Large Circular Chains (A->B->C->D->A)..." -ForegroundColor Yellow
$circSetupStr = node src/modules/bom/bom.test-helper.js setup-large-circular
$circJson = $circSetupStr | Where-Object { $_ -match "^\s*{" }
$circSetup = $circJson | ConvertFrom-Json
if (-not $circSetup.success) {
    Write-Host "  FAIL: Failed to setup circular test environment." -ForegroundColor Red
    exit 1
}

# Try to create BoM for CIRC-A (finished prod) with CIRC-B as component
$circPayload = @{
    productId = $circSetup.prodAId
    version = "1.0"
    components = @( @{ productId = $circSetup.prodBId; qty = 1 } )
    operations = @( @{ workCenterId = $assemblyWcId; name = "Assembly"; durationMins = 5; sequence = 1 } )
}
$circRes = Invoke-CurlRequest "POST" "/bom" $mfgToken $circPayload
$circErr = $circRes.content | ConvertFrom-Json
if ($circRes.statusCode -eq 400 -and $circErr.message -match "Circular component dependency detected") {
    Write-Host "  PASS: Large circular dependency chain correctly rejected with HTTP 400: '$($circErr.message)'" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Large circular chain was not rejected or returned unexpected response. Status=$($circRes.statusCode), Body=$($circRes.content)" -ForegroundColor Red
    exit 1
}

# Cleanup Database
Write-Host "`nCleaning up test data..." -ForegroundColor Yellow
$cleanupResult = node src/modules/bom/bom.test-helper.js cleanup
Write-Host $cleanupResult -ForegroundColor Gray

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "      ALL PHASE 3 BOM TESTS PASSED SUCCESSFULLY!  " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
exit 0
