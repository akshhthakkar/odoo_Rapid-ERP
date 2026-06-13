/**
 * Phase 8 — Analytics, Reporting & Business Intelligence E2E Tests
 * Uses native fetch (Node 18+). No external dependencies.
 */

const BASE = "http://localhost:3000/api";
const pass = (msg) => console.log(`   PASS: ${msg}`);
const fail = (msg) => { console.error(`   FAIL: ${msg}`); process.exit(1); };
const header = (msg) => console.log(`\n${msg}`);

let tokenAdminA, tokenSalesA;
let tenantAId;
let tokenAdminB;
let woodId, screwsId, chairId;
let bomId, wcId, mainWhId;
let moId, poId, soId;

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // For file downloads
  const contentType = res.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    const blob = await res.arrayBuffer();
    if (!res.ok) throw { status: res.status, message: "Export failed" };
    return { buffer: Buffer.from(blob), contentType, status: res.status };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    data.status = res.status;
    throw data;
  }
  return data;
}

const apiAdminA = (method, path, body) => req(method, path, body, tokenAdminA);
const apiSalesA = (method, path, body) => req(method, path, body, tokenSalesA);
const apiAdminB = (method, path, body) => req(method, path, body, tokenAdminB);

// ─── SETUP ────────────────────────────────────────────────────────────────────

async function setup() {
  header("1. Initializing Tenant A and Tenant B...");
  const ts = Date.now();

  // 1. Register Tenant A
  const regA = await req("POST", "/company/register", {
    companyName: `TEST_BI_A_${ts}`,
    email: `bi_admin_${ts}@test.com`,
    password: "Test@1234",
    adminName: "BI Admin A",
  });
  tokenAdminA = regA.token;
  tenantAId = regA.tenant?.id;
  pass(`Tenant A registered. ID: ${tenantAId}`);

  // Create Sales User for Tenant A using invite
  const inviteRes = await apiAdminA("POST", "/users/invite", {
    name: "BI Sales User",
    email: `bi_sales_${ts}@test.com`,
    role: "SALES_USER",
  });
  const tempPassword = inviteRes.tempPassword;
  
  // Login Sales User
  const loginSales = await req("POST", "/auth/login", {
    email: `bi_sales_${ts}@test.com`,
    password: tempPassword,
  });
  tokenSalesA = loginSales.token;
  pass("Tenant A Sales User created and logged in.");

  // 2. Register Tenant B
  const regB = await req("POST", "/company/register", {
    companyName: `TEST_BI_B_${ts}`,
    email: `bi_admin_b_${ts}@test.com`,
    password: "Test@1234",
    adminName: "BI Admin B",
  });
  tokenAdminB = regB.token;
  pass(`Tenant B registered. ID: ${regB.tenant?.id}`);

  // 3. Products
  const woodRes   = await apiAdminA("POST", "/products", { name: "Wood Board", sku: `WD_${ts}`, procurementType: "PURCHASE", salesPrice: 10, costPrice: 5, reorderLevel: 5 });
  const screwsRes = await apiAdminA("POST", "/products", { name: "Screws Pack", sku: `SC_${ts}`, procurementType: "PURCHASE", salesPrice: 2,  costPrice: 1,  reorderLevel: 10 });
  const chairRes  = await apiAdminA("POST", "/products", { name: "Ergo Chair", sku: `CH_${ts}`, procurementType: "MANUFACTURING", salesPrice: 100, costPrice: 50, reorderLevel: 0 });
  woodId = woodRes.product?.id || woodRes.id;
  screwsId = screwsRes.product?.id || screwsRes.id;
  chairId = chairRes.product?.id || chairRes.id;

  // 4. Warehouse & Adjustments
  const whs = await apiAdminA("GET", "/inventory/warehouses");
  mainWhId = whs.find(w => w.code === "MAIN")?.id;
  await apiAdminA("POST", "/inventory/adjustments", {
    warehouseId: mainWhId,
    reason: "Initial BI stock",
    lines: [
      { productId: woodId, qty: 50 },
      { productId: screwsId, qty: 200 },
      { productId: chairId, qty: 10 }
    ]
  });

  // 5. Work Center & BoM
  const wcRes = await apiAdminA("POST", "/workcenters", { name: "Assembly Lab", code: `WC_${ts}`.slice(0, 10) });
  wcId = wcRes.workCenter?.id || wcRes.id;
  const bomRes = await apiAdminA("POST", "/bom", {
    productId: chairId,
    version: "1.0",
    components: [
      { productId: woodId, qty: 2 },
      { productId: screwsId, qty: 8 }
    ],
    operations: [
      { workCenterId: wcId, name: "Cutting & Assembly", durationMins: 45, sequence: 1 }
    ]
  });
  bomId = bomRes.bom?.id || bomRes.id;
  pass("Product, Warehouse, BoM setup completed successfully.");
}

// ─── TRANSACTIONS SETUP ────────────────────────────────────────────────────────

async function test1_createTransactions() {
  header("2. Generating active transaction records...");
  
  // 1. Customer & Sales Order (Delivered Qty = 5, Unit Price = 100)
  console.log("Calling POST /customers...");
  const cust = await apiAdminA("POST", "/customers", { name: "Chair Palace", email: `pallet_${Date.now()}@test.com` });
  console.log("POST /customers succeeded:", cust);
  const customerId = cust.customer?.id || cust.id;
  
  console.log("Calling POST /sales...");
  const so = await apiAdminA("POST", "/sales", {
    customerId,
    notes: "BI test sale",
    lines: [{ productId: chairId, qty: 5, unitPrice: 100 }]
  });
  console.log("POST /sales succeeded:", so);
  soId = so.order?.id || so.id;

  // Confirm Sales Order so we can deliver it
  console.log("Calling POST /sales/:id/confirm...");
  await apiAdminA("POST", `/sales/${soId}/confirm`);
  console.log("POST /sales/:id/confirm succeeded");

  // Get Sales Order details to find the sales order line ID
  console.log("Calling GET /sales/:id...");
  const soDetails = await apiAdminA("GET", `/sales/${soId}`);
  console.log("GET /sales/:id succeeded:", soDetails);
  const soLineId = soDetails.lines[0].id;

  // Set delivered qty directly via stock delivery simulated update
  console.log("Calling POST /sales/:id/deliver...");
  await apiAdminA("POST", `/sales/${soId}/deliver`, {
    lineDeliveries: [{ lineId: soLineId, qty: 5 }]
  });
  console.log("POST /sales/:id/deliver succeeded");
  pass("Sales Order created and FULLY DELIVERED (Revenue: 5 * 100 = 500).");

  // 2. Vendor & Purchase Order (Received Qty = 20, Cost = 5)
  const vend = await apiAdminA("POST", "/vendors", { name: "Timber Supply", email: `timber_${Date.now()}@test.com` });
  const vendorId = vend.vendor?.id || vend.id;
  const po = await apiAdminA("POST", "/purchase", {
    vendorId,
    notes: "BI purchase supply",
    lines: [{ productId: woodId, qty: 20, unitCost: 5 }]
  });
  poId = po.purchaseOrder.id;

  // Confirm Purchase Order so we can receive it
  await apiAdminA("POST", `/purchase/${poId}/confirm`);

  // Get Purchase Order details to get line IDs
  const poDetails = await apiAdminA("GET", `/purchase/${poId}`);
  const poLineId = poDetails.lines[0].id;
  
  // Receive PO
  await apiAdminA("POST", `/purchase/${poId}/receive`, {
    notes: "Received BI stock",
    receipts: [{ lineId: poLineId, receivedQty: 20 }]
  });
  pass("Purchase Order created and FULLY RECEIVED (Spend: 20 * 5 = 100).");

  // 3. Manufacturing Order (Completed Qty = 2)
  const mo = await apiAdminA("POST", "/manufacturing", {
    productId: chairId,
    bomId,
    qty: 2
  });
  moId = mo.id;
  await apiAdminA("POST", `/manufacturing/${moId}/confirm`);
  await apiAdminA("POST", `/manufacturing/${moId}/start`);
  const freshMo = await apiAdminA("GET", `/manufacturing/${moId}`);
  const woId = freshMo.workOrders?.[0]?.id;
  if (freshMo.workOrders?.[0]?.status !== "IN_PROGRESS") {
    await apiAdminA("POST", `/manufacturing/${moId}/work-orders/${woId}/start`);
  }
  await apiAdminA("POST", `/manufacturing/${moId}/work-orders/${woId}/complete`);
  await apiAdminA("POST", `/manufacturing/${moId}/complete`);
  pass("Manufacturing Order completed (1 completed MO).");
}

// ─── ANALYTICS VERIFICATIONS ─────────────────────────────────────────────────

async function test2_verifyAnalytics() {
  header("3. Querying Analytics APIs & validating calculations...");

  // 1. Dashboard
  const db = await apiAdminA("GET", "/analytics/dashboard");

  if (Number(db.revenue) !== 500) fail(`Expected revenue 500, got ${db.revenue}`);
  if (Number(db.purchaseSpend) !== 100) fail(`Expected spend 100, got ${db.purchaseSpend}`);
  if (db.revenueTrend === undefined) fail("Expected revenueTrend field present");
  pass("Dashboard KPIs verified: Delivered Revenue: 500, Spend: 100.");

  // 2. Sales
  const sales = await apiAdminA("GET", "/analytics/sales");
  if (Number(sales.kpis.totalRevenue) !== 500) fail(`Expected sales totalRevenue 500, got ${sales.kpis.totalRevenue}`);
  if (sales.topProducts.length === 0) fail("Expected topProducts list");
  if (sales.topCustomers.length === 0) fail("Expected topCustomers list");
  pass("Sales Analytics verified: Total Delivered Revenue matching lines.");

  // 3. Purchase
  const pur = await apiAdminA("GET", "/analytics/purchase");
  if (Number(pur.kpis.totalSpend) !== 100) fail(`Expected spend 100, got ${pur.kpis.totalSpend}`);
  if (pur.vendorSpend.length === 0) fail("Expected vendorSpend list");
  pass("Purchase Analytics verified: Spend calculated from received quantities.");

  // 4. Inventory Aging & Valuation
  const inv = await apiAdminA("GET", "/analytics/inventory");
  console.log("DEBUG TEST AGING:", JSON.stringify(inv.aging, null, 2));
  if (Number(inv.kpis.totalValue) <= 0) fail("Expected inventory valuation > 0");
  const currentAgingBucket = inv.aging.find(a => a.bucket === "0-30 Days");
  if (!currentAgingBucket || Number(currentAgingBucket.qty) === 0) fail("Expected positive stock in 0-30 Days aging bucket");
  pass("Inventory Valuation and Last-Inbound Approximate Aging verified.");

  // 5. Manufacturing Throughput
  const mfg = await apiAdminA("GET", "/analytics/manufacturing");
  if (mfg.kpis.completedMOs !== 1) fail(`Expected 1 completed MO, got ${mfg.kpis.completedMOs}`);
  if (mfg.kpis.averageMOCompletionTimeHours === undefined) fail("Expected averageMOCompletionTimeHours in manufacturing analytics");
  if (mfg.workCenterThroughput.length === 0) fail("Expected workCenterThroughput duration measurements");
  pass("Manufacturing Throughput and Average MO Completion Time verified.");

  // 6. Audit Trail
  const audit = await apiAdminA("GET", "/analytics/audit");
  if (audit.length === 0) fail("Expected audit logs populated");
  pass(`Audit Trail returned ${audit.length} system audit logs.`);
}

// ─── DOCUMENT EXPORTS ────────────────────────────────────────────────────────

async function test3_verifyExports() {
  header("4. Triggering document exporter formats...");

  // 1. CSV
  const csvRes = await apiAdminA("GET", "/analytics/export?type=sales&format=csv");
  if (!csvRes.contentType.includes("text/csv")) fail(`Expected text/csv, got ${csvRes.contentType}`);
  if (csvRes.buffer.length === 0) fail("CSV export returned empty buffer");
  pass("CSV Exporter: Success.");

  // 2. PDF
  const pdfRes = await apiAdminA("GET", "/analytics/export?type=sales&format=pdf");
  if (!pdfRes.contentType.includes("application/pdf")) fail(`Expected application/pdf, got ${pdfRes.contentType}`);
  if (pdfRes.buffer.length === 0) fail("PDF export returned empty buffer");
  pass("PDF Exporter: Success.");

  // 3. XLSX
  const xlsxRes = await apiAdminA("GET", "/analytics/export?type=sales&format=xlsx");
  if (!xlsxRes.contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
    fail(`Expected Excel content type, got ${xlsxRes.contentType}`);
  }
  if (xlsxRes.buffer.length === 0) fail("Excel XLSX export returned empty buffer");
  pass("XLSX Exporter: Success.");
}

// ─── ROLE-BASED ACCESS CONTROL (RBAC) ────────────────────────────────────────

async function test4_verifyRBAC() {
  header("5. Verifying RBAC departmental access controls...");

  // 1. Sales User trying to access dashboard -> should fail with 403
  try {
    await apiSalesA("GET", "/analytics/dashboard");
    fail("Sales User should not be allowed to access executive dashboard");
  } catch (err) {
    if (err.status !== 403) fail(`Expected 403, got ${err.status}: ${err.message}`);
    pass("Sales User blocked from Executive Dashboard (403 Forbidden).");
  }

  // 2. Sales User accessing Sales Analytics -> should succeed
  const salesRes = await apiSalesA("GET", "/analytics/sales");
  if (Number(salesRes.kpis.totalRevenue) !== 500) fail("Sales User failed to read sales analytics");
  pass("Sales User allowed to access Sales Analytics (200 OK).");

  // 3. Sales User trying to export purchase report -> should fail with 403
  try {
    await apiSalesA("GET", "/analytics/export?type=purchase&format=csv");
    fail("Sales User should not be allowed to export purchase reports");
  } catch (err) {
    if (err.status !== 403) fail(`Expected 403, got ${err.status}: ${err.message}`);
    pass("Sales User blocked from exporting Purchase Report (403 Forbidden).");
  }
}

// ─── MULTI-TENANT ISOLATION ──────────────────────────────────────────────────

async function test5_verifyMultiTenant() {
  header("6. Verifying Multi-Tenant isolation constraints...");

  // Tenant B queries sales analytics (expects 0 revenue, independent data)
  const salesB = await apiAdminB("GET", "/analytics/sales");
  if (Number(salesB.kpis.totalRevenue) !== 0) fail("Tenant B query leaked Tenant A's sales revenue!");
  pass("Tenant B analytics verified as isolated (0 revenue).");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("          STARTING PHASE 8 ANALYTICS E2E TESTS         ");
  console.log("=".repeat(60));

  await setup();
  await test1_createTransactions();
  await test2_verifyAnalytics();
  await test3_verifyExports();
  await test4_verifyRBAC();
  await test5_verifyMultiTenant();

  console.log("\n" + "=".repeat(60));
  console.log("          ALL PHASE 8 ANALYTICS TESTS PASSED!          ");
  console.log("=".repeat(60) + "\n");
}

main().catch(err => {
  console.error("\n❌ TEST SUITE CRASHED:", err);
  process.exit(1);
});
