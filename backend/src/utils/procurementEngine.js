import prisma from "../config/prisma.js";
import { generateRef } from "./refGen.js";
import { logAudit } from "./auditLogger.js";

/**
 * Trigger replenishment for a product based on shortage.
 * @param {object} product - Product model from DB
 * @param {number} shortage - shortage quantity
 * @param {number} salesOrderId - ID of the SalesOrder that triggered this
 * @param {number} userId - user confirming the SO
 * @param {number} tenantId - tenant owning this operation
 * @param {object} tx - Prisma transaction client
 */
export const trigger = async (product, shortage, salesOrderId, userId, tenantId, tx = prisma) => {
  if (product.procurementType === "PURCHASE") {
    const vendors = await tx.productVendor.findMany({
      where: { productId: product.id },
      include: { vendor: true },
    });

    if (vendors.length === 0) {
      throw {
        status: 400,
        message: `MTO Purchase replenishment failed: No suppliers are linked to product "${product.name}" (${product.sku}). Please link a vendor before confirming.`,
      };
    }

    vendors.sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice));
    const cheapestVendor = vendors[0];

    const orderRef = await generateRef("PO", tenantId, tx);

    const po = await tx.purchaseOrder.create({
      data: {
        orderRef,
        vendorId: cheapestVendor.vendorId,
        userId,
        salesOrderId,
        tenantId,
        status: "DRAFT",
        notes: `MTO auto-generated from Sales Order ID ${salesOrderId}`,
        lines: {
          create: [{ productId: product.id, qty: shortage, unitCost: cheapestVendor.unitPrice }],
        },
      },
    });

    await logAudit(
      {
        tenantId,
        userId,
        action: "PURCHASE_ORDER_AUTO_CREATED",
        entityType: "PurchaseOrder",
        entityId: po.id,
        description: `Purchase Order ${orderRef} auto-created for shortage of ${shortage} units of "${product.name}"`,
        salesOrderId,
        purchaseOrderId: po.id,
        metadata: { shortage, productId: product.id },
      },
      tx
    );

    return { type: "PO", ref: orderRef, qty: shortage, name: product.name };
  }

  if (product.procurementType === "MANUFACTURING") {
    const bom = await tx.boM.findFirst({
      where: { productId: product.id, tenantId, isActive: true },
      include: { operations: true, components: true },
    });

    if (!bom) {
      throw {
        status: 400,
        message: `MTO Manufacturing replenishment failed: No active Bill of Materials (BoM) defined for product "${product.name}" (${product.sku}). Please create an active BoM before confirming.`,
      };
    }

    const moRef = await generateRef("MO", tenantId, tx);

    const mo = await tx.manufacturingOrder.create({
      data: {
        moRef,
        productId: product.id,
        bomId: bom.id,
        qty: shortage,
        userId,
        salesOrderId,
        tenantId,
        status: "DRAFT",
        notes: `MTO auto-generated from Sales Order ID ${salesOrderId}`,
        workOrders: {
          create: bom.operations.map((op) => ({
            workCenterId: op.workCenterId,
            operationName: op.name,
            durationMins: op.durationMins,
            sequence: op.sequence,
            status: "PENDING",
            tenantId,
          })),
        },
        components: {
          create: bom.components.map((comp) => ({
            productId: comp.productId,
            qtyRequired: Number(comp.qty) * shortage,
            tenantId,
          })),
        },
      },
    });

    await logAudit(
      {
        tenantId,
        userId,
        action: "MANUFACTURING_ORDER_AUTO_CREATED",
        entityType: "ManufacturingOrder",
        entityId: mo.id,
        description: `Manufacturing Order ${moRef} auto-created for shortage of ${shortage} units of "${product.name}"`,
        salesOrderId,
        manufacturingOrderId: mo.id,
        metadata: { shortage, productId: product.id },
      },
      tx
    );

    return { type: "MO", ref: moRef, qty: shortage, name: product.name };
  }

  throw new Error(`Unsupported procurement type: ${product.procurementType}`);
};
