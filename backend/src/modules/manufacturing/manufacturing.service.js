import prisma from "../../config/prisma.js";
import { generateRef } from "../../utils/refGen.js";
import { logAudit } from "../../utils/auditLogger.js";
import { consumeStock, produceStock, reserveStock } from "../../utils/stockEngine.js";
import { validateMoCreatePayload, validateMoTenantScopes } from "./manufacturing.validation.js";

// Helper to calculate MO completion progress percentage
const calculateMoProgress = (mo) => {
  if (!mo || !mo.workOrders || mo.workOrders.length === 0) return 0;
  const completed = mo.workOrders.filter(wo => wo.status === "DONE").length;
  return Math.round((completed / mo.workOrders.length) * 100);
};

// Formatter to shape MO payload
const formatMO = (mo) => {
  if (!mo) return null;
  return {
    id: mo.id,
    uid: mo.uid,
    moRef: mo.moRef,
    productId: mo.productId,
    productName: mo.product?.name,
    productSku: mo.product?.sku,
    bomId: mo.bomId,
    bomVersion: mo.bom?.version,
    qty: Number(mo.qty),
    userId: mo.userId,
    userName: mo.user?.name,
    tenantId: mo.tenantId,
    salesOrderId: mo.salesOrderId,
    salesOrderRef: mo.salesOrder?.orderRef,
    status: mo.status,
    scheduledDate: mo.scheduledDate,
    completedAt: mo.completedAt,
    notes: mo.notes,
    progress: calculateMoProgress(mo),
    createdAt: mo.createdAt,
    updatedAt: mo.updatedAt,
    components: mo.components?.map(c => ({
      id: c.id,
      productId: c.productId,
      name: c.product?.name,
      sku: c.product?.sku,
      qtyRequired: Number(c.qtyRequired),
      qtyConsumed: Number(c.qtyConsumed),
      onHandQty: Number(c.product?.onHandQty),
      reservedQty: Number(c.product?.reservedQty),
      freeToUseQty: Number(c.product?.onHandQty) - Number(c.product?.reservedQty),
    })) || [],
    workOrders: mo.workOrders?.map(wo => ({
      id: wo.id,
      workCenterId: wo.workCenterId,
      workCenterName: wo.workCenter?.name,
      operationName: wo.operationName,
      durationMins: wo.durationMins,
      sequence: wo.sequence,
      status: wo.status,
      startedAt: wo.startedAt,
      completedAt: wo.completedAt,
    })).sort((a, b) => a.sequence - b.sequence) || [],
  };
};

export const listManufacturingOrders = async (query = {}, tenantId) => {
  const { status, productId } = query;
  const where = { tenantId };
  if (status) where.status = status;
  if (productId) where.productId = Number(productId);

  const mos = await prisma.manufacturingOrder.findMany({
    where,
    include: {
      product: true,
      bom: true,
      user: true,
      salesOrder: true,
      workOrders: { include: { workCenter: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return mos.map(formatMO);
};

export const getManufacturingOrderById = async (id, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(id), tenantId },
    include: {
      product: true,
      bom: true,
      user: true,
      salesOrder: true,
      workOrders: { include: { workCenter: true } },
      components: {
        include: {
          product: true
        }
      }
    },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };

  const timelineLogs = await prisma.auditLog.findMany({
    where: { manufacturingOrderId: Number(id), tenantId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const formatted = formatMO(mo);
  return {
    ...formatted,
    timeline: timelineLogs.map(log => ({
      id: log.id,
      action: log.action,
      description: log.description,
      createdAt: log.createdAt,
      user: log.user ? { name: log.user.name, role: log.user.role } : null,
    })),
  };
};

export const createManufacturingOrder = async (data, userId, tenantId) => {
  validateMoCreatePayload(data);
  const { product, bom } = await validateMoTenantScopes(data.productId, data.bomId, tenantId);

  const qty = Number(data.qty);

  const mo = await prisma.$transaction(async (tx) => {
    const moRef = await generateRef("MO", tenantId, tx);

    const createdMo = await tx.manufacturingOrder.create({
      data: {
        moRef,
        productId: product.id,
        bomId: bom.id,
        qty,
        userId,
        tenantId,
        status: "DRAFT",
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        notes: data.notes?.trim() || null,
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
            qtyRequired: Number(comp.qty) * qty,
            tenantId,
          })),
        },
      },
      include: {
        product: true,
        bom: true,
        user: true,
        salesOrder: true,
        workOrders: { include: { workCenter: true } },
        components: { include: { product: true } },
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "MANUFACTURING_ORDER_CREATED",
      entityType: "ManufacturingOrder",
      entityId: createdMo.id,
      description: `Manufacturing Order ${moRef} created in Draft state for finished product "${product.name}"`,
      manufacturingOrderId: createdMo.id,
    }, tx);

    return createdMo;
  });

  return formatMO(mo);
};

export const confirmManufacturingOrder = async (id, userId, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(id), tenantId },
    include: { components: true },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };
  if (mo.status !== "DRAFT") {
    throw { status: 400, message: `Cannot confirm MO in "${mo.status}" status.` };
  }

  // Explicit tenant validation checks
  await validateMoTenantScopes(mo.productId, mo.bomId, tenantId);

  const updatedMo = await prisma.$transaction(async (tx) => {
    const updated = await tx.manufacturingOrder.update({
      where: { id: mo.id },
      data: { status: "CONFIRMED" },
      include: {
        product: true,
        bom: true,
        user: true,
        salesOrder: true,
        workOrders: { include: { workCenter: true } },
        components: { include: { product: true } },
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "MANUFACTURING_ORDER_CONFIRMED",
      entityType: "ManufacturingOrder",
      entityId: mo.id,
      description: `Manufacturing Order ${mo.moRef} confirmed. Component requirements locked.`,
      manufacturingOrderId: mo.id,
    }, tx);

    return updated;
  });

  return formatMO(updatedMo);
};

export const startManufacturingOrder = async (id, userId, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(id), tenantId },
    include: {
      components: { include: { product: true } },
      workOrders: true,
    },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };
  if (mo.status !== "CONFIRMED") {
    throw { status: 400, message: `Cannot start manufacturing in "${mo.status}" status.` };
  }

  // 1. Verify component stock levels
  const shortages = [];
  for (const comp of mo.components) {
    const product = comp.product;
    const required = Number(comp.qtyRequired);
    const onHand = Number(product.onHandQty);

    if (onHand < required) {
      shortages.push(`Insufficient stock for raw material ${product.name} (SKU: ${product.sku}). On hand: ${onHand}, Required: ${required}.`);
    }
  }

  if (shortages.length > 0) {
    throw {
      status: 400,
      message: shortages.join(" "),
    };
  }

  // 2. Perform consumption and start
  const updatedMo = await prisma.$transaction(async (tx) => {
    // A. Consume components stock
    for (const comp of mo.components) {
      await consumeStock(comp.productId, Number(comp.qtyRequired), mo.id, tenantId, null, tx);
      await tx.manufacturingComponent.update({
        where: { id: comp.id },
        data: { qtyConsumed: comp.qtyRequired },
      });
    }

    // B. Start first Work Order (sequence ascending)
    const sortedWos = [...mo.workOrders].sort((a, b) => a.sequence - b.sequence);
    if (sortedWos.length > 0) {
      const firstWo = sortedWos[0];
      await tx.workOrder.update({
        where: { id: firstWo.id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });

      await logAudit({
        tenantId,
        userId,
        action: "WORK_ORDER_STARTED",
        entityType: "WorkOrder",
        entityId: firstWo.id,
        description: `Work Order operation "${firstWo.operationName}" started.`,
        manufacturingOrderId: mo.id,
      }, tx);
    }

    // C. Transition MO Status to IN_PROGRESS
    const updated = await tx.manufacturingOrder.update({
      where: { id: mo.id },
      data: { status: "IN_PROGRESS" },
      include: {
        product: true,
        bom: true,
        user: true,
        salesOrder: true,
        workOrders: { include: { workCenter: true } },
        components: { include: { product: true } },
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "MANUFACTURING_STARTED",
      entityType: "ManufacturingOrder",
      entityId: mo.id,
      description: `Manufacturing started. Raw components consumed.`,
      manufacturingOrderId: mo.id,
    }, tx);

    await logAudit({
      tenantId,
      userId,
      action: "COMPONENTS_CONSUMED",
      entityType: "ManufacturingOrder",
      entityId: mo.id,
      description: `Consumed components for MO ${mo.moRef}.`,
      manufacturingOrderId: mo.id,
    }, tx);

    return updated;
  });

  return formatMO(updatedMo);
};

export const startWorkOrder = async (moId, woId, userId, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(moId), tenantId },
    include: { workOrders: true },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };
  if (mo.status !== "IN_PROGRESS") {
    throw { status: 400, message: "Cannot start a work order unless the manufacturing order is in progress." };
  }

  const targetWo = mo.workOrders.find(w => w.id === Number(woId));
  if (!targetWo) throw { status: 404, message: "Work Order not found." };
  if (targetWo.status !== "PENDING") {
    throw { status: 400, message: `Work Order is already "${targetWo.status}".` };
  }

  // Validate sequential execution rule
  const priorWos = mo.workOrders.filter(w => w.sequence < targetWo.sequence);
  const incompletePrior = priorWos.some(w => w.status !== "DONE");

  if (incompletePrior) {
    throw {
      status: 400,
      message: `Cannot start Work Order sequence ${targetWo.sequence} until all prior work center operations are completed.`,
    };
  }

  const updatedWo = await prisma.workOrder.update({
    where: { id: targetWo.id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "WORK_ORDER_STARTED",
    entityType: "WorkOrder",
    entityId: targetWo.id,
    description: `Work Order operation "${targetWo.operationName}" started.`,
    manufacturingOrderId: mo.id,
  });

  return updatedWo;
};

export const completeWorkOrder = async (moId, woId, userId, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(moId), tenantId },
    include: { workOrders: true },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };
  if (mo.status !== "IN_PROGRESS") {
    throw { status: 400, message: "Cannot execute operations unless the manufacturing order is in progress." };
  }

  const targetWo = mo.workOrders.find(w => w.id === Number(woId));
  if (!targetWo) throw { status: 404, message: "Work Order not found." };
  if (targetWo.status !== "IN_PROGRESS") {
    throw { status: 400, message: "Work Order must be in progress to be marked as completed." };
  }

  const updatedWo = await prisma.workOrder.update({
    where: { id: targetWo.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "WORK_ORDER_COMPLETED",
    entityType: "WorkOrder",
    entityId: targetWo.id,
    description: `Work Order operation "${targetWo.operationName}" completed.`,
    manufacturingOrderId: mo.id,
  });

  return updatedWo;
};

export const completeManufacturingOrder = async (id, userId, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(id), tenantId },
    include: { workOrders: true },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };
  if (mo.status !== "IN_PROGRESS") {
    throw { status: 400, message: `Cannot complete MO in "${mo.status}" status.` };
  }

  // Verify all work orders are completed
  const incomplete = mo.workOrders.some(w => w.status !== "DONE");
  if (incomplete) {
    throw { status: 400, message: "Cannot complete manufacturing order until all work center operations are completed." };
  }

  const completedMo = await prisma.$transaction(async (tx) => {
    // 1. Produce finished goods stock
    await produceStock(mo.productId, Number(mo.qty), mo.id, tenantId, null, tx);

    // 2. Handle linked MTO Sales Order line replenishment resolution
    if (mo.salesOrderId) {
      // Find matching sales order line for this product
      const line = await tx.salesOrderLine.findFirst({
        where: { salesOrderId: mo.salesOrderId, productId: mo.productId },
      });

      if (line) {
        // Reserve the produced stock for the SO Line
        await reserveStock(mo.productId, Number(mo.qty), mo.salesOrderId, tenantId, tx);

        // Update the line's shortages and replenishment status
        const currentShortage = Number(line.shortageQty);
        const newShortage = Math.max(0, currentShortage - Number(mo.qty));
        const newReserved = Number(line.reservedQty) + Number(mo.qty);

        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: {
            shortageQty: newShortage,
            reservedQty: newReserved,
            replenishmentStatus: "COMPLETED",
          },
        });
      }
    }

    // 3. Complete MO
    const updated = await tx.manufacturingOrder.update({
      where: { id: mo.id },
      data: { status: "DONE", completedAt: new Date() },
      include: {
        product: true,
        bom: true,
        user: true,
        salesOrder: true,
        workOrders: { include: { workCenter: true } },
        components: { include: { product: true } },
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "FINISHED_GOODS_PRODUCED",
      entityType: "ManufacturingOrder",
      entityId: mo.id,
      description: `Finished goods produced: +${mo.qty} units of "${mo.product?.name || 'product'}".`,
      manufacturingOrderId: mo.id,
    }, tx);

    await logAudit({
      tenantId,
      userId,
      action: "MANUFACTURING_COMPLETED",
      entityType: "ManufacturingOrder",
      entityId: mo.id,
      description: `Manufacturing order completed successfully.`,
      manufacturingOrderId: mo.id,
    }, tx);

    return updated;
  });

  return formatMO(completedMo);
};

export const cancelManufacturingOrder = async (id, userId, tenantId) => {
  const mo = await prisma.manufacturingOrder.findFirst({
    where: { id: Number(id), tenantId },
  });

  if (!mo) throw { status: 404, message: "Manufacturing Order not found" };
  if (!["DRAFT", "CONFIRMED"].includes(mo.status)) {
    throw { status: 400, message: `Cannot cancel manufacturing order in "${mo.status}" status.` };
  }

  const cancelledMo = await prisma.$transaction(async (tx) => {
    const updated = await tx.manufacturingOrder.update({
      where: { id: mo.id },
      data: { status: "CANCELLED" },
      include: {
        product: true,
        bom: true,
        user: true,
        salesOrder: true,
        workOrders: { include: { workCenter: true } },
        components: { include: { product: true } },
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "MANUFACTURING_CANCELLED",
      entityType: "ManufacturingOrder",
      entityId: mo.id,
      description: `Manufacturing order ${mo.moRef} cancelled.`,
      manufacturingOrderId: mo.id,
    }, tx);

    return updated;
  });

  return formatMO(cancelledMo);
};
