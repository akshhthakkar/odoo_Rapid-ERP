import prisma from "../config/prisma.js";

/**
 * Reserve stock for a product line on SO confirmation.
 * @param {number} productId
 * @param {number} qty - quantity requested
 * @param {number} referenceId - SalesOrder ID
 * @param {number} tenantId - Tenant owning this movement
 * @param {object} tx - Prisma transaction client
 */
export const reserveStock = async (productId, qty, referenceId, tenantId, tx = prisma) => {
  const product = await tx.product.findFirst({
    where: { id: productId, tenantId },
  });

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const onHand = Number(product.onHandQty);
  const reserved = Number(product.reservedQty);
  const free = onHand - reserved;

  const toReserve = Math.max(0, Math.min(qty, free));
  const shortage = qty - toReserve;

  if (toReserve > 0) {
    await tx.product.update({
      where: { id: productId },
      data: { reservedQty: { increment: toReserve } },
    });

    let orderRef = `SO #${referenceId}`;
    const order = await tx.salesOrder.findFirst({
      where: { id: referenceId, tenantId },
      select: { orderRef: true },
    });
    if (order) orderRef = order.orderRef;

    await tx.stockMovement.create({
      data: {
        productId,
        tenantId,
        movementType: "SALE_RESERVE",
        qty: -toReserve,
        referenceType: "SALE",
        referenceId,
        reason: `${orderRef} Reservation`,
      },
    });
  }

  return { toReserve, shortage };
};

/**
 * Record delivery, decreasing onHand and reserved counts.
 * @param {number} productId
 * @param {number} qty
 * @param {number} referenceId - SalesOrder ID
 * @param {number} tenantId
 * @param {object} tx - Prisma transaction client
 */
export const deliverStock = async (productId, qty, referenceId, tenantId, tx = prisma) => {
  await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { decrement: qty },
      reservedQty: { decrement: qty },
    },
  });

  let orderRef = `SO #${referenceId}`;
  const order = await tx.salesOrder.findFirst({
    where: { id: referenceId, tenantId },
    select: { orderRef: true },
  });
  if (order) orderRef = order.orderRef;

  // Physical stock reduction
  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "SALE_DELIVERY",
      qty: -qty,
      referenceType: "SALE",
      referenceId,
      reason: `${orderRef} Delivery`,
    },
  });

  // Virtual reservation release — delivery automatically releases reservation
  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "SALE_RELEASE",
      qty: qty,
      referenceType: "SALE",
      referenceId,
      reason: `${orderRef} Release (Delivered)`,
    },
  });
};

/**
 * Release reserved stock back to the free pool on SO cancellation.
 * @param {number} productId
 * @param {number} qty
 * @param {number} referenceId - SalesOrder ID
 * @param {number} tenantId
 * @param {object} tx - Prisma transaction client
 */
export const releaseStock = async (productId, qty, referenceId, tenantId, tx = prisma) => {
  await tx.product.update({
    where: { id: productId },
    data: { reservedQty: { decrement: qty } },
  });

  let orderRef = `SO #${referenceId}`;
  const order = await tx.salesOrder.findFirst({
    where: { id: referenceId, tenantId },
    select: { orderRef: true },
  });
  if (order) orderRef = order.orderRef;

  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "SALE_RELEASE",
      qty: qty,
      referenceType: "SALE",
      referenceId,
      reason: `${orderRef} Release`,
    },
  });
};

/**
 * Manually adjust stock for a product (STOCK_ADJUSTMENT movement).
 * @param {number} productId
 * @param {number} qty - positive to add, negative to subtract
 * @param {number} tenantId
 * @param {string} reason
 * @param {object} tx - Prisma transaction client
 */
export const adjustStock = async (productId, qty, tenantId, reason = "Inventory Count Correction", tx = prisma) => {
  const adjustedProduct = await tx.product.update({
    where: { id: productId },
    data: { onHandQty: { increment: qty } },
  });

  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "STOCK_ADJUSTMENT",
      qty,
      referenceType: "ADJUSTMENT",
      referenceId: productId,
      reason,
    },
  });

  return adjustedProduct;
};
