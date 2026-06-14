import prisma from "../config/prisma.js";

const mainWarehouseCache = new Map();
const referenceCache = new Map();

/**
 * Resolves and caches document reference numbers.
 */
const getCachedRef = async (type, id, tenantId, tx) => {
  const cacheKey = `${type}_${tenantId}_${id}`;
  if (referenceCache.has(cacheKey)) {
    return referenceCache.get(cacheKey);
  }

  let ref = `${type} #${id}`;
  if (type === "SO") {
    const order = await tx.salesOrder.findFirst({
      where: { id, tenantId },
      select: { orderRef: true },
    });
    if (order) ref = order.orderRef;
  } else if (type === "PO") {
    const order = await tx.purchaseOrder.findFirst({
      where: { id, tenantId },
      select: { orderRef: true },
    });
    if (order) ref = order.orderRef;
  } else if (type === "MO") {
    const mo = await tx.manufacturingOrder.findFirst({
      where: { id, tenantId },
      select: { moRef: true },
    });
    if (mo) ref = mo.moRef;
  } else if (type === "TRANSFER") {
    const transfer = await tx.stockTransfer.findFirst({
      where: { id, tenantId },
      select: { transferRef: true },
    });
    if (transfer) ref = transfer.transferRef;
  }

  referenceCache.set(cacheKey, ref);
  return ref;
};

/**
 * Helper to update warehouse-specific inventory balance.
 * Finds or creates the InventoryBalance record and updates the onHandQty.
 */
const updateInventoryBalance = async (productId, warehouseId, tenantId, qtyChange, tx) => {
  let resolvedWhId = warehouseId;
  if (!resolvedWhId) {
    if (mainWarehouseCache.has(tenantId)) {
      resolvedWhId = mainWarehouseCache.get(tenantId);
    } else {
      // resolve to default MAIN warehouse
      let wh = await tx.warehouse.findFirst({
        where: { tenantId, code: "MAIN" },
      });
      if (!wh) {
        wh = await tx.warehouse.findFirst({
          where: { tenantId, isActive: true },
        });
      }
      if (!wh) {
        wh = await tx.warehouse.create({
          data: {
            tenantId,
            code: "MAIN",
            name: "Main Warehouse",
            isActive: true,
          },
        });
      }
      resolvedWhId = wh.id;
      mainWarehouseCache.set(tenantId, resolvedWhId);
    }
  }

  const balance = await tx.inventoryBalance.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: resolvedWhId,
        productId,
      },
    },
  });

  if (!balance) {
    await tx.inventoryBalance.create({
      data: {
        tenantId,
        warehouseId: resolvedWhId,
        productId,
        onHandQty: qtyChange,
        reservedQty: 0,
      },
    });
  } else {
    await tx.inventoryBalance.update({
      where: {
        id: balance.id,
      },
      data: {
        onHandQty: { increment: qtyChange },
      },
    });
  }

  return resolvedWhId;
};

/**
 * Reserve stock for a product line on SO confirmation.
 * (Reservations are kept global for now, updating global Product.reservedQty).
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

    const orderRef = await getCachedRef("SO", referenceId, tenantId, tx);

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
 * Updates the warehouse-specific InventoryBalance.
 * @param {number} productId
 * @param {number} qty
 * @param {number} referenceId - SalesOrder ID
 * @param {number} tenantId
 * @param {number|null} warehouseId
 * @param {object} tx - Prisma transaction client
 */
export const deliverStock = async (productId, qty, referenceId, tenantId, warehouseId = null, tx = prisma) => {
  const resolvedWhId = await updateInventoryBalance(productId, warehouseId, tenantId, -qty, tx);

  await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { decrement: qty },
      reservedQty: { decrement: qty },
    },
  });

  const orderRef = await getCachedRef("SO", referenceId, tenantId, tx);

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
      warehouseId: resolvedWhId,
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
      warehouseId: resolvedWhId,
    },
  });
};

/**
 * Release reserved stock back to the free pool on SO cancellation.
 * (Reservations are kept global for now).
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

  const orderRef = await getCachedRef("SO", referenceId, tenantId, tx);

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
 * Updates warehouse-specific InventoryBalance.
 * @param {number} productId
 * @param {number} qty - positive to add, negative to subtract
 * @param {number} tenantId
 * @param {number|null} warehouseId
 * @param {string} reason
 * @param {number|null} referenceId
 * @param {object} tx - Prisma transaction client
 */
export const adjustStock = async (
  productId,
  qty,
  tenantId,
  warehouseId = null,
  reason = "Inventory Count Correction",
  referenceId = null,
  tx = prisma
) => {
  const resolvedWhId = await updateInventoryBalance(productId, warehouseId, tenantId, qty, tx);

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
      referenceId: referenceId || productId,
      reason,
      warehouseId: resolvedWhId,
    },
  });

  return adjustedProduct;
};

/**
 * Receive stock from a Purchase Order receipt.
 * Increments warehouse stock and global onHandQty, updates lastPurchaseCost, and logs PURCHASE_RECEIPT.
 * @param {number} productId
 * @param {number} qty - quantity received (positive)
 * @param {number} unitCost - cost per unit from the PO line
 * @param {number} referenceId - PurchaseOrder ID
 * @param {number} tenantId
 * @param {number|null} warehouseId
 * @param {object} tx - Prisma transaction client
 */
export const receiveStock = async (productId, qty, unitCost, referenceId, tenantId, warehouseId = null, tx = prisma) => {
  const resolvedWhId = await updateInventoryBalance(productId, warehouseId, tenantId, qty, tx);

  const updatedProduct = await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { increment: qty },
      lastPurchaseCost: unitCost,
    },
  });

  const orderRef = await getCachedRef("PO", referenceId, tenantId, tx);

  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "PURCHASE_RECEIPT",
      qty,
      referenceType: "PURCHASE",
      referenceId,
      reason: `${orderRef} Goods Receipt`,
      warehouseId: resolvedWhId,
    },
  });

  return updatedProduct;
};

/**
 * Consume stock for manufacturing components (decrements warehouse stock and global onHandQty, logs MANUFACTURING_CONSUME).
 * @param {number} productId
 * @param {number} qty - quantity to consume (positive number)
 * @param {number} referenceId - ManufacturingOrder ID
 * @param {number} tenantId
 * @param {number|null} warehouseId
 * @param {object} tx - Prisma transaction client
 */
export const consumeStock = async (productId, qty, referenceId, tenantId, warehouseId = null, tx = prisma) => {
  const resolvedWhId = await updateInventoryBalance(productId, warehouseId, tenantId, -qty, tx);

  const updatedProduct = await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { decrement: qty },
    },
  });

  const moRef = await getCachedRef("MO", referenceId, tenantId, tx);

  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "MANUFACTURING_CONSUME",
      qty: -qty, // recorded as negative for physical stock reduction
      referenceType: "MANUFACTURING",
      referenceId,
      reason: `${moRef} Component Consumption`,
      warehouseId: resolvedWhId,
    },
  });

  return updatedProduct;
};

/**
 * Produce stock for finished goods from manufacturing (increments warehouse stock and global onHandQty, logs MANUFACTURING_PRODUCE).
 * @param {number} productId
 * @param {number} qty - quantity produced (positive number)
 * @param {number} referenceId - ManufacturingOrder ID
 * @param {number} tenantId
 * @param {number|null} warehouseId
 * @param {object} tx - Prisma transaction client
 */
export const produceStock = async (productId, qty, referenceId, tenantId, warehouseId = null, tx = prisma) => {
  const resolvedWhId = await updateInventoryBalance(productId, warehouseId, tenantId, qty, tx);

  const updatedProduct = await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { increment: qty },
    },
  });

  const moRef = await getCachedRef("MO", referenceId, tenantId, tx);

  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "MANUFACTURING_PRODUCE",
      qty, // positive
      referenceType: "MANUFACTURING",
      referenceId,
      reason: `${moRef} Finished Goods Production`,
      warehouseId: resolvedWhId,
    },
  });

  return updatedProduct;
};

/**
 * Transfer stock between two warehouses.
 * sourceWarehouse.onHandQty -= qty
 * destinationWarehouse.onHandQty += qty
 * (Global Product.onHandQty remains unchanged).
 */
export const transferStock = async (
  productId,
  qty,
  sourceWarehouseId,
  destinationWarehouseId,
  referenceId,
  tenantId,
  tx = prisma
) => {
  // Decrement source warehouse balance
  await updateInventoryBalance(productId, sourceWarehouseId, tenantId, -qty, tx);
  // Increment destination warehouse balance
  await updateInventoryBalance(productId, destinationWarehouseId, tenantId, qty, tx);

  const transferRef = await getCachedRef("TRANSFER", referenceId, tenantId, tx);

  // Log transfer out movement in source warehouse
  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "WAREHOUSE_TRANSFER_OUT",
      qty: -qty,
      referenceType: "TRANSFER",
      referenceId,
      reason: `${transferRef} Outbound`,
      warehouseId: sourceWarehouseId,
    },
  });

  // Log transfer in movement in destination warehouse
  await tx.stockMovement.create({
    data: {
      productId,
      tenantId,
      movementType: "WAREHOUSE_TRANSFER_IN",
      qty,
      referenceType: "TRANSFER",
      referenceId,
      reason: `${transferRef} Inbound`,
      warehouseId: destinationWarehouseId,
    },
  });
};



