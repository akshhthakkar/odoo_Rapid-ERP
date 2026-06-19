import prisma from "../../config/prisma.js";
import { generateRef } from "../../utils/refGen.js";
import { logAudit } from "../../utils/auditLogger.js";
import { transferStock, adjustStock } from "../../utils/stockEngine.js";
import { validateWarehouse, validateStockTransfer, validateInventoryAdjustment } from "./inventory.validation.js";
import { runSerialized } from "../../utils/mutex.js";

/**
 * Fetch Inventory Dashboard statistics.
 */
export const getInventoryDashboard = async (tenantId) => {
  // 1. Calculate Inventory Value
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
  });

  const totalValue = products.reduce((sum, p) => {
    const cost = Number(p.lastPurchaseCost || p.costPrice || 0);
    return sum + (Number(p.onHandQty) * cost);
  }, 0);

  // 2. Counts and alert products
  const lowStockProducts = [];
  const outOfStockProducts = [];
  let totalReserved = 0;

  products.forEach(p => {
    const onHand = Number(p.onHandQty);
    const reserved = Number(p.reservedQty);
    const freeToUse = onHand - reserved;
    const reorderLevel = Number(p.reorderLevel);

    totalReserved += reserved;

    if (onHand <= 0) {
      outOfStockProducts.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        onHand,
      });
    } else if (freeToUse < reorderLevel) {
      lowStockProducts.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        onHand,
        reserved,
        freeToUse,
        reorderLevel,
      });
    }
  });

  // 3. Open Manufacturing Demand
  const componentLines = await prisma.manufacturingComponent.findMany({
    where: {
      tenantId,
      manufacturingOrder: {
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
    },
  });
  const openMoDemand = componentLines.reduce((sum, c) => {
    return sum + Math.max(0, Number(c.qtyRequired) - Number(c.qtyConsumed));
  }, 0);

  // 4. Open Purchase Demand
  const poLines = await prisma.purchaseOrderLine.findMany({
    where: {
      purchaseOrder: {
        tenantId,
        status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] },
      },
    },
  });
  const openPoDemand = poLines.reduce((sum, l) => {
    return sum + Math.max(0, Number(l.qty) - Number(l.receivedQty));
  }, 0);

  // Get open PO count
  const openPoCount = await prisma.purchaseOrder.count({
    where: {
      tenantId,
      status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] },
    },
  });

  // Get open MO count
  const openMoCount = await prisma.manufacturingOrder.count({
    where: {
      tenantId,
      status: { in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] },
    },
  });

  // 5. Top 5 Most Valuable Products
  const topValued = products
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      onHand: Number(p.onHandQty),
      cost: Number(p.lastPurchaseCost || p.costPrice || 0),
      value: Number(p.onHandQty) * Number(p.lastPurchaseCost || p.costPrice || 0),
    }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    metrics: {
      totalValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      reservedStock: totalReserved,
      openMoCount,
      openMoDemand,
      openPoCount,
      openPoDemand,
    },
    lowStockProducts,
    outOfStockProducts,
    topValued,
  };
};

/**
 * Fetch Stock Ledger movements with running balance calculation.
 */
export const getStockLedger = async (query = {}, tenantId) => {
  // 1. Fetch all movements sorted chronologically to compute running balances in-memory
  const allMovements = await prisma.stockMovement.findMany({
    where: { tenantId },
    include: {
      product: { select: { name: true, sku: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  // 2. Scan and compute balance
  const globalBalances = {};
  const warehouseBalances = {};

  allMovements.forEach(m => {
    const pId = m.productId;
    const wId = m.warehouseId || "global";
    const wpKey = `${wId}_${pId}`;

    warehouseBalances[wpKey] = (warehouseBalances[wpKey] || 0) + Number(m.qty);
    m.warehouseRunningBalance = warehouseBalances[wpKey];

    globalBalances[pId] = (globalBalances[pId] || 0) + Number(m.qty);
    m.globalRunningBalance = globalBalances[pId];
  });

  // 3. Filter ledger list
  let filtered = allMovements;

  if (query.productId) {
    filtered = filtered.filter(m => m.productId === Number(query.productId));
  }
  if (query.warehouseId) {
    filtered = filtered.filter(m => m.warehouseId === Number(query.warehouseId));
  }
  if (query.movementType) {
    filtered = filtered.filter(m => m.movementType === query.movementType);
  }
  if (query.startDate) {
    const start = new Date(query.startDate);
    filtered = filtered.filter(m => new Date(m.createdAt) >= start);
  }
  if (query.endDate) {
    const end = new Date(query.endDate);
    filtered = filtered.filter(m => new Date(m.createdAt) <= end);
  }

  // 4. Map output
  const result = filtered.map(m => ({
    id: m.id,
    createdAt: m.createdAt,
    movementType: m.movementType,
    qty: Number(m.qty),
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    reason: m.reason,
    productId: m.productId,
    productName: m.product?.name,
    productSku: m.product?.sku,
    warehouseId: m.warehouseId,
    warehouseName: m.warehouse?.name || "Global / Unassigned",
    runningBalance: query.warehouseId ? m.warehouseRunningBalance : m.globalRunningBalance,
  }));

  // Return sorted desc (latest first)
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
};

/**
 * Fetch Inventory Valuation.
 */
export const getInventoryValuation = async (tenantId) => {
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  });

  const valuationList = products.map(p => {
    const cost = Number(p.lastPurchaseCost || p.costPrice || 0);
    const qty = Number(p.onHandQty);
    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      qty,
      cost,
      value: qty * cost,
    };
  });

  const totalValue = valuationList.reduce((sum, item) => sum + item.value, 0);

  // Get top 5 valued products
  const topValued = [...valuationList]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    totalValue,
    products: valuationList,
    topValued,
  };
};

/**
 * Manage Warehouse CRUD.
 */
export const getWarehouses = async (tenantId) => {
  return prisma.warehouse.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: "asc" },
  });
};

export const createWarehouse = async (data, tenantId) => {
  validateWarehouse(data);

  const code = data.code.trim().toUpperCase();

  const existing = await prisma.warehouse.findFirst({
    where: { tenantId, code },
  });
  if (existing) {
    throw { status: 409, message: `A warehouse with code "${code}" already exists.` };
  }

  const wh = await prisma.warehouse.create({
    data: {
      tenantId,
      code,
      name: data.name.trim(),
      isActive: true,
    },
  });

  await logAudit({
    tenantId,
    action: "WAREHOUSE_CREATED",
    entityType: "Warehouse",
    entityId: wh.id,
    description: `Warehouse "${wh.name}" (${wh.code}) registered.`,
  });

  return wh;
};

/**
 * Deactivate a warehouse — blocked if it holds any stock.
 */
export const deactivateWarehouse = async (id, tenantId) => {
  const wh = await prisma.warehouse.findFirst({
    where: { id: Number(id), tenantId },
  });
  if (!wh) throw { status: 404, message: "Warehouse not found." };
  if (!wh.isActive) throw { status: 400, message: "Warehouse is already inactive." };

  // Guard: block deactivation if any product holds stock here
  const stockHeld = await prisma.inventoryBalance.aggregate({
    where: { warehouseId: wh.id, tenantId },
    _sum: { onHandQty: true },
  });
  const totalQty = Number(stockHeld._sum.onHandQty || 0);
  if (totalQty > 0) {
    throw {
      status: 400,
      message: `Cannot deactivate warehouse "${wh.name}": it currently holds ${totalQty} units of stock. Transfer or adjust stock to zero before deactivating.`,
    };
  }

  const updated = await prisma.warehouse.update({
    where: { id: wh.id },
    data: { isActive: false },
  });

  await logAudit({
    tenantId,
    action: "WAREHOUSE_DEACTIVATED",
    entityType: "Warehouse",
    entityId: wh.id,
    description: `Warehouse "${wh.name}" (${wh.code}) deactivated. Stock was confirmed at zero.`,
  });

  return updated;
};

/**
 * List Stock Transfers.
 */
export const getStockTransfers = async (tenantId) => {
  return prisma.stockTransfer.findMany({
    where: { tenantId },
    include: {
      sourceWarehouse: { select: { code: true, name: true } },
      destinationWarehouse: { select: { code: true, name: true } },
      createdBy: { select: { name: true } },
      lines: {
        include: {
          product: { select: { sku: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Create a new Stock Transfer between warehouses.
 */
export const createStockTransfer = async (data, userId, tenantId) => {
  validateStockTransfer(data);

  const sourceId = Number(data.sourceWarehouseId);
  const destId = Number(data.destinationWarehouseId);

  if (sourceId === destId) {
    throw { status: 400, message: "Source and destination warehouse cannot be the same." };
  }

  // 1. Verify warehouses exist and belong to tenant
  const warehouses = await prisma.warehouse.findMany({
    where: {
      id: { in: [sourceId, destId] },
      tenantId,
      isActive: true,
    },
  });

  if (warehouses.length !== 2) {
    throw { status: 400, message: "One or both selected warehouses are invalid." };
  }

  // 2. Validate source warehouse has sufficient stock for all lines
  for (const line of data.lines) {
    const pId = Number(line.productId);
    const qty = Number(line.qty);

    const balance = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: sourceId,
          productId: pId,
        },
      },
    });

    const sourceOnHand = balance ? Number(balance.onHandQty) : 0;
    if (sourceOnHand < qty) {
      const product = await prisma.product.findUnique({ where: { id: pId } });
      throw {
        status: 400,
        message: `Insufficient stock in source warehouse for product ${product?.name || pId}. Available: ${sourceOnHand}, Transfer requested: ${qty}.`,
      };
    }
  }

  // 3. Perform transfer transactionally
  const transfer = await runSerialized(`TRA_${tenantId}`, () => prisma.$transaction(async (tx) => {
    const transferRef = await generateRef("TRA", tenantId, tx);

    const createdTransfer = await tx.stockTransfer.create({
      data: {
        tenantId,
        transferRef,
        sourceWarehouseId: sourceId,
        destinationWarehouseId: destId,
        status: "COMPLETED", // Immediately set as completed for now
        notes: data.notes?.trim() || null,
        createdById: userId,
        lines: {
          create: data.lines.map(l => ({
            productId: Number(l.productId),
            qty: Number(l.qty),
          })),
        },
      },
    });

    // Run stock ledger transfers
    for (const line of data.lines) {
      await transferStock(
        Number(line.productId),
        Number(line.qty),
        sourceId,
        destId,
        createdTransfer.id,
        tenantId,
        tx
      );
    }

    await logAudit({
      tenantId,
      userId,
      action: "STOCK_TRANSFER_COMPLETED",
      entityType: "StockTransfer",
      entityId: createdTransfer.id,
      description: `Stock Transfer ${transferRef}: moved stock from warehouse ID ${sourceId} → ${destId} (${data.lines.length} line(s)).`,
    }, tx);

    return createdTransfer;
  }));

  return transfer;
};

/**
 * List Inventory Adjustments.
 */
export const getInventoryAdjustments = async (tenantId) => {
  return prisma.inventoryAdjustment.findMany({
    where: { tenantId },
    include: {
      createdBy: { select: { name: true } },
      lines: {
        include: {
          product: { select: { sku: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Create a manual Stock Adjustment.
 */
export const createInventoryAdjustment = async (data, userId, tenantId) => {
  validateInventoryAdjustment(data);

  const warehouseId = Number(data.warehouseId);

  // 1. Verify warehouse belongs to tenant
  const wh = await prisma.warehouse.findFirst({
    where: { id: warehouseId, tenantId, isActive: true },
  });
  if (!wh) {
    throw { status: 400, message: "Invalid warehouse selected." };
  }

  // 2. Verify negative adjustments do not exceed available stock in warehouse
  for (const line of data.lines) {
    const pId = Number(line.productId);
    const qtyChange = Number(line.qty);

    if (qtyChange < 0) {
      const balance = await prisma.inventoryBalance.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId: pId,
          },
        },
      });

      const currentWhQty = balance ? Number(balance.onHandQty) : 0;
      if (currentWhQty + qtyChange < 0) {
        const product = await prisma.product.findUnique({ where: { id: pId } });
        throw {
          status: 400,
          message: `Adjustment rejected: adjustment of ${qtyChange} on ${product?.name || pId} exceeds current warehouse stock level of ${currentWhQty}.`,
        };
      }
    }
  }

  // 3. Commit adjustment with transaction retries for unique constraint safety
  let attempts = 0;
  const maxAttempts = 10;
  let adjustment;

  while (attempts < maxAttempts) {
    try {
      adjustment = await prisma.$transaction(async (tx) => {
        const adjustmentRef = await generateRef("ADJ", tenantId, tx);

        const createdAdjustment = await tx.inventoryAdjustment.create({
          data: {
            tenantId,
            adjustmentRef,
            reason: data.reason.trim(),
            createdById: userId,
            lines: {
              create: data.lines.map(l => ({
                productId: Number(l.productId),
                qtyChange: Number(l.qty),
                reason: data.reason.trim(),
              })),
            },
          },
        });

        // Run stock ledger adjustments
        for (const line of data.lines) {
          await adjustStock(
            Number(line.productId),
            Number(line.qty),
            tenantId,
            warehouseId,
            data.reason.trim(),
            createdAdjustment.id,
            tx
          );
        }

        await logAudit({
          tenantId,
          userId,
          action: "INVENTORY_ADJUSTMENT_CREATED",
          entityType: "InventoryAdjustment",
          entityId: createdAdjustment.id,
          description: `Manual adjustment ${adjustmentRef} — reason: "${data.reason.trim()}" in warehouse "${wh.name}" (${data.lines.length} line(s)).`,
        }, tx);

        return createdAdjustment;
      });

      break; // Success! Break out of the retry loop.
    } catch (error) {
      // Prisma error code for unique constraint violation is P2002
      const isUniqueConstraint = error.code === "P2002" && 
        (error.meta?.target?.includes("adjustmentRef") || error.message?.includes("adjustmentRef") || error.message?.includes("Unique constraint failed"));

      if (isUniqueConstraint && attempts < maxAttempts - 1) {
        attempts++;
        console.warn(`Unique constraint failed on adjustmentRef. Retrying adjustment creation (attempt ${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
        continue;
      }
      throw error;
    }
  }

  return adjustment;
};

/**
 * Fetch product detailed inventory trace.
 */
export const getProductInventoryDetails = async (productId, tenantId) => {
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), tenantId },
  });
  if (!product) {
    throw { status: 404, message: "Product not found" };
  }

  const onHand = Number(product.onHandQty);
  const reserved = Number(product.reservedQty);
  const freeToUse = onHand - reserved;

  // 1. Get warehouse balance breakdown
  const balances = await prisma.inventoryBalance.findMany({
    where: { productId: product.id, tenantId },
    include: { warehouse: { select: { code: true, name: true } } },
  });

  const breakdown = balances.map(b => ({
    warehouseId: b.warehouseId,
    warehouseCode: b.warehouse.code,
    warehouseName: b.warehouse.name,
    onHandQty: Number(b.onHandQty),
  }));

  // 2. Fetch last 20 movements
  const movements = await prisma.stockMovement.findMany({
    where: { productId: product.id, tenantId },
    include: { warehouse: { select: { name: true } } },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 20,
  });

  // Calculate chronological balances up to these movements for correct running balance trace
  const allMovements = await prisma.stockMovement.findMany({
    where: { productId: product.id, tenantId },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });
  let balanceTracker = 0;
  const runningBalancesMap = {};
  allMovements.forEach(m => {
    balanceTracker += Number(m.qty);
    runningBalancesMap[m.id] = balanceTracker;
  });

  const formattedMovements = movements.map(m => ({
    id: m.id,
    createdAt: m.createdAt,
    movementType: m.movementType,
    qty: Number(m.qty),
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    reason: m.reason,
    warehouseName: m.warehouse?.name || "Global / Unassigned",
    runningBalance: runningBalancesMap[m.id] || 0,
  }));

  const cost = Number(product.lastPurchaseCost || product.costPrice || 0);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    procurementType: product.procurementType,
    reorderLevel: Number(product.reorderLevel),
    preferredStock: Number(product.preferredStock),
    onHand,
    reserved,
    freeToUse,
    cost,
    valuation: onHand * cost,
    breakdown,
    movements: formattedMovements,
  };
};
