/**
 * Phase 6 — Manufacturing Execution Engine E2E Tests
 * Uses native fetch (Node 18+). No external dependencies.
 */

const BASE = "http://localhost:3000/api";
const pass = (msg) => console.log(`   PASS: ${msg}`);
const fail = (msg) => { console.error(`   FAIL: ${msg}`); process.exit(1); };
const header = (msg) => console.log(`\n${msg}`);

let tokenA;
let woodId, screwsId, chairId;
let bomId, workCenterId, mainWhId;
let moId, wo1Id, wo2Id;

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
  if (!res.ok) throw data;
  return data;
}

const api = (method, path, body) => req(method, path, body, tokenA);

// ─── SETUP ────────────────────────────────────────────────────────────────────

async function setup() {
  header("1. Registering tenant and logging in...");
  const ts = Date.now();
  const company = await req("POST", "/company/register", {
    companyName: `TEST_MFG_${ts}`,
    email: `mfg_${ts}@test.com`,
    password: "Test@1234",
    adminName: "MFG Tester",
  });
  tokenA = company.token;
  pass(`Tenant registered. ID: ${company.tenant?.id}`);

  const woodRes   = await api("POST", "/products", { name: "TEST_Wood",   sku: `WD_${ts}`, procurementType: "PURCHASE", salesPrice: 8,  costPrice: 5,  reorderLevel: 20 });
  const screwsRes = await api("POST", "/products", { name: "TEST_Screws", sku: `SC_${ts}`, procurementType: "PURCHASE", salesPrice: 2,  costPrice: 1,  reorderLevel: 50 });
  const chairRes  = await api("POST", "/products", { name: "TEST_Chair",  sku: `CH_${ts}`, procurementType: "MANUFACTURING", salesPrice: 50, costPrice: 30, reorderLevel: 0  });
  woodId = woodRes.product?.id || woodRes.id;
  screwsId = screwsRes.product?.id || screwsRes.id;
  chairId  = chairRes.product?.id  || chairRes.id;
  pass(`Products: Wood(${woodId}), Screws(${screwsId}), Chair(${chairId})`);

  await api("POST", "/vendors", { name: "TEST_Supplier", email: `vendor_${ts}@test.com` });

  const wcRes = await api("POST", "/workcenters", { name: "TEST_Assembly", code: `WC${ts}`.slice(0, 10) });
  workCenterId = wcRes.workCenter?.id || wcRes.id;
  pass(`Work Center: ${workCenterId}`);

  const bomRes = await api("POST", "/bom", {
    productId: chairId,
    version: "1.0",
    components: [
      { productId: woodId,   qty: 2 },
      { productId: screwsId, qty: 8 },
    ],
    operations: [
      { workCenterId, name: "Cutting",  durationMins: 30, sequence: 1 },
      { workCenterId, name: "Assembly", durationMins: 60, sequence: 2 },
    ],
  });
  bomId = bomRes.bom?.id || bomRes.id;
  pass(`BoM created: ${bomId} (2 components, 2 operations)`);
}

// ─── TEST 1: Stock via Adjustment ────────────────────────────────────────────

async function test1_stockReceipt() {
  header("2. Adding component stock via inventory adjustment...");
  const whs = await api("GET", "/inventory/warehouses");
  const main = whs.find(w => w.code === "MAIN");
  if (!main) fail("MAIN warehouse not found");
  mainWhId = main.id;

  const adjRes = await api("POST", "/inventory/adjustments", {
    warehouseId: mainWhId,
    reason: "Phase 6 initial stock",
    lines: [
      { productId: woodId,   qty: 100 },
      { productId: screwsId, qty: 500 },
    ],
  });

  const woodProd = await api("GET", `/products/${woodId}`);
  const wood = woodProd.product || woodProd;
  if (Number(wood.onHandQty) !== 100) fail(`Wood should be 100, got ${wood.onHandQty}`);
  pass(`Wood stock: ${wood.onHandQty}`);

  const screwsProd = await api("GET", `/products/${screwsId}`);
  const screws = screwsProd.product || screwsProd;
  if (Number(screws.onHandQty) !== 500) fail(`Screws should be 500, got ${screws.onHandQty}`);
  pass(`Screws stock: ${screws.onHandQty}`);
}

// ─── TEST 2: Create Draft MO ──────────────────────────────────────────────────

async function test2_createDraftMO() {
  header("3. Creating Draft Manufacturing Order (qty=5 chairs)...");
  const mo = await api("POST", "/manufacturing", {
    productId: chairId,
    bomId,
    qty: 5,
    notes: "Phase 6 E2E test",
  });

  if (mo.status !== "DRAFT") fail(`Expected DRAFT, got ${mo.status}`);
  if (mo.components.length !== 2) fail(`Expected 2 component snapshots, got ${mo.components.length}`);

  const woodComp  = mo.components.find(c => c.productId === woodId);
  const screwComp = mo.components.find(c => c.productId === screwsId);
  if (Number(woodComp.qtyRequired)  !== 10) fail(`Wood snapshot should be 10, got ${woodComp.qtyRequired}`);
  if (Number(screwComp.qtyRequired) !== 40) fail(`Screws snapshot should be 40, got ${screwComp.qtyRequired}`);
  if (mo.workOrders.length !== 2) fail(`Expected 2 work orders, got ${mo.workOrders.length}`);

  moId  = mo.id;
  wo1Id = mo.workOrders.find(w => w.sequence === 1)?.id;
  wo2Id = mo.workOrders.find(w => w.sequence === 2)?.id;

  pass(`MO created: ${mo.moRef} (ID: ${moId})`);
  pass(`Snapshot correct — Wood=${woodComp.qtyRequired}, Screws=${screwComp.qtyRequired}`);
  pass(`Work Orders: WO1(id=${wo1Id}), WO2(id=${wo2Id})`);
}

// ─── TEST 3: BoM Snapshot Integrity ──────────────────────────────────────────

async function test3_snapshotIntegrity() {
  header("4. Verifying BoM snapshot is frozen (re-fetch MO)...");
  const mo = await api("GET", `/manufacturing/${moId}`);
  const woodComp = mo.components.find(c => c.productId === woodId);
  if (Number(woodComp.qtyRequired) !== 10) fail(`Snapshot drifted: expected 10, got ${woodComp.qtyRequired}`);
  pass("Component snapshot is stable — no BoM drift detected.");
}

// ─── TEST 4: Confirm MO ──────────────────────────────────────────────────────

async function test4_confirmMO() {
  header("5. Confirming Manufacturing Order...");
  const mo = await api("POST", `/manufacturing/${moId}/confirm`);
  if (mo.status !== "CONFIRMED") fail(`Expected CONFIRMED, got ${mo.status}`);
  pass(`MO status: ${mo.status}`);
}

// ─── TEST 5: Start MO ────────────────────────────────────────────────────────

async function test5_startMO() {
  header("6. Starting MO — WO1 should go IN_PROGRESS, WO2 stays PENDING...");
  const mo = await api("POST", `/manufacturing/${moId}/start`);
  if (mo.status !== "IN_PROGRESS") fail(`Expected IN_PROGRESS, got ${mo.status}`);

  const wo1 = mo.workOrders.find(w => w.id === wo1Id);
  const wo2 = mo.workOrders.find(w => w.id === wo2Id);
  if (wo1.status !== "IN_PROGRESS") fail(`WO1 should be IN_PROGRESS, got ${wo1.status}`);
  if (wo2.status !== "PENDING")     fail(`WO2 should be PENDING, got ${wo2.status}`);

  pass(`MO: ${mo.status}`);
  pass(`WO1: ${wo1.status} ✓ (IN_PROGRESS)`);
  pass(`WO2: ${wo2.status} ✓ (PENDING — sequential guard active)`);
}

// ─── TEST 6: Sequential Guard ────────────────────────────────────────────────

async function test6_sequentialGuard() {
  header("7. Sequential guard — cannot complete WO2 before WO1...");
  try {
    await api("POST", `/manufacturing/${moId}/work-orders/${wo2Id}/complete`);
    fail("Should have rejected completing WO2 before WO1");
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    if (msg.toLowerCase().includes("previous") || msg.toLowerCase().includes("sequence") ||
        msg.toLowerCase().includes("not in") || msg.toLowerCase().includes("pending") ||
        msg.toLowerCase().includes("in progress") || msg.toLowerCase().includes("progress to be")) {
      pass(`Sequential guard triggered: "${msg}"`);
    } else {
      fail(`Unexpected error: ${msg}`);
    }
  }
}

// ─── TEST 7: Complete Work Orders ────────────────────────────────────────────

async function test7_completeWorkOrders() {
  header("8. Completing WO1, starting WO2, completing WO2...");

  // Complete WO1
  const wo1Result = await api("POST", `/manufacturing/${moId}/work-orders/${wo1Id}/complete`);
  if (wo1Result.status !== "DONE") fail(`WO1 should be DONE, got ${wo1Result.status}`);
  pass(`WO1 → DONE.`);

  // Manually start WO2 (sequential guard now allows it since WO1 is DONE)
  const wo2StartResult = await api("POST", `/manufacturing/${moId}/work-orders/${wo2Id}/start`);
  if (wo2StartResult.status !== "IN_PROGRESS") fail(`WO2 should be IN_PROGRESS after start, got ${wo2StartResult.status}`);
  pass(`WO2 manually started → ${wo2StartResult.status}`);

  // Complete WO2
  const wo2Result = await api("POST", `/manufacturing/${moId}/work-orders/${wo2Id}/complete`);
  if (wo2Result.status !== "DONE") fail(`WO2 should be DONE, got ${wo2Result.status}`);
  pass("WO2 → DONE.");
}

// ─── TEST 8: MO Auto-Completion & Stock Movements ────────────────────────────

async function test8_moCompletion() {
  header("9. Completing MO and verifying stock movements...");

  // Explicitly call complete (all WOs are DONE, MO is still IN_PROGRESS)
  const completedMo = await api("POST", `/manufacturing/${moId}/complete`);
  if (completedMo.status !== "DONE") fail(`MO should be DONE, got ${completedMo.status}`);
  pass(`MO status: ${completedMo.status}`);

  // Components consumed: Wood 100-10=90, Screws 500-40=460
  const woodProd   = await api("GET", `/products/${woodId}`);
  const screwsProd = await api("GET", `/products/${screwsId}`);
  const wood   = woodProd.product   || woodProd;
  const screws = screwsProd.product || screwsProd;
  if (Number(wood.onHandQty)   !== 90)  fail(`Wood should be 90, got ${wood.onHandQty}`);
  if (Number(screws.onHandQty) !== 460) fail(`Screws should be 460, got ${screws.onHandQty}`);
  pass(`Wood consumed:   100 - 10 = ${wood.onHandQty} ✓`);
  pass(`Screws consumed: 500 - 40 = ${screws.onHandQty} ✓`);

  // Finished goods produced: Chair 0+5=5
  const chairProd = await api("GET", `/products/${chairId}`);
  const chair = chairProd.product || chairProd;
  if (Number(chair.onHandQty) !== 5) fail(`Chair should be 5, got ${chair.onHandQty}`);
  pass(`Finished goods produced: 0 + 5 = ${chair.onHandQty} chairs ✓`);
}

// ─── TEST 9: Ledger Verification ─────────────────────────────────────────────

async function test9_ledger() {
  header("10. Verifying stock ledger for manufacturing movements...");
  const ledger = await api("GET", `/inventory/ledger?productId=${woodId}`);

  const consume = ledger.find(m => m.movementType === "MANUFACTURING_CONSUME");
  const adjust  = ledger.find(m => m.movementType === "INVENTORY_ADJUSTMENT" || m.movementType === "STOCK_ADJUSTMENT");

  if (!consume) fail("MANUFACTURING_CONSUME entry not found in ledger");
  if (!adjust)  fail("Initial adjustment entry not found in ledger");
  if (Number(consume.qty) !== -10) fail(`Consume qty should be -10, got ${consume.qty}`);

  pass(`MANUFACTURING_CONSUME logged: qty=${consume.qty} ✓`);
  pass(`Ledger has ${ledger.length} movements for Wood ✓`);
}

// ─── TEST 10: List MOs ────────────────────────────────────────────────────────

async function test10_listMOs() {
  header("11. Testing MO list and filter by status=DONE...");
  const all  = await api("GET", "/manufacturing");
  const done = await api("GET", "/manufacturing?status=DONE");
  if (all.length  === 0) fail("Expected at least 1 MO");
  if (done.length === 0) fail("Expected at least 1 DONE MO");
  pass(`Total MOs: ${all.length}   DONE: ${done.length}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("          STARTING PHASE 6 MANUFACTURING E2E TESTS         ");
  console.log("=".repeat(60));

  await setup();
  await test1_stockReceipt();
  await test2_createDraftMO();
  await test3_snapshotIntegrity();
  await test4_confirmMO();
  await test5_startMO();
  await test6_sequentialGuard();
  await test7_completeWorkOrders();
  await test8_moCompletion();
  await test9_ledger();
  await test10_listMOs();

  console.log("\n" + "=".repeat(60));
  console.log("          ALL PHASE 6 MANUFACTURING TESTS PASSED!          ");
  console.log("=".repeat(60) + "\n");
}

main().catch(err => {
  console.error("\n❌ TEST SUITE CRASHED:", err?.message || JSON.stringify(err));
  process.exit(1);
});
