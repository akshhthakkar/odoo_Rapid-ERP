/**
 * Phase 9.5 — Enterprise Audit Trail & Inventory Ledger E2E Verification Tests
 * Uses native fetch (Node 18+). No external dependencies.
 */

const BASE = "http://localhost:3000/api";
const pass = (msg) => console.log(`   PASS: ${msg}`);
const fail = (msg) => { console.error(`   FAIL: ${msg}`); process.exit(1); };
const header = (msg) => console.log(`\n${msg}`);

let tokenAdminA, tokenSalesA;
let tenantAId, tenantBId;
let tokenAdminB;
let testProductId;
let mainWhId;

async function req(method, path, body, token, customHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...customHeaders };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    const blob = await res.arrayBuffer();
    if (!res.ok) throw { status: res.status, message: "Request failed" };
    return { buffer: Buffer.from(blob), contentType, status: res.status };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    data.status = res.status;
    throw data;
  }
  return data;
}

const apiAdminA = (method, path, body, customHeaders = {}) => req(method, path, body, tokenAdminA, customHeaders);
const apiSalesA = (method, path, body, customHeaders = {}) => req(method, path, body, tokenSalesA, customHeaders);
const apiAdminB = (method, path, body, customHeaders = {}) => req(method, path, body, tokenAdminB, customHeaders);

// ─── SETUP ────────────────────────────────────────────────────────────────────

async function setup() {
  header("1. Initializing Audit & Ledger Test Environment...");
  const ts = Date.now();

  // 1. Register Tenant A
  const regA = await req("POST", "/company/register", {
    companyName: `TEST_AUDIT_A_${ts}`,
    email: `audit_admin_${ts}@test.com`,
    password: "Test@1234",
    adminName: "Audit Admin A",
  });
  tokenAdminA = regA.token;
  tenantAId = regA.tenant?.id;
  pass(`Tenant A registered. ID: ${tenantAId}`);

  // Create Sales User for Tenant A using invite
  const inviteRes = await apiAdminA("POST", "/users/invite", {
    name: "Audit Sales User",
    email: `audit_sales_${ts}@test.com`,
    role: "SALES_USER",
  });
  const tempPassword = inviteRes.tempPassword;

  // Login Sales User
  const loginSales = await req("POST", "/auth/login", {
    email: `audit_sales_${ts}@test.com`,
    password: tempPassword,
  });
  tokenSalesA = loginSales.token;
  pass("Tenant A Sales User created and logged in.");

  // 2. Register Tenant B
  const regB = await req("POST", "/company/register", {
    companyName: `TEST_AUDIT_B_${ts}`,
    email: `audit_admin_b_${ts}@test.com`,
    password: "Test@1234",
    adminName: "Audit Admin B",
  });
  tokenAdminB = regB.token;
  tenantBId = regB.tenant?.id;
  pass(`Tenant B registered. ID: ${tenantBId}`);

  // Resolve warehouse list for Tenant A
  const whs = await apiAdminA("GET", "/inventory/warehouses");
  mainWhId = whs.find(w => w.code === "MAIN")?.id || whs[0]?.id;
}

// ─── AUDIT TRAIL TESTS ────────────────────────────────────────────────────────

async function testAuditTrail() {
  header("2. Testing Audit Trail System & Changed-Fields Diffs...");
  const ts = Date.now();

  // 1. Create a product and assert audit log creation with IP and UA tracking headers
  const customHeaders = {
    "X-Forwarded-For": "203.0.113.195",
    "User-Agent": "RapidERP-Test-Agent/1.0",
  };

  const productRes = await apiAdminA("POST", "/products", {
    name: "Test Desk",
    sku: `DSK_${ts}`,
    procurementType: "PURCHASE",
    salesPrice: 100.0,
    costPrice: 60.0,
    reorderLevel: 5,
  }, customHeaders);

  testProductId = productRes.product?.id || productRes.id;
  pass(`Product created. ID: ${testProductId}`);

  // Fetch audit logs list
  let logsData = await apiAdminA("GET", "/audit");
  let createLogs = logsData.logs.filter(l => l.entityId === testProductId && l.action === "PRODUCT_CREATED");
  if (createLogs.length === 0) fail("PRODUCT_CREATED audit log not found");
  
  const createLog = createLogs[0];
  if (createLog.ipAddress !== "203.0.113.195") fail(`IP Address context not recorded correctly. Expected 203.0.113.195, got ${createLog.ipAddress}`);
  if (createLog.userAgent !== "RapidERP-Test-Agent/1.0") fail(`User Agent context not recorded. Got ${createLog.userAgent}`);
  pass("PRODUCT_CREATED audit log found with correct IP/UA context headers.");

  // 2. Update the product to check changed-fields-only diffing
  await apiAdminA("PUT", `/products/${testProductId}`, {
    name: "Modified Test Desk",
    sku: `DSK_${ts}`,
    procurementType: "PURCHASE",
    salesPrice: 120.0, // changed
    costPrice: 60.0,  // same
    reorderLevel: 10,  // changed
  });

  logsData = await apiAdminA("GET", "/audit");
  let updateLogs = logsData.logs.filter(l => l.entityId === testProductId && l.action === "PRODUCT_UPDATED");
  if (updateLogs.length === 0) fail("PRODUCT_UPDATED audit log not found");

  const updateLog = updateLogs[0];
  const oldVals = updateLog.oldValues;
  const newVals = updateLog.newValues;

  if (oldVals.salesPrice === undefined || newVals.salesPrice === undefined) fail("salesPrice change not recorded in diff");
  if (oldVals.costPrice !== undefined || newVals.costPrice !== undefined) fail("costPrice unchanged field was incorrectly logged");
  
  // Convert Decimals / Strings check
  if (Number(oldVals.salesPrice) !== 100 || Number(newVals.salesPrice) !== 120) fail(`salesPrice change values wrong. Expected 100->120, got ${oldVals.salesPrice}->${newVals.salesPrice}`);
  if (Number(oldVals.reorderLevel) !== 5 || Number(newVals.reorderLevel) !== 10) fail(`reorderLevel change values wrong. Expected 5->10, got ${oldVals.reorderLevel}->${newVals.reorderLevel}`);
  pass("PRODUCT_UPDATED audit log includes only changed fields (salesPrice and reorderLevel).");

  // 3. Verify security: ensure sensitive fields are stripped
  // Trigger user role change audit log and verify passwordHash is not present in updated fields
  const coUsers = await apiAdminA("GET", "/users");
  const salesUserId = coUsers.find(u => u.role === "SALES_USER")?.id;

  if (salesUserId) {
    await apiAdminA("PUT", `/users/${salesUserId}/role`, { role: "BUSINESS_OWNER" });
    logsData = await apiAdminA("GET", "/audit");
    const roleLogs = logsData.logs.filter(l => l.entityId === salesUserId && l.action === "ROLE_CHANGED");
    if (roleLogs.length > 0) {
      const logData = roleLogs[0];
      if (logData.oldValues?.passwordHash || logData.newValues?.passwordHash || logData.oldValues?.password || logData.newValues?.password) {
        fail("Security vulnerability: sensitive security hash fields leaked in audit logs!");
      }
    }
  }
  pass("Sensitive password fields are stripped from audit details.");

  // 4. Verify RBAC check: Sales user must be blocked with 403
  try {
    await apiSalesA("GET", "/audit");
    fail("Sales user was allowed to access /api/audit (RBAC fail)");
  } catch (err) {
    if (err.status !== 403) fail(`Sales user access to /api/audit returned status ${err.status} instead of 403`);
    pass("Sales User is correctly blocked from audit logs route with 403.");
  }

  // 5. Verify Multi-Tenant Boundary: Tenant B Admin must not see Tenant A logs
  const tenantBLogs = await apiAdminB("GET", "/audit");
  const tenantALogFound = tenantBLogs.logs.some(l => l.tenantId === tenantAId);
  if (tenantALogFound) fail("Multi-tenant breach: Tenant B admin retrieved Tenant A audit logs!");
  pass("Multi-tenancy isolation for audit trails verified.");
}

// ─── INVENTORY LEDGER TESTS ───────────────────────────────────────────────────

async function testInventoryLedger() {
  header("3. Testing Inventory Ledger Calculations & Math...");

  // Get current stock ledger for the product - opening balance should be 0
  let ledger = await apiAdminA("GET", `/inventory/ledger?productId=${testProductId}`);
  if (ledger.openingStock !== 0) fail(`Initial opening stock expected 0, got ${ledger.openingStock}`);
  if (ledger.rows.length !== 0) fail(`Initial ledger rows expected 0, got ${ledger.rows.length}`);
  pass("Initial product opening stock is 0.");

  // 1. Inward: perform stock adjustment (+50)
  await apiAdminA("POST", "/inventory/adjustments", {
    warehouseId: mainWhId,
    reason: "Initial ledger test inbound",
    lines: [{ productId: testProductId, qty: 50 }]
  });

  // 2. Outward: create a Sales Order, confirm, and deliver 5 units
  const cust = await apiAdminA("POST", "/customers", { name: "Ledger Palace", email: `ledger_${Date.now()}@test.com` });
  const customerId = cust.customer?.id || cust.id;

  const so = await apiAdminA("POST", "/sales", {
    customerId,
    notes: "Ledger test sale",
    lines: [{ productId: testProductId, qty: 5, unitPrice: 200 }]
  });
  const soId = so.order?.id || so.id;

  // Confirm -> reserve stock
  await apiAdminA("POST", `/sales/${soId}/confirm`);

  // Deliver -> physical outflow
  const soDetails = await apiAdminA("GET", `/sales/${soId}`);
  const soLineId = soDetails.lines[0].id;
  await apiAdminA("POST", `/sales/${soId}/deliver`, {
    lineDeliveries: [{ lineId: soLineId, qty: 5 }]
  });
  pass("Stock adjustment (+50) and sales delivery (-5) generated.");

  // 3. Verify calculations in Ledger
  ledger = await apiAdminA("GET", `/inventory/ledger?productId=${testProductId}`);
  
  // Math assertions:
  // Opening: 0, Inward: 50, Outward: 5, Net Change: 45, Closing: 45
  if (ledger.openingStock !== 0) fail(`Opening stock wrong: ${ledger.openingStock}`);
  if (ledger.closingStock !== 45) fail(`Closing stock wrong: ${ledger.closingStock}`);
  if (ledger.netChange !== 45) fail(`Net change wrong: ${ledger.netChange}`);
  if (ledger.purchases !== 0) fail("Purchases total should be 0");
  if (ledger.sales !== 5) fail(`Sales total expected 5, got ${ledger.sales}`);
  if (ledger.rows.length !== 2) fail(`Expected 2 ledger movement rows, got ${ledger.rows.length}`);
  
  // Running balance check
  const adjRow = ledger.rows.find(r => r.movementType === "STOCK_ADJUSTMENT");
  const delRow = ledger.rows.find(r => r.movementType === "SALE_DELIVERY");
  
  if (!adjRow || !delRow) fail("Ledger rows missing movement details");
  if (adjRow.runningBalance !== 50) fail(`Adjustment running balance wrong. Expected 50, got ${adjRow.runningBalance}`);
  if (delRow.runningBalance !== 45) fail(`Delivery running balance wrong. Expected 45, got ${delRow.runningBalance}`);
  pass("Ledger totals, running balances, and movement rows computed correctly.");

  // 4. Assert database onHandQty reconciles exactly with Ledger closing stock
  const prodDetails = await apiAdminA("GET", `/products`);
  const prod = prodDetails.find(p => p.id === testProductId);
  if (Number(prod.onHandQty) !== ledger.closingStock) {
    fail(`Ledger mismatch! Product onHandQty is ${prod.onHandQty}, but Ledger Closing Balance is ${ledger.closingStock}`);
  }
  pass("Database product on-hand quantity reconciles perfectly with ledger closing balance.");

  // 5. Multi-tenant boundary check for ledger
  try {
    await apiAdminB("GET", `/inventory/ledger?productId=${testProductId}`);
    fail("Tenant B Admin was allowed to access Tenant A product ledger (multi-tenant boundary breached!)");
  } catch (err) {
    if (err.status !== 404) fail(`Tenant B ledger access returned status ${err.status} instead of 404`);
    pass("Tenant isolation boundary for inventory ledger verified.");
  }
}

// ─── EXPORT FORMAT TESTS ──────────────────────────────────────────────────────

async function testExportFormats() {
  header("4. Testing Exporters (CSV, Excel, PDF)...");

  // 1. Audit Trail Exports
  let csvRes = await apiAdminA("GET", "/audit/export?format=csv");
  if (csvRes.status !== 200 || csvRes.contentType !== "text/csv") fail(`Audit CSV failed. Status: ${csvRes.status}, Content-Type: ${csvRes.contentType}`);
  
  let xlsxRes = await apiAdminA("GET", "/audit/export?format=xlsx");
  if (xlsxRes.status !== 200 || !xlsxRes.contentType.includes("spreadsheetml")) fail(`Audit XLSX failed. Status: ${xlsxRes.status}, Content-Type: ${xlsxRes.contentType}`);

  let pdfRes = await apiAdminA("GET", "/audit/export?format=pdf");
  if (pdfRes.status !== 200 || pdfRes.contentType !== "application/pdf") fail(`Audit PDF failed. Status: ${pdfRes.status}, Content-Type: ${pdfRes.contentType}`);
  pass("Audit trail reports export as CSV, XLSX, and PDF successfully.");

  // 2. Inventory Ledger Exports
  csvRes = await apiAdminA("GET", `/inventory/ledger/export?productId=${testProductId}&format=csv`);
  if (csvRes.status !== 200 || csvRes.contentType !== "text/csv") fail(`Ledger CSV failed. Status: ${csvRes.status}, Content-Type: ${csvRes.contentType}`);
  
  xlsxRes = await apiAdminA("GET", `/inventory/ledger/export?productId=${testProductId}&format=xlsx`);
  if (xlsxRes.status !== 200 || !xlsxRes.contentType.includes("spreadsheetml")) fail(`Ledger XLSX failed. Status: ${xlsxRes.status}, Content-Type: ${xlsxRes.contentType}`);

  pdfRes = await apiAdminA("GET", `/inventory/ledger/export?productId=${testProductId}&format=pdf`);
  if (pdfRes.status !== 200 || pdfRes.contentType !== "application/pdf") fail(`Ledger PDF failed. Status: ${pdfRes.status}, Content-Type: ${pdfRes.contentType}`);
  pass("Inventory ledger reports export as CSV, XLSX, and PDF successfully.");
}

// ─── RUN ALL ──────────────────────────────────────────────────────────────────

async function run() {
  try {
    await setup();
    await testAuditTrail();
    await testInventoryLedger();
    await testExportFormats();

    header("⭐ ALL PHASE 9.5 VERIFICATION TESTS COMPLETED SUCCESSFULLY! ⭐\n");
  } catch (err) {
    console.error("\n❌ TESTS FAILED:", err);
    process.exit(1);
  }
}

run();
