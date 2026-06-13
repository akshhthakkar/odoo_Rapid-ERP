import prisma from '../../config/prisma.js';

const action = process.argv[2];

const run = async () => {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@erp.com' }
    });
    const adminId = adminUser ? adminUser.id : 1;

    if (action === 'setup') {
      console.log('--- SETUP TEST ENVIRONMENT ---');

      // 1. Delete existing mock MOs
      const deletedMos = await prisma.manufacturingOrder.deleteMany({
        where: { moRef: { startsWith: 'TEST-MO-' } }
      });
      console.log(`Deleted ${deletedMos.count} test manufacturing orders.`);

      // 2. Delete existing test BoMs
      const existingProduct = await prisma.product.findUnique({
        where: { sku: 'TABLE-DINING-01' }
      });

      if (existingProduct) {
        const deletedBoms = await prisma.boM.deleteMany({
          where: { productId: existingProduct.id }
        });
        console.log(`Deleted ${deletedBoms.count} test BoMs for TABLE-DINING-01.`);
      }

      // 3. Ensure component and finished products exist
      const productData = [
        { name: 'Oak Leg', sku: 'LEG-OAK-01', salesPrice: 15.00, costPrice: 5.00, procurementType: 'PURCHASE' },
        { name: 'Oak Table Top', sku: 'TOP-OAK-01', salesPrice: 80.00, costPrice: 30.00, procurementType: 'PURCHASE' },
        { name: 'Steel Screw Box', sku: 'SCREW-STEEL-01', salesPrice: 5.00, costPrice: 1.50, procurementType: 'PURCHASE' },
        { name: 'Wooden Dining Table', sku: 'TABLE-DINING-01', salesPrice: 299.99, costPrice: 120.00, procurementType: 'MANUFACTURING' }
      ];

      for (const p of productData) {
        let prod = await prisma.product.findUnique({ where: { sku: p.sku } });
        if (!prod) {
          prod = await prisma.product.create({
            data: {
              name: p.name,
              sku: p.sku,
              salesPrice: p.salesPrice,
              costPrice: p.costPrice,
              procurementType: p.procurementType
            }
          });
          console.log(`Created product: ${p.sku} (ID: ${prod.id})`);
        } else {
          console.log(`Product already exists: ${p.sku} (ID: ${prod.id})`);
        }
      }

      console.log('Setup finished successfully.');

    } else if (action === 'create-many') {
      const count = parseInt(process.argv[3], 10) || 50;
      console.log(`--- CREATING ${count} TEMPORARY BoMs FOR PERFORMANCE TEST ---`);

      const legProduct = await prisma.product.findUnique({ where: { sku: 'LEG-OAK-01' } });
      const wc = await prisma.workCenter.findFirst({ where: { name: 'Assembly Line' } });

      if (!legProduct || !wc) {
        console.error('Prerequisites not met. Run setup first.');
        process.exit(1);
      }

      // Create products and BoMs
      let createdCount = 0;
      for (let i = 1; i <= count; i++) {
        const sku = `TEMP-PROD-${i}`;
        let prod = await prisma.product.findUnique({ where: { sku } });
        if (!prod) {
          prod = await prisma.product.create({
            data: {
              name: `Temp Product ${i}`,
              sku: sku,
              salesPrice: 10.0,
              costPrice: 5.0,
              procurementType: 'MANUFACTURING'
            }
          });
        }

        // Delete any existing BoM for this temp product
        await prisma.boM.deleteMany({ where: { productId: prod.id } });

        // Create BoM
        await prisma.boM.create({
          data: {
            productId: prod.id,
            version: '1.0',
            isActive: true,
            components: {
              create: [
                { productId: legProduct.id, qty: 1 }
              ]
            },
            operations: {
              create: [
                { workCenterId: wc.id, name: 'Assembly', durationMins: 5, sequence: 1 }
              ]
            }
          }
        });
        createdCount++;
      }
      console.log(JSON.stringify({ success: true, count: createdCount }));

    } else if (action === 'setup-large-circular') {
      console.log('--- SETTING UP LARGE CIRCULAR DEPENDENCY CHAIN (A->B->C->D->A) ---');
      
      const wc = await prisma.workCenter.findFirst({ where: { name: 'Assembly Line' } });
      if (!wc) {
        console.error('Work Center assembly line not found.');
        process.exit(1);
      }

      const chainSKUs = ['CIRC-A', 'CIRC-B', 'CIRC-C', 'CIRC-D'];
      const resolvedProds = {};

      // 1. Ensure all products exist
      for (const sku of chainSKUs) {
        let prod = await prisma.product.findUnique({ where: { sku } });
        if (!prod) {
          prod = await prisma.product.create({
            data: {
              name: `Circ Product ${sku.split('-')[1]}`,
              sku: sku,
              salesPrice: 20.0,
              costPrice: 10.0,
              procurementType: 'MANUFACTURING'
            }
          });
        }
        resolvedProds[sku] = prod;

        // Clear existing BoMs to avoid state conflicts
        await prisma.boM.deleteMany({ where: { productId: prod.id } });
      }

      // 2. Create dependency chain
      // BoM for D: component is A
      const bomD = await prisma.boM.create({
        data: {
          productId: resolvedProds['CIRC-D'].id,
          version: '1.0',
          isActive: true,
          components: { create: [{ productId: resolvedProds['CIRC-A'].id, qty: 1 }] },
          operations: { create: [{ workCenterId: wc.id, name: 'Process D', durationMins: 5, sequence: 1 }] }
        }
      });
      console.log(`Created BoM for CIRC-D (ID: ${bomD.id}), depends on CIRC-A`);

      // BoM for C: component is D
      const bomC = await prisma.boM.create({
        data: {
          productId: resolvedProds['CIRC-C'].id,
          version: '1.0',
          isActive: true,
          components: { create: [{ productId: resolvedProds['CIRC-D'].id, qty: 1 }] },
          operations: { create: [{ workCenterId: wc.id, name: 'Process C', durationMins: 5, sequence: 1 }] }
        }
      });
      console.log(`Created BoM for CIRC-C (ID: ${bomC.id}), depends on CIRC-D`);

      // BoM for B: component is C
      const bomB = await prisma.boM.create({
        data: {
          productId: resolvedProds['CIRC-B'].id,
          version: '1.0',
          isActive: true,
          components: { create: [{ productId: resolvedProds['CIRC-C'].id, qty: 1 }] },
          operations: { create: [{ workCenterId: wc.id, name: 'Process B', durationMins: 5, sequence: 1 }] }
        }
      });
      console.log(`Created BoM for CIRC-B (ID: ${bomB.id}), depends on CIRC-C`);

      console.log(JSON.stringify({
        success: true,
        prodAId: resolvedProds['CIRC-A'].id,
        prodBId: resolvedProds['CIRC-B'].id
      }));

    } else if (action === 'create-mo') {
      const bomId = parseInt(process.argv[3], 10);
      if (isNaN(bomId)) {
        console.error('Missing or invalid bomId argument');
        process.exit(1);
      }

      const bom = await prisma.boM.findUnique({
        where: { id: bomId },
        include: { product: true }
      });

      if (!bom) {
        console.error(`BoM with ID ${bomId} not found`);
        process.exit(1);
      }

      const refNum = `TEST-MO-${Date.now()}`;
      const mo = await prisma.manufacturingOrder.create({
        data: {
          moRef: refNum,
          productId: bom.productId,
          bomId: bom.id,
          qty: 1.0,
          userId: adminId,
          status: 'CONFIRMED'
        }
      });
      console.log(JSON.stringify({ success: true, moId: mo.id, moRef: mo.moRef }));

    } else if (action === 'cleanup') {
      console.log('--- CLEANUP TEST ENVIRONMENT ---');

      // 1. Delete test manufacturing orders
      const deletedMos = await prisma.manufacturingOrder.deleteMany({
        where: { moRef: { startsWith: 'TEST-MO-' } }
      });
      console.log(`Deleted ${deletedMos.count} test manufacturing orders.`);

      // 2. Find all test products
      const testProducts = await prisma.product.findMany({
        where: {
          OR: [
            { sku: { startsWith: 'CIRC-' } },
            { sku: { startsWith: 'TEMP-PROD-' } },
            { sku: 'TABLE-DINING-01' }
          ]
        }
      });
      const testProdIds = testProducts.map(p => p.id);

      // 3. Delete all BoMs for these products or referencing these products as components
      const deletedBoms = await prisma.boM.deleteMany({
        where: {
          OR: [
            { productId: { in: testProdIds } },
            { components: { some: { productId: { in: testProdIds } } } }
          ]
        }
      });
      console.log(`Deleted ${deletedBoms.count} test BoMs.`);

      // 4. Delete the products now (keeping table dining 01 setup)
      const deletedProds = await prisma.product.deleteMany({
        where: {
          id: { in: testProdIds },
          sku: { not: 'TABLE-DINING-01' }
        }
      });
      console.log(`Deleted ${deletedProds.count} temporary test products.`);

      console.log('Cleanup finished successfully.');

    } else {
      console.error('Unknown action');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error in test-helper:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

run();
