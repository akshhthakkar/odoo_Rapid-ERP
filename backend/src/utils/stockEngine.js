import prisma from '../config/prisma.js';

/**
 * Reserve stock for a product line on SO confirmation
 * @param {number} productId
 * @param {number} qty - quantity requested
 * @param {number} referenceId - SalesOrder ID
 * @param {object} tx - Prisma transaction client
 */
export const reserveStock = async (productId, qty, referenceId, tx = prisma) => {
  const product = await tx.product.findUnique({
    where: { id: productId }
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
      data: {
        reservedQty: { increment: toReserve }
      }
    });

    let orderRef = `SO #${referenceId}`;
    const order = await tx.salesOrder.findUnique({
      where: { id: referenceId },
      select: { orderRef: true }
    });
    if (order) {
      orderRef = order.orderRef;
    }

    await tx.stockMovement.create({
      data: {
        productId,
        movementType: 'SALE_RESERVE',
        qty: -toReserve, // Reserving stock is a negative entry in availability
        referenceType: 'SALE',
        referenceId,
        reason: `${orderRef} Reservation`
      }
    });
  }

  return { toReserve, shortage };
};

/**
 * Record delivery, decreasing onHand and reserved counts, and posting SALE_DELIVERY
 * @param {number} productId
 * @param {number} qty
 * @param {number} referenceId - SalesOrder ID
 * @param {object} tx - Prisma transaction client
 */
export const deliverStock = async (productId, qty, referenceId, tx = prisma) => {
  await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { decrement: qty },
      reservedQty: { decrement: qty }
    }
  });

  let orderRef = `SO #${referenceId}`;
  const order = await tx.salesOrder.findUnique({
    where: { id: referenceId },
    select: { orderRef: true }
  });
  if (order) {
    orderRef = order.orderRef;
  }

  // 1. Log SALE_DELIVERY movement (physical stock reduction)
  await tx.stockMovement.create({
    data: {
      productId,
      movementType: 'SALE_DELIVERY',
      qty: -qty, // Outgoing is recorded as negative quantity
      referenceType: 'SALE',
      referenceId,
      reason: `${orderRef} Delivery`
    }
  });

  // 2. Log SALE_RELEASE movement (virtual reservation release)
  // Delivery automatically releases reservation.
  await tx.stockMovement.create({
    data: {
      productId,
      movementType: 'SALE_RELEASE',
      qty: qty, // Releasing reservation is a positive entry in availability
      referenceType: 'SALE',
      referenceId,
      reason: `${orderRef} Release (Delivered)`
    }
  });
};

/**
 * Release reserved stock back to the free pool on SO cancellation
 * @param {number} productId
 * @param {number} qty
 * @param {number} referenceId - SalesOrder ID
 * @param {object} tx - Prisma transaction client
 */
export const releaseStock = async (productId, qty, referenceId, tx = prisma) => {
  await tx.product.update({
    where: { id: productId },
    data: {
      reservedQty: { decrement: qty }
    }
  });

  let orderRef = `SO #${referenceId}`;
  const order = await tx.salesOrder.findUnique({
    where: { id: referenceId },
    select: { orderRef: true }
  });
  if (order) {
    orderRef = order.orderRef;
  }

  await tx.stockMovement.create({
    data: {
      productId,
      movementType: 'SALE_RELEASE',
      qty: qty, // Releasing reservation is a positive entry in availability
      referenceType: 'SALE',
      referenceId,
      reason: `${orderRef} Release`
    }
  });
};

/**
 * Manually adjust stock for a product, recording a STOCK_ADJUSTMENT movement
 * @param {number} productId
 * @param {number} qty - adjustment quantity (positive to add stock, negative to subtract)
 * @param {string} reason - description of adjustment reason
 * @param {object} tx - Prisma transaction client
 */
export const adjustStock = async (productId, qty, reason = 'Inventory Count Correction', tx = prisma) => {
  const adjustedProduct = await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { increment: qty }
    }
  });

  await tx.stockMovement.create({
    data: {
      productId,
      movementType: 'STOCK_ADJUSTMENT',
      qty,
      referenceType: 'ADJUSTMENT',
      referenceId: productId,
      reason
    }
  });

  return adjustedProduct;
};
