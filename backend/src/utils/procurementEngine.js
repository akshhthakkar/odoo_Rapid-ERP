import prisma from '../config/prisma.js';
import { generateRef } from './refGen.js';
import { logAudit } from './auditLogger.js';

/**
 * Trigger replenishment for a product based on shortage
 * @param {object} product - Product model from DB
 * @param {number} shortage - shortage quantity
 * @param {number} salesOrderId - ID of the SalesOrder that triggered this
 * @param {number} userId - user confirming the SO
 * @param {object} tx - Prisma transaction client
 */
export const trigger = async (product, shortage, salesOrderId, userId, tx = prisma) => {
  if (product.procurementType === 'PURCHASE') {
    // 1. Locate linked suppliers
    const vendors = await tx.productVendor.findMany({
      where: { productId: product.id },
      include: { vendor: true }
    });

    if (vendors.length === 0) {
      throw {
        status: 400,
        message: `MTO Purchase replenishment failed: No suppliers are linked to product "${product.name}" (${product.sku}). Please link a vendor before confirming.`
      };
    }

    // Sort to choose the cheapest vendor (lowest unitPrice)
    vendors.sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice));
    const cheapestVendor = vendors[0];

    // 2. Generate PO reference
    const orderRef = await generateRef('PO', tx);

    // 3. Create Draft PO stub record
    const po = await tx.purchaseOrder.create({
      data: {
        orderRef,
        vendorId: cheapestVendor.vendorId,
        userId,
        salesOrderId,
        status: 'DRAFT',
        notes: `MTO auto-generated from Sales Order ID ${salesOrderId}`,
        lines: {
          create: [{
            productId: product.id,
            qty: shortage,
            unitCost: cheapestVendor.unitPrice
          }]
        }
      }
    });

    // 4. Log Audit
    await logAudit({
      userId,
      action: 'PURCHASE_ORDER_AUTO_CREATED',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      description: `Purchase Order ${orderRef} auto-created for shortage of ${shortage} units of "${product.name}"`,
      salesOrderId,
      purchaseOrderId: po.id,
      metadata: { shortage, productId: product.id }
    }, tx);

    return { type: 'PO', ref: orderRef, qty: shortage, name: product.name };
  } 
  
  if (product.procurementType === 'MANUFACTURING') {
    // 1. Locate active Bill of Materials (BoM)
    const bom = await tx.boM.findFirst({
      where: { productId: product.id, isActive: true },
      include: { operations: true }
    });

    if (!bom) {
      throw {
        status: 400,
        message: `MTO Manufacturing replenishment failed: No active Bill of Materials (BoM) defined for product "${product.name}" (${product.sku}). Please create an active BoM before confirming.`
      };
    }

    // 2. Generate MO reference
    const moRef = await generateRef('MO', tx);

    // 3. Create Draft MO stub record (Work orders created from BoM operations, without reserving components yet)
    const mo = await tx.manufacturingOrder.create({
      data: {
        moRef,
        productId: product.id,
        bomId: bom.id,
        qty: shortage,
        userId,
        salesOrderId,
        status: 'DRAFT',
        notes: `MTO auto-generated from Sales Order ID ${salesOrderId}`,
        workOrders: {
          create: bom.operations.map(op => ({
            workCenterId: op.workCenterId,
            operationName: op.name,
            durationMins: op.durationMins,
            sequence: op.sequence,
            status: 'PENDING'
          }))
        }
      }
    });

    // 4. Log Audit
    await logAudit({
      userId,
      action: 'MANUFACTURING_ORDER_AUTO_CREATED',
      entityType: 'ManufacturingOrder',
      entityId: mo.id,
      description: `Manufacturing Order ${moRef} auto-created for shortage of ${shortage} units of "${product.name}"`,
      salesOrderId,
      manufacturingOrderId: mo.id,
      metadata: { shortage, productId: product.id }
    }, tx);

    return { type: 'MO', ref: moRef, qty: shortage, name: product.name };
  }

  throw new Error(`Unsupported procurement type: ${product.procurementType}`);
};
