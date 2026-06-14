/**
 * seedTodayMovements.js
 * Generates stock movements for today (current system date) for all tenants
 * to populate the "Today's Stock Ledger Activity Summary" on the dashboard.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Today\'s Stock Ledger Activity...');
  
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    console.log('No tenants found. Please seed the database first.');
    return;
  }

  for (const tenant of tenants) {
    console.log(`Processing Tenant: ${tenant.name} (ID: ${tenant.id})...`);
    
    // Find warehouses and products for this tenant
    const warehouses = await prisma.warehouse.findMany({ where: { tenantId: tenant.id } });
    const products = await prisma.product.findMany({ where: { tenantId: tenant.id } });

    if (warehouses.length === 0 || products.length === 0) {
      console.log(`  Skipping: Warehouses or products missing.`);
      continue;
    }

    const warehouseId = warehouses[0].id;
    const rawProducts = products.filter(p => p.procurementType === 'PURCHASE');
    const finishedProducts = products.filter(p => p.procurementType === 'MANUFACTURING');

    const selectProduct = (list, fallbackList) => {
      if (list.length > 0) return list[Math.floor(Math.random() * list.length)];
      return fallbackList[Math.floor(Math.random() * fallbackList.length)];
    };

    // 1. PURCHASE_RECEIPT (Purchases Inward)
    const purchaseProduct = selectProduct(rawProducts, products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: purchaseProduct.id,
        warehouseId,
        movementType: 'PURCHASE_RECEIPT',
        qty: 150,
        referenceType: 'PurchaseOrder',
        referenceId: 9999,
        reason: 'Daily replenishment receipt',
        createdAt: new Date(),
      }
    });

    // 2. SALE_DELIVERY (Sales Outward)
    const saleProduct = selectProduct(finishedProducts, products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: saleProduct.id,
        warehouseId,
        movementType: 'SALE_DELIVERY',
        qty: -45,
        referenceType: 'SalesOrder',
        referenceId: 9999,
        reason: 'Daily outward shipment',
        createdAt: new Date(),
      }
    });

    // 3. MANUFACTURING_PRODUCE (Production Produced)
    const produceProduct = selectProduct(finishedProducts, products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: produceProduct.id,
        warehouseId,
        movementType: 'MANUFACTURING_PRODUCE',
        qty: 80,
        referenceType: 'ManufacturingOrder',
        referenceId: 9999,
        reason: 'Daily completed output production',
        createdAt: new Date(),
      }
    });

    // 4. MANUFACTURING_CONSUME (Components Consumed)
    const consumeProduct = selectProduct(rawProducts, products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: consumeProduct.id,
        warehouseId,
        movementType: 'MANUFACTURING_CONSUME',
        qty: -120,
        referenceType: 'ManufacturingOrder',
        referenceId: 9999,
        reason: 'Daily component consumption',
        createdAt: new Date(),
      }
    });

    console.log(`  ✅ Successfully seeded 4 stock movements for ${tenant.name}`);
  }

  console.log('\n🎉 Today\'s stock ledger activity seeding COMPLETE!');
}

main()
  .catch((e) => {
    console.error('Error seeding today\'s movements:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
