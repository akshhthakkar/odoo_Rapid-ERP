/**
 * resetDemoData.js — Hard Reset Script for Rapid ERP Demo Environment
 * Truncates all transactional tables in dependency-safe order
 * and resets PostgreSQL sequences.
 */
import prisma from '../src/config/prisma.js';

export async function resetDemoData() {
  console.log('Starting database hard reset...');
  console.log('Truncating tables and resetting sequences...');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "StockMovement",
      "PurchaseReceiptLine",
      "PurchaseReceipt",
      "InventoryAdjustmentLine",
      "InventoryAdjustment",
      "StockTransferLine",
      "StockTransfer",
      "InventoryBalance",
      "WorkOrder",
      "ManufacturingComponent",
      "ManufacturingOrder",
      "PurchaseOrderLine",
      "PurchaseOrder",
      "SalesOrderLine",
      "SalesOrder",
      "BoMComponent",
      "BoMOperation",
      "BoM",
      "Product",
      "Customer",
      "Vendor",
      "WorkCenter",
      "Warehouse",
      "User",
      "Tenant"
    RESTART IDENTITY CASCADE;
  `);

  console.log('✅ Database hard reset completed successfully!');
}

// Run directly if invoked standalone
if (process.argv[1].includes('resetDemoData')) {
  resetDemoData()
    .then(() => process.exit(0))
    .catch((e) => { console.error('❌ Reset failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
