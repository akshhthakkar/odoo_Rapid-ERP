/**
 * seedDemoData.js — Full Demo Environment Seeder for Rapid ERP
 *
 * Generates 3 tenants × 12 months of realistic ERP data.
 * SAFETY: Aborts automatically if NODE_ENV === 'production'
 */

import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import { resetDemoData } from './resetDemoData.js';

// ── GUARD ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ABORTED: Cannot run seed script in production environment!');
  process.exit(1);
}

// ── HELPERS ────────────────────────────────────────────────────────────────

/** Run items in controlled batches to avoid DB connection saturation on Neon */
async function runBatches(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item, j) => fn(item, i + j)));
    results.push(...batchResults);
  }
  return results;
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, d = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(d));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const dateInPast = (monthsAgo) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(randInt(1, 28));
  return d;
};

const seasonalFactor = (date) => {
  const m = date.getMonth();
  if (m >= 3 && m <= 4) return 1.4;
  if (m >= 9 && m <= 10) return 1.5;
  if (m === 11 || m === 0) return 1.2;
  return 1.0;
};

const PASSWORD_HASH = await bcrypt.hash('Demo@123', 10);

// ── DATA TEMPLATES ─────────────────────────────────────────────────────────

const TENANTS = [
  { name: 'Rapid Furniture Pvt Ltd', slug: 'rapid-furniture' },
  { name: 'Modern Furnishings Ltd', slug: 'modern-furnishings' },
  { name: 'Demo Manufacturing Corp', slug: 'demo-manufacturing' },
];

const ROLES = ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER'];

const RAW_MATERIAL_NAMES = [
  'Oak Wood Planks', 'Pine Timber', 'Teak Veneer', 'MDF Board', 'Plywood Sheet',
  'Steel Rod', 'Aluminum Extrusion', 'Brass Fittings', 'Steel Bracket', 'Iron Pipe',
  'Cotton Fabric', 'Foam Padding', 'Leather Sheet', 'Synthetic Fiber', 'Velvet Cloth',
  'Wood Varnish', 'Wood Stain', 'Primer Coat', 'Sandpaper', 'Wood Glue',
];

const FINISHED_GOOD_NAMES = [
  'Executive Office Chair', 'L-Shaped Work Desk', 'Ergonomic Study Chair', 'Wooden Bookshelf',
  'Dining Table 6-Seater', 'King Size Bed Frame', 'Queen Size Bed Frame', 'Coffee Table',
  'TV Entertainment Unit', 'Wardrobe 3-Door', 'Bedside Cabinet', 'Chest of Drawers',
  'Lounge Sofa 3-Seater', 'Corner Sectional Sofa', 'Recliner Chair',
  'Standing Desk Frame', 'Conference Table', 'Reception Counter', 'Outdoor Garden Chair', 'Patio Table',
  'Kids Study Desk', 'Children Bunk Bed', 'Bar Stool Set', 'Folding Dining Chair', 'Computer Desk',
  'Shoe Rack Cabinet', 'Kitchen Island', 'Bathroom Vanity Unit', 'Hallway Console Table', 'Display Cabinet',
];

const CUSTOMER_NAMES = [
  'Apex Interiors Pvt Ltd', 'Blue Ridge Hotels', 'Coastal Living Decor', 'Downtown Office Solutions',
  'Elite Furnishing Hub', 'Fusion Home Decor', 'Grand Palace Hotels', 'Heritage Interior Works',
  'Iconic Spaces Ltd', 'Jade Home Collections', 'Kingfisher Hospitality', 'Luxe Residences',
  'Metro Home Mart', 'Nova Furnishings Co', 'Orchid Hotels Group', 'Prestige Interior Studio',
  'Quality Homes Ltd', 'Regent Decor', 'Sunrise Interior Solutions', 'Teak & Timber Gallery',
  'Urban Living Concepts', 'Vista Home Stores', 'Wellspring Residences', 'Xclusive Furniture Mart',
  'Yellow Brick Interiors', 'Zenith Commercial Spaces', 'Artisan Home Works', 'Blossom Decor Hub',
  'Classic Furniture House', 'Dynasty Interiors', 'Elite Living Corp', 'Finesse Home Gallery',
  'Grandeur Homes', 'Harmony Interior Design', 'Inspire Living Spaces', 'Junction Home Stores',
  'Keystone Furnishings', 'Landmark Interiors', 'Marquee Home Decor', 'Neon Living Concepts',
  'Opulent Home Spaces', 'Pinnacle Interior Works', 'Quorum Home Solutions', 'Regal Decor Studio',
  'Sanctuary Interiors', 'Timeless Home Decor', 'Unique Furniture Mart', 'Velocity Interiors',
  'Woodland Furniture Co', 'Zephyr Living',
];

const VENDOR_NAMES = [
  'Timber World Suppliers', 'Metal Craft Industries', 'Fabric Galaxy Ltd', 'Chemical Solutions India',
  'Poly Foam Industries', 'Hardwood Depot Pvt Ltd', 'Steel Force Traders', 'Textiles Direct Ltd',
  'Wood Polish Masters', 'Hardware Hub India', 'Premium Timber Traders', 'Alliance Metal Works',
  'National Fabric House', 'Surface Finish Experts', 'Structural Steel Co',
];

const WORK_CENTER_NAMES = [
  'CNC Cutting Station', 'Assembly Line A', 'Finishing & Polish Bay', 'Upholstery Workshop', 'Quality Control Bay',
];

// ── TENANT SEEDER ──────────────────────────────────────────────────────────

async function seedTenant(tenantDef, idx) {
  const tenantNum = idx + 1;
  console.log(`\n--- Seeding Tenant: ${tenantDef.name} (ID: ${tenantNum}) ---`);

  // 1. Tenant
  const tenant = await prisma.tenant.create({
    data: { name: tenantDef.name, slug: tenantDef.slug },
  });

  // 2. Users
  const users = await Promise.all(
    ROLES.map((role) =>
      prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: `${role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} ${tenantNum}`,
          email: `${role.toLowerCase()}_${tenantNum}@test.com`,
          passwordHash: PASSWORD_HASH,
          role,
          isActive: true,
        },
      })
    )
  );
  const adminUser = users[0];
  console.log(`✅ Seeded ${users.length} users. Admin: admin_${tenantNum}@test.com`);

  // 3. Warehouses
  const warehouseDefs = [
    { code: `WH-MAIN-T${tenantNum}`, name: 'Main Warehouse' },
    { code: `WH-RAW-T${tenantNum}`, name: 'Raw Materials Store' },
    { code: `WH-FG-T${tenantNum}`, name: 'Finished Goods Store' },
    { code: `WH-TRANSIT-T${tenantNum}`, name: 'Transit Hub' },
  ];
  const warehouses = await Promise.all(
    warehouseDefs.map((w) =>
      prisma.warehouse.create({
        data: { tenantId: tenant.id, code: w.code, name: w.name, isActive: true },
      })
    )
  );
  console.log(`✅ Seeded ${warehouses.length} warehouses`);

  // 4. Work Centers
  const workCenters = await Promise.all(
    WORK_CENTER_NAMES.map((name) =>
      prisma.workCenter.create({
        data: { tenantId: tenant.id, name, description: `${name} operations` },
      })
    )
  );
  console.log(`✅ Seeded ${workCenters.length} work centers`);

  // 5. Products
  const rawProducts = await runBatches(RAW_MATERIAL_NAMES, 10, (name, i) =>
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        sku: `RM-${String(i + 1).padStart(3, '0')}-T${tenantNum}`,
        costPrice: randFloat(50, 800),
        salesPrice: randFloat(100, 1200),
        lastPurchaseCost: randFloat(50, 800),
        reorderLevel: randInt(10, 50),
        onHandQty: randInt(100, 500),
        reservedQty: 0,
        isActive: true,
        procurementType: 'PURCHASE',
      },
    })
  );

  const finishedProducts = await runBatches(FINISHED_GOOD_NAMES, 10, (name, i) =>
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        sku: `FG-${String(i + 1).padStart(3, '0')}-T${tenantNum}`,
        costPrice: randFloat(2000, 25000),
        salesPrice: randFloat(3000, 40000),
        lastPurchaseCost: randFloat(2000, 25000),
        reorderLevel: randInt(2, 15),
        onHandQty: randInt(20, 120),
        reservedQty: 0,
        isActive: true,
        procurementType: 'MANUFACTURING',
      },
    })
  );

  const allProducts = [...rawProducts, ...finishedProducts];
  console.log(`✅ Seeded ${allProducts.length} products (${rawProducts.length} Raw, ${finishedProducts.length} Finished)`);

  // 6. Vendors
  const vendors = await runBatches(VENDOR_NAMES, 8, (name) =>
    prisma.vendor.create({
      data: {
        tenantId: tenant.id,
        name,
        email: `vendor${Math.floor(Math.random() * 9999)}@supply.com`,
        phone: `+91-${randInt(7000000000, 9999999999)}`,
        address: `${randInt(1, 999)} Industrial Estate, Mumbai`,
        isActive: true,
      },
    })
  );
  console.log(`✅ Seeded ${vendors.length} vendors`);

  // 7. Customers
  const customers = await runBatches(CUSTOMER_NAMES, 10, (name) =>
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name,
        email: `orders${Math.floor(Math.random() * 9999)}@${name.toLowerCase().replace(/[\s&]+/g, '')}.com`,
        phone: `+91-${randInt(7000000000, 9999999999)}`,
        address: `${randInt(1, 500)} Business District, Bangalore`,
        isActive: true,
      },
    })
  );
  console.log(`✅ Seeded ${customers.length} customers`);

  // 8. Bills of Materials
  const boms = await runBatches(finishedProducts, 8, (fp) =>
    prisma.boM.create({
      data: {
        tenantId: tenant.id,
        productId: fp.id,
        version: '1.0',
        isActive: true,
        notes: `Standard production BOM for ${fp.name}`,
        components: {
          create: rawProducts.slice(0, randInt(2, 5)).map((rp) => ({
            productId: rp.id,
            qty: randFloat(0.5, 5, 3),
          })),
        },
        operations: {
          create: workCenters.slice(0, randInt(1, 3)).map((wc, oi) => ({
            workCenterId: wc.id,
            name: `Operation ${oi + 1}`,
            durationMins: randInt(30, 240),
            sequence: oi + 1,
          })),
        },
      },
      include: { components: true, operations: true },
    })
  );
  console.log(`✅ Seeded BoMs for ${boms.length} finished products`);

  // 9. Inventory Balances
  console.log('Initializing stock balances and movements...');
  await runBatches(allProducts, 10, (p) =>
    prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        productId: p.id,
        warehouseId: warehouses[0].id,
        onHandQty: p.onHandQty,
        reservedQty: 0,
      },
    })
  );
  console.log('✅ Seeding initial balances done');

  // 10. Sales Orders (200)
  console.log('Generating 200 Sales Orders with realistic seasonal trends...');
  let soCounter = 1;
  await runBatches(Array.from({ length: 200 }), 10, async () => {
    const monthsAgo = randInt(0, 11);
    const orderDate = dateInPast(monthsAgo);
    const factor = seasonalFactor(orderDate);
    const customer = pick(customers);
    const lineCount = randInt(1, 5);
    const lines = [];
    for (let l = 0; l < lineCount; l++) {
      const product = pick(finishedProducts);
      const qty = Math.ceil(randInt(1, 10) * factor);
      lines.push({
        productId: product.id,
        qty,
        unitPrice: product.salesPrice,
        reservedQty: 0,
        deliveredQty: Math.floor(qty * randFloat(0.5, 1.0)),
        shortageQty: 0,
      });
    }
    const status = pick(['CONFIRMED', 'FULLY_DELIVERED', 'PARTIALLY_DELIVERED']);
    return prisma.salesOrder.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        userId: adminUser.id,
        orderRef: `SO-T${tenantNum}-${String(soCounter++).padStart(5, '0')}`,
        status,
        orderDate,
        requestedDeliveryDate: new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        lines: { create: lines },
      },
    });
  });
  console.log('✅ Seeded 200 Sales Orders');

  // 11. Purchase Orders (150)
  console.log('Generating 150 Purchase Orders...');
  let poCounter = 1;
  await runBatches(Array.from({ length: 150 }), 10, async () => {
    const monthsAgo = randInt(0, 11);
    const orderDate = dateInPast(monthsAgo);
    const vendor = pick(vendors);
    const lineCount = randInt(1, 4);
    const lines = [];
    for (let l = 0; l < lineCount; l++) {
      const product = pick(rawProducts);
      const qty = randInt(10, 100);
      lines.push({
        productId: product.id,
        qty,
        unitCost: Number(product.lastPurchaseCost) || Number(product.costPrice),
        receivedQty: Math.floor(qty * randFloat(0.5, 1.0)),
      });
    }
    const status = pick(['RECEIVED', 'PARTIALLY_RECEIVED', 'SENT']);
    return prisma.purchaseOrder.create({
      data: {
        tenantId: tenant.id,
        vendorId: vendor.id,
        userId: adminUser.id,
        orderRef: `PO-T${tenantNum}-${String(poCounter++).padStart(5, '0')}`,
        status,
        orderDate,
        expectedDeliveryDate: new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        receivedDate: status === 'RECEIVED' ? new Date(orderDate.getTime() + 10 * 24 * 60 * 60 * 1000) : null,
        lines: { create: lines },
      },
    });
  });
  console.log('✅ Seeded 150 Purchase Orders');

  // 12. Manufacturing Orders (100)
  console.log('Generating 100 Manufacturing Orders...');
  let moCounter = 1;
  await runBatches(Array.from({ length: 100 }), 8, async () => {
    const bom = pick(boms);
    const monthsAgo = randInt(0, 11);
    const scheduledDate = dateInPast(monthsAgo);
    const status = pick(['DONE', 'IN_PROGRESS', 'CONFIRMED', 'DRAFT']);
    const qty = randInt(2, 20);
    return prisma.manufacturingOrder.create({
      data: {
        tenantId: tenant.id,
        bomId: bom.id,
        productId: bom.productId,
        userId: adminUser.id,
        moRef: `MO-T${tenantNum}-${String(moCounter++).padStart(5, '0')}`,
        status,
        qty,
        scheduledDate,
        completedAt: status === 'DONE' ? new Date(scheduledDate.getTime() + randInt(1, 5) * 24 * 60 * 60 * 1000) : null,
        workOrders: {
          create: bom.operations.map((op, oi) => ({
            tenantId: tenant.id,
            workCenterId: op.workCenterId,
            operationName: op.name,
            durationMins: op.durationMins,
            sequence: oi + 1,
            status: status === 'DONE' ? 'DONE' : pick(['PENDING', 'IN_PROGRESS']),
          })),
        },
        components: {
          create: bom.components.map((c) => ({
            tenantId: tenant.id,
            productId: c.productId,
            qtyRequired: Number(c.qty) * qty,
            qtyConsumed: status === 'DONE' ? Number(c.qty) * qty : 0,
          })),
        },
      },
    });
  });
  console.log('✅ Seeded 100 Manufacturing Orders');

  // 13. Stock Transfers (50)
  console.log('Generating 50 Stock Transfers...');
  let stCounter = 1;
  await runBatches(Array.from({ length: 50 }), 10, async () => {
    const product = pick(allProducts);
    const qty = randInt(5, 50);
    return prisma.stockTransfer.create({
      data: {
        tenantId: tenant.id,
        createdById: adminUser.id,
        transferRef: `ST-T${tenantNum}-${String(stCounter++).padStart(4, '0')}`,
        status: pick(['COMPLETED', 'DRAFT', 'PENDING']),
        sourceWarehouseId: warehouses[0].id,
        destinationWarehouseId: warehouses[1].id,
        lines: { create: [{ productId: product.id, qty }] },
      },
    });
  });
  console.log('✅ Seeded 50 Stock Transfers');

  // 14. Inventory Adjustments (30)
  console.log('Generating 30 Inventory Adjustments...');
  let adjCounter = 1;
  await runBatches(Array.from({ length: 30 }), 10, async () => {
    const product = pick(allProducts);
    return prisma.inventoryAdjustment.create({
      data: {
        tenantId: tenant.id,
        createdById: adminUser.id,
        adjustmentRef: `ADJ-T${tenantNum}-${String(adjCounter++).padStart(4, '0')}`,
        reason: pick(['DAMAGED_GOODS', 'STOCK_COUNT', 'SUPPLIER_RETURN', 'WRITE_OFF']),
        lines: {
          create: [{
            productId: product.id,
            qtyChange: randInt(-20, 50),
            reason: 'Periodic stock count adjustment',
          }],
        },
      },
    });
  });
  console.log('✅ Seeded 30 Inventory Adjustments');

  // 15. Audit Logs (50)
  console.log('Generating Audit Trail Logs...');
  const auditActions = [
    'LOGIN', 'LOGOUT', 'SALES_ORDER_CREATED', 'PURCHASE_ORDER_CREATED',
    'MANUFACTURING_ORDER_CREATED', 'INVENTORY_ADJUSTED', 'USER_CREATED',
    'DASHBOARD_VIEWED', 'BOM_CREATED', 'STOCK_TRANSFER_DONE',
  ];
  await runBatches(Array.from({ length: 50 }), 10, async (_, i) =>
    prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: pick(users).id,
        action: pick(auditActions),
        entityType: pick(['SalesOrder', 'PurchaseOrder', 'ManufacturingOrder', 'User', 'Product', 'System']),
        entityId: randInt(1, 100),
        description: `Demo audit event #${i + 1} for ${tenantDef.name}`,
        createdAt: dateInPast(randInt(0, 11)),
      },
    })
  );
  console.log('✅ Seeded Audit Trails');

  return tenant;
}

// ── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting full demo environment seeding...');
  await resetDemoData();

  console.log('Generating seeding data structures...');
  const tenants = [];
  for (let i = 0; i < TENANTS.length; i++) {
    const tenant = await seedTenant(TENANTS[i], i);
    tenants.push(tenant);
  }

  console.log(`\n✅ Seeded ${tenants.length} tenants: ${tenants.map((t) => t.name).join(', ')}`);
  console.log('\n🎉 Full demo environment seeding COMPLETE!');
  console.log('\nDemo Login Credentials (Password: Demo@123 for all users):');
  for (let i = 1; i <= TENANTS.length; i++) {
    console.log(`  Tenant ${i} Admin: admin_${i}@test.com`);
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Seeding failed:', e.message);
    if (e.meta) console.error('Prisma meta:', JSON.stringify(e.meta, null, 2));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
