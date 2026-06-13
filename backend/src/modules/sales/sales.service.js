import prisma from "../../config/prisma.js";
import { generateRef } from "../../utils/refGen.js";
import { logAudit } from "../../utils/auditLogger.js";
import { reserveStock, deliverStock, releaseStock } from "../../utils/stockEngine.js";
import { trigger as triggerProcurement } from "../../utils/procurementEngine.js";

export const listSalesOrders = async (tenantId) => {
  const orders = await prisma.salesOrder.findMany({
    where: { tenantId },
    include: { customer: true, lines: { include: { product: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return orders.map((o) => {
    const totalAmount = o.lines.reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice), 0);
    const totalQty = o.lines.reduce((sum, l) => sum + Number(l.qty), 0);
    const totalDelivered = o.lines.reduce((sum, l) => sum + Number(l.deliveredQty), 0);
    const totalReserved = o.lines.reduce((sum, l) => sum + Number(l.reservedQty), 0);
    const totalShortage = o.lines.reduce((sum, l) => sum + Number(l.shortageQty), 0);

    return { id: o.id, uid: o.uid, orderRef: o.orderRef, customerId: o.customerId, customerName: o.customer.name,
      status: o.status, orderDate: o.orderDate, notes: o.notes,
      totalAmount, totalQty, totalDelivered, totalReserved, totalShortage,
      createdAt: o.createdAt, updatedAt: o.updatedAt };
  });
};

export const getSalesOrderById = async (id, tenantId) => {
  const order = await prisma.salesOrder.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      lines: { include: { product: true } },
      purchaseOrders: { select: { id: true, orderRef: true, status: true, orderDate: true } },
      manufacturingOrders: { select: { id: true, moRef: true, status: true, createdAt: true } },
    },
  });

  if (!order) throw { status: 404, message: "Sales Order not found" };

  const auditLogs = await prisma.auditLog.findMany({
    where: { salesOrderId: id, tenantId, action: { in: ["PURCHASE_ORDER_AUTO_CREATED", "MANUFACTURING_ORDER_AUTO_CREATED"] } },
    orderBy: { createdAt: "asc" },
  });

  const timelineLogs = await prisma.auditLog.findMany({
    where: { salesOrderId: id, tenantId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const totalAmount = order.lines.reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice), 0);

  return {
    id: order.id, uid: order.uid, orderRef: order.orderRef,
    customerId: order.customerId, customerName: order.customer.name,
    customerEmail: order.customer.email, customerPhone: order.customer.phone,
    customerAddress: order.customer.address,
    status: order.status, orderDate: order.orderDate,
    requestedDeliveryDate: order.requestedDeliveryDate, notes: order.notes,
    totalAmount, createdAt: order.createdAt, updatedAt: order.updatedAt,
    lines: order.lines.map((l) => ({
      id: l.id, productId: l.productId, sku: l.product.sku, name: l.product.name,
      procureOnDemand: l.product.procureOnDemand, procurementType: l.product.procurementType,
      qty: Number(l.qty), reservedQty: Number(l.reservedQty), shortageQty: Number(l.shortageQty),
      deliveredQty: Number(l.deliveredQty), remainingQty: Math.max(0, Number(l.qty) - Number(l.deliveredQty)),
      unitPrice: Number(l.unitPrice), totalPrice: Number(l.qty) * Number(l.unitPrice),
      freeToUseQty: Number(l.product.onHandQty) - Number(l.product.reservedQty),
      replenishmentStatus: l.replenishmentStatus,
    })),
    purchaseOrders: order.purchaseOrders,
    manufacturingOrders: order.manufacturingOrders,
    replenishments: auditLogs.map((log) => ({
      id: log.id, action: log.action, type: log.action === "PURCHASE_ORDER_AUTO_CREATED" ? "PO" : "MO",
      entityId: log.entityId, description: log.description, metadata: log.metadata, createdAt: log.createdAt,
    })),
    timeline: timelineLogs.map((log) => ({
      id: log.id, action: log.action, description: log.description, createdAt: log.createdAt,
      user: log.user ? { name: log.user.name, role: log.user.role } : null,
    })),
  };
};

export const createSalesOrder = async (data, userId, tenantId) => {
  const { customerId, notes, lines, requestedDeliveryDate } = data;

  if (!customerId) throw { status: 400, message: "Customer selection is required." };
  if (!lines || lines.length === 0) throw { status: 400, message: "Sales Order must have at least one line item." };

  const productIds = lines.map((l) => Number(l.productId));
  if (new Set(productIds).size !== productIds.length) throw { status: 400, message: "Duplicate products are not allowed in the same sales order." };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.productId) throw { status: 400, message: `Please select a product for line ${i + 1}` };
    const qty = Number(line.qty);
    if (isNaN(qty) || qty <= 0) throw { status: 400, message: `Quantity must be a positive number for product on line ${i + 1}` };
    const price = Number(line.unitPrice);
    if (isNaN(price) || price < 0) throw { status: 400, message: `Unit price must be a non-negative number for product on line ${i + 1}` };
  }

  // Scoped validation
  const customerExists = await prisma.customer.findFirst({ where: { id: Number(customerId), tenantId } });
  if (!customerExists) throw { status: 400, message: "Selected Customer does not exist." };

  const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  if (dbProducts.length !== productIds.length) throw { status: 400, message: "One or more selected products do not exist." };

  let parsedDeliveryDate = null;
  if (requestedDeliveryDate) {
    const d = new Date(requestedDeliveryDate);
    if (isNaN(d.getTime())) throw { status: 400, message: "Invalid requested delivery date format." };
    parsedDeliveryDate = d;
  }

  const createdOrder = await prisma.$transaction(async (tx) => {
    const orderRef = await generateRef("SO", tenantId, tx);

    const order = await tx.salesOrder.create({
      data: {
        orderRef,
        customerId: Number(customerId),
        userId,
        tenantId,
        status: "DRAFT",
        requestedDeliveryDate: parsedDeliveryDate,
        notes: notes?.trim() || null,
        lines: { create: lines.map((l) => ({ productId: Number(l.productId), qty: Number(l.qty), unitPrice: Number(l.unitPrice) })) },
      },
      include: { customer: true, lines: { include: { product: true } } },
    });

    await logAudit({ tenantId, userId, action: "SALES_ORDER_CREATED", entityType: "SalesOrder", entityId: order.id,
      description: `Sales Order ${orderRef} created in Draft state`, salesOrderId: order.id }, tx);

    return order;
  });

  return getSalesOrderById(createdOrder.id, tenantId);
};

export const confirmSalesOrder = async (orderId, userId, tenantId) => {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { lines: { include: { product: true } } },
  });

  if (!order) throw { status: 404, message: "Sales Order not found" };
  if (order.status !== "DRAFT") throw { status: 400, message: `Cannot confirm Sales Order in "${order.status}" status. Only DRAFT orders can be confirmed.` };

  const triggeredProcurements = [];

  const confirmedOrder = await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      const { toReserve, shortage } = await reserveStock(line.productId, Number(line.qty), orderId, tenantId, tx);

      let lineReplenishmentStatus = "NOT_STARTED";
      if (shortage > 0 && line.product.procureOnDemand) {
        const triggered = await triggerProcurement(line.product, shortage, orderId, userId, tenantId, tx);
        triggeredProcurements.push(triggered);
        lineReplenishmentStatus = "TRIGGERED";
      }

      await tx.salesOrderLine.update({ where: { id: line.id }, data: { reservedQty: toReserve, shortageQty: shortage, replenishmentStatus: lineReplenishmentStatus } });

      if (toReserve > 0) {
        await logAudit({ tenantId, userId, action: "STOCK_RESERVED", entityType: "Product", entityId: line.productId,
          description: `Reserved ${toReserve} units of product SKU ${line.product.sku} for Sales Order ${order.orderRef}`,
          salesOrderId: orderId }, tx);
      }
    }

    const updated = await tx.salesOrder.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });

    await logAudit({ tenantId, userId, action: "SALES_ORDER_CONFIRMED", entityType: "SalesOrder", entityId: orderId,
      description: "Sales Order confirmed. Stock reserved. MTO Replenishments triggered for shortages.",
      salesOrderId: orderId, metadata: { triggered: triggeredProcurements } }, tx);

    return updated;
  });

  const finalOrder = await getSalesOrderById(confirmedOrder.id, tenantId);
  return { order: finalOrder, triggeredProcurements };
};

export const deliverSalesOrder = async (orderId, lineDeliveries, userId, tenantId) => {
  if (!lineDeliveries || lineDeliveries.length === 0) throw { status: 400, message: "No line items specified for delivery." };

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { lines: { include: { product: true } } },
  });

  if (!order) throw { status: 404, message: "Sales Order not found" };
  if (order.status !== "CONFIRMED" && order.status !== "PARTIALLY_DELIVERED") {
    throw { status: 400, message: `Cannot record delivery for order in "${order.status}" status.` };
  }

  await prisma.$transaction(async (tx) => {
    for (const delivery of lineDeliveries) {
      const lineId = Number(delivery.lineId);
      const qtyToDeliver = Number(delivery.qty);

      if (isNaN(qtyToDeliver) || qtyToDeliver <= 0) throw { status: 400, message: "Delivery quantity must be a positive number." };

      const line = order.lines.find((l) => l.id === lineId);
      if (!line) throw { status: 400, message: `Invalid line item ID ${lineId}` };

      const remainingOrdered = Number(line.qty) - Number(line.deliveredQty);
      if (qtyToDeliver > remainingOrdered) throw { status: 400, message: `Cannot deliver ${qtyToDeliver} units for SKU ${line.product.sku}. Remaining ordered quantity is only ${remainingOrdered} units.` };

      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (qtyToDeliver > Number(product.onHandQty)) throw { status: 400, message: `Insufficient stock on hand for SKU ${line.product.sku}. Physical count: ${Number(product.onHandQty)}, Attempted to deliver: ${qtyToDeliver}.` };

      await deliverStock(line.productId, qtyToDeliver, orderId, tenantId, tx);
      await tx.salesOrderLine.update({ where: { id: lineId }, data: { deliveredQty: { increment: qtyToDeliver } } });
    }

    const refreshedLines = await tx.salesOrderLine.findMany({ where: { salesOrderId: orderId } });
    const allDelivered = refreshedLines.every((l) => Number(l.deliveredQty) >= Number(l.qty));
    const anyDelivered = refreshedLines.some((l) => Number(l.deliveredQty) > 0);
    const newStatus = allDelivered ? "FULLY_DELIVERED" : anyDelivered ? "PARTIALLY_DELIVERED" : "CONFIRMED";

    await tx.salesOrder.update({ where: { id: orderId }, data: { status: newStatus } });

    await logAudit({ tenantId, userId,
      action: newStatus === "FULLY_DELIVERED" ? "SALES_ORDER_DELIVERED" : "SALES_ORDER_PARTIALLY_DELIVERED",
      entityType: "SalesOrder", entityId: orderId,
      description: newStatus === "FULLY_DELIVERED" ? "Sales Order fully delivered." : "Partial delivery recorded.",
      salesOrderId: orderId, metadata: { linesDelivered: lineDeliveries } }, tx);
  });

  return getSalesOrderById(orderId, tenantId);
};

export const cancelSalesOrder = async (orderId, userId, tenantId) => {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { lines: { include: { product: true } } },
  });

  if (!order) throw { status: 404, message: "Sales Order not found" };
  if (!["DRAFT", "CONFIRMED", "PARTIALLY_DELIVERED"].includes(order.status)) {
    throw { status: 400, message: `Cannot cancel Sales Order in "${order.status}" status.` };
  }

  await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      const remainingReserved = Number(line.reservedQty) - Number(line.deliveredQty);
      if (remainingReserved > 0) {
        await releaseStock(line.productId, remainingReserved, orderId, tenantId, tx);
        await tx.salesOrderLine.update({ where: { id: line.id }, data: { reservedQty: Number(line.deliveredQty) } });
        await logAudit({ tenantId, userId, action: "STOCK_RELEASED", entityType: "Product", entityId: line.productId,
          description: `Released ${remainingReserved} reserved units of product SKU ${line.product.sku} due to Sales Order cancellation`,
          salesOrderId: orderId }, tx);
      }
    }

    await tx.salesOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });

    await logAudit({ tenantId, userId, action: "SALES_ORDER_CANCELLED", entityType: "SalesOrder", entityId: orderId,
      description: "Sales Order cancelled. Stock reservations released.", salesOrderId: orderId }, tx);
  });

  return getSalesOrderById(orderId, tenantId);
};
