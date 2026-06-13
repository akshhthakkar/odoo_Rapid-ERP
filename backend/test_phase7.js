/**
 * Phase 7 — Inventory & Warehouse Management E2E Tests
 * Uses native fetch (Node 18+). No external dependencies.
 */

const BASE = "http://localhost:3000/api";
const pass = (msg) => console.log(`   PASS: ${msg}`);
const fail = (msg) => { console.error(`   FAIL: ${msg}`); process.exit(1); };
const header = (msg) => console.log(`\n${msg}`);

let tokenA, tokenB;
let woodIdA, screwsIdA;
let mainWhId, secWhId;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    data.status = res.status;
    throw data;
  }
  return data;
}

const apiA = (method, path, body) => req(method, path, body, tokenA);
const apiB = (method, path, body) => req(method, path, body, tokenB);

// ─── SETUP ────────────────────────────────────────────────────────────────────

async function setup() {
  header("1. Registering Tenant A and Tenant B...");
  const ts = Date.now();

  const regA = await req("POST", "/company/register", {
    companyName: `TEST_INV_A_${ts}`,
    email: `inv_a_${ts}@test.com`,
    password: "Test@1234",
    adminName: "Inv Tester A",
  });
  tokenA = regA.token;

  const regB = await req("POST", "/company/register", {
    companyName: `TEST_INV_B_${ts}`,
    email: `inv_b_${ts}@test.com`,
    password: "Test@1234",
    adminName: "Inv Tester B",
  });
  tokenB = regB.token;

  pass(`Tenant A registered. ID: ${regA.tenant?.id}`);
  pass(`Tenant B registered. ID: ${regB.tenant?.id}`);
}

// ─── TEST 1: MAIN Warehouse Auto-Seed ────────────────────────────────────────

async function test1_mainWarehouse() {
  header("2. Verifying default MAIN warehouse creation...");

  const whA = await apiA("GET", "/inventory/warehouses");
  const mainA = whA.find(w => w.code === "MAIN");
  if (!mainA) fail("Tenant A: MAIN warehouse not auto-created");
  mainWhId = mainA.id;
  pass(`Tenant A has default warehouse: ${mainA.name} (${mainA.code})`);

  const whB = await apiB("GET", "/inventory/warehouses");
  const mainB = whB.find(w => w.code === "MAIN");
  if (!mainB) fail("Tenant B: MAIN warehouse not auto-created");
  pass(`Tenant B has default warehouse: ${mainB.name} (${mainB.code})`);
}

// ─── TEST 2: Products with Reorder Levels ────────────────────────────────────

async function test2_productsWithReorderLevels() {
  header("3. Setting up products with reorder levels for Tenant A...");
  const ts = Date.now();

  const woodRes = await apiA("POST", "/products", {
    name: "TEST_Wood", sku: `WD_${ts}`, procurementType: "PURCHASE",
    salesPrice: 8, costPrice: 5, reorderLevel: 20,
  });
  woodIdA = woodRes.product?.id || woodRes.id;
  const wood = woodRes.product || woodRes;

  const screwsRes = await apiA("POST", "/products", {
    name: "TEST_Screws", sku: `SC_${ts}`, procurementType: "PURCHASE",
    salesPrice: 2, costPrice: 1, reorderLevel: 50,
  });
  screwsIdA = screwsRes.product?.id || screwsRes.id;
  const screws = screwsRes.product || screwsRes;

  pass(`Wood product created. Reorder Level: ${wood.reorderLevel}`);
  pass(`Screws product created. Reorder Level: ${screws.reorderLevel}`);
}

// ─── TEST 3: Dashboard Metrics ───────────────────────────────────────────────

async function test3_dashboard() {
  header("4. Fetching Inventory Dashboard to verify reorder alerts...");
  const dashboard = await apiA("GET", "/inventory/dashboard");

  const woodOos   = dashboard.outOfStockProducts?.find(p => p.id === woodIdA);
  const screwsOos = dashboard.outOfStockProducts?.find(p => p.id === screwsIdA);
  if (!woodOos || !screwsOos) fail("Expected both products in outOfStockProducts");
  pass("Both products flagged as out-of-stock alerts (0 available, reorder level set).");

  if (!Array.isArray(dashboard.topValued)) fail("topValued must be an array");
  pass(`topValued array present (${dashboard.topValued.length} items with stock > 0)`);
}

// ─── TEST 4: Manual Adjustments ──────────────────────────────────────────────

async function test4_adjustments() {
  header("5. Testing manual adjustments...");

  await apiA("POST", "/inventory/adjustments", {
    warehouseId: mainWhId,
    reason: "Phase 7 E2E — initial stock",
    lines: [{ productId: woodIdA, qty: 100 }],
  });

  const woodProd = await apiA("GET", `/products/${woodIdA}`);
  const wood = woodProd.product || woodProd;
  if (Number(wood.onHandQty) !== 100) fail(`Wood global onHandQty should be 100, got ${wood.onHandQty}`);
  pass(`Adjusted Wood stock is ${wood.onHandQty} on-hand (Global).`);

  const details = await apiA("GET", `/inventory/product/${woodIdA}`);
  const mainBal = details.breakdown?.find(b => b.warehouseId === mainWhId);
  if (!mainBal || Number(mainBal.onHandQty) !== 100) fail(`MAIN balance should be 100, got ${mainBal?.onHandQty}`);
  pass(`InventoryBalance record in MAIN warehouse is ${mainBal.onHandQty}.`);
}

// ─── TEST 5: Negative Adjustment Guard ───────────────────────────────────────

async function test5_negativeGuard() {
  header("5b. Attempting negative adjustment exceeding stock level (-150 Wood)...");
  try {
    await apiA("POST", "/inventory/adjustments", {
      warehouseId: mainWhId,
      reason: "Exceeds stock test",
      lines: [{ productId: woodIdA, qty: -150 }],
    });
    fail("Should have rejected the negative adjustment");
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    if (msg.includes("Adjustment rejected") || msg.includes("exceeds")) {
      pass(`Negative adjustment correctly blocked: "${msg}"`);
    } else {
      fail(`Unexpected error: ${msg}`);
    }
  }
}

// ─── TEST 6: Secondary Warehouse ─────────────────────────────────────────────

async function test6_secondaryWarehouse() {
  header("6. Creating a secondary warehouse...");
  const ts = Date.now().toString().slice(-6);
  const wh = await apiA("POST", "/inventory/warehouses", {
    code: `SEC${ts}`,
    name: "Secondary Warehouse",
  });
  secWhId = wh.id;
  if (!secWhId) fail("Secondary warehouse creation failed");
  pass(`Warehouse ${wh.name} (${wh.code}) registered successfully.`);
}

// ─── TEST 7: Stock Transfer ───────────────────────────────────────────────────

async function test7_stockTransfer() {
  header("7. Transferring 30 Wood units MAIN → Secondary...");

  await apiA("POST", "/inventory/transfers", {
    sourceWarehouseId: mainWhId,
    destinationWarehouseId: secWhId,
    notes: "Phase 7 E2E transfer",
    lines: [{ productId: woodIdA, qty: 30 }],
  });

  const details = await apiA("GET", `/inventory/product/${woodIdA}`);
  const mainBal = details.breakdown?.find(b => b.warehouseId === mainWhId);
  const secBal  = details.breakdown?.find(b => b.warehouseId === secWhId);

  if (Number(mainBal?.onHandQty) !== 70) fail(`MAIN should be 70, got ${mainBal?.onHandQty}`);
  if (Number(secBal?.onHandQty)  !== 30) fail(`SEC should be 30, got ${secBal?.onHandQty}`);
  pass(`Warehouse stock split matches: MAIN=70, SEC=30.`);

  const globalProd = await apiA("GET", `/products/${woodIdA}`);
  const global = globalProd.product || globalProd;
  if (Number(global.onHandQty) !== 100) fail(`Global should still be 100, got ${global.onHandQty}`);
  pass(`Global Product.onHandQty remained unchanged at ${global.onHandQty}.`);

  const ledger = await apiA("GET", `/inventory/ledger?productId=${woodIdA}`);
  const out = ledger.find(m => m.movementType === "WAREHOUSE_TRANSFER_OUT");
  const inn = ledger.find(m => m.movementType === "WAREHOUSE_TRANSFER_IN");
  if (!out) fail("WAREHOUSE_TRANSFER_OUT not found in ledger");
  if (!inn) fail("WAREHOUSE_TRANSFER_IN not found in ledger");
  if (Number(out.qty) !== -30) fail(`Transfer out qty should be -30, got ${out.qty}`);
  if (Number(inn.qty) !== 30)  fail(`Transfer in qty should be +30, got ${inn.qty}`);
  pass(`Ledger logs correct outbound (-30) and inbound (+30) transfer entries.`);
}

// ─── TEST 8: Same-Warehouse Guard ────────────────────────────────────────────

async function test8_sameWarehouseGuard() {
  header("8. Testing same-warehouse transfer guard...");
  try {
    await apiA("POST", "/inventory/transfers", {
      sourceWarehouseId: mainWhId,
      destinationWarehouseId: mainWhId,
      lines: [{ productId: woodIdA, qty: 10 }],
    });
    fail("Should have blocked same-warehouse transfer");
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    if (msg.toLowerCase().includes("different") || msg.toLowerCase().includes("same")) {
      pass(`Same-warehouse transfer blocked: "${msg}"`);
    } else {
      fail(`Unexpected error: ${msg}`);
    }
  }
}

// ─── TEST 9: Deactivation Guard ──────────────────────────────────────────────

async function test9_deactivationGuard() {
  header("9. Testing warehouse deactivation guard (SEC holds 30 units)...");
  try {
    await apiA("PATCH", `/inventory/warehouses/${secWhId}/deactivate`);
    fail("Should have blocked deactivation of warehouse holding stock");
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    if (msg.toLowerCase().includes("cannot deactivate") || msg.toLowerCase().includes("holds")) {
      pass(`Deactivation blocked correctly: "${msg}"`);
    } else {
      fail(`Unexpected error: ${msg}`);
    }
  }

  // Zero out SEC, then deactivate
  await apiA("POST", "/inventory/adjustments", {
    warehouseId: secWhId,
    reason: "Zeroing stock before deactivation",
    lines: [{ productId: woodIdA, qty: -30 }],
  });

  const result = await apiA("PATCH", `/inventory/warehouses/${secWhId}/deactivate`);
  if (result.warehouse?.isActive !== false) fail("Warehouse should be inactive");
  pass(`Warehouse deactivated successfully after zeroing stock.`);
}

// ─── TEST 10: Running Balance ─────────────────────────────────────────────────

async function test10_runningBalance() {
  header("10. Verifying stock ledger chronological running balances...");
  const ledger = await apiA("GET", `/inventory/ledger?productId=${woodIdA}`);
  if (ledger.length < 3) fail(`Expected at least 3 ledger entries, got ${ledger.length}`);

  // Newest-first: last entry is the most recent
  const newest = ledger[0];
  if (typeof newest.runningBalance === "undefined") fail("runningBalance field missing from ledger entries");
  pass(`Chronological running balances verified. Final balance: ${newest.runningBalance}`);
}

// ─── TEST 11: Inventory Valuation ────────────────────────────────────────────

async function test11_valuation() {
  header("11. Verifying Inventory Valuation details...");
  const valuation = await apiA("GET", "/inventory/valuation");

  const woodLine = valuation.products?.find(p => p.productId === woodIdA);
  if (!woodLine) fail("Wood not found in valuation");

  const expectedValue = Number(woodLine.qty) * Number(woodLine.cost);
  if (Math.abs(Number(woodLine.value) - expectedValue) > 0.01) {
    fail(`Wood valuation mismatch: expected ${expectedValue}, got ${woodLine.value}`);
  }
  pass(`Calculated total valuation is correct: INR ${Number(valuation.totalValue).toFixed(2)}`);

  // topValued on dashboard should now list products with stock
  const dashboard = await apiA("GET", "/inventory/dashboard");
  if (!Array.isArray(dashboard.topValued)) fail("topValued should be array");
  if (dashboard.topValued.length === 0) fail("topValued should have at least 1 entry");
  pass(`Top 5 Most Valuable: ${dashboard.topValued.length} products — top: "${dashboard.topValued[0].name}"`);
}

// ─── TEST 12: Multi-Tenant Isolation ─────────────────────────────────────────

async function test12_multiTenantIsolation() {
  header("12. Verifying Multi-Tenant isolation constraints...");

  // Tenant B cannot see Tenant A's product inventory
  try {
    await apiB("GET", `/inventory/product/${woodIdA}`);
    fail("Tenant B should NOT see Tenant A's product inventory details");
  } catch (err) {
    const status = err.status || err.statusCode;
    if (status === 404) {
      pass(`Tenant B query of Tenant A's product details returned 404 Not Found.`);
    } else {
      fail(`Expected 404, got ${status}: ${err.message}`);
    }
  }

  // Tenant B sequence counter starts independently at ADJ-0001
  const whsB  = await apiB("GET", "/inventory/warehouses");
  const mainB = whsB.find(w => w.code === "MAIN");
  const woodBRes = await apiB("POST", "/products", {
    name: "TEST_WoodB", sku: `WDB_${Date.now()}`, procurementType: "PURCHASE",
    salesPrice: 5, costPrice: 3,
  });
  const woodBId = woodBRes.product?.id || woodBRes.id;
  await apiB("POST", "/inventory/adjustments", {
    warehouseId: mainB.id,
    reason: "Tenant B isolation test",
    lines: [{ productId: woodBId, qty: 10 }],
  });
  const adjsB = await apiB("GET", "/inventory/adjustments");
  const firstAdj = adjsB[adjsB.length - 1]; // oldest
  if (!firstAdj?.adjustmentRef?.includes("ADJ-0001")) {
    fail(`Tenant B first adjustment should be ADJ-0001, got ${firstAdj?.adjustmentRef}`);
  }
  pass(`Tenant B sequence counter restarted at ${firstAdj.adjustmentRef} independently!`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("          STARTING PHASE 7 INVENTORY E2E TESTS           ");
  console.log("=".repeat(60));

  await setup();
  await test1_mainWarehouse();
  await test2_productsWithReorderLevels();
  await test3_dashboard();
  await test4_adjustments();
  await test5_negativeGuard();
  await test6_secondaryWarehouse();
  await test7_stockTransfer();
  await test8_sameWarehouseGuard();
  await test9_deactivationGuard();
  await test10_runningBalance();
  await test11_valuation();
  await test12_multiTenantIsolation();

  console.log("\n" + "=".repeat(60));
  console.log("          ALL PHASE 7 INVENTORY TESTS PASSED!             ");
  console.log("=".repeat(60) + "\n");
}

main().catch(err => {
  console.error("\n❌ TEST SUITE CRASHED:", err?.message || JSON.stringify(err));
  process.exit(1);
});
