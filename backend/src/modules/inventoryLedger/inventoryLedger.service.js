import prisma from "../../config/prisma.js";

export const getInventoryLedger = async ({
  productId,
  warehouseId,
  startDate = new Date(0).toISOString(), // default to beginning of time
  endDate = new Date().toISOString(),   // default to now
  tenantId,
}) => {
  if (!productId) {
    throw { status: 400, message: "productId is required" };
  }

  // 1. Verify and fetch Product details
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), tenantId },
  });
  if (!product) {
    throw { status: 404, message: "Product not found" };
  }

  // 2. Fetch Warehouse details if specified
  let warehouse = null;
  if (warehouseId) {
    warehouse = await prisma.warehouse.findFirst({
      where: { id: Number(warehouseId), tenantId },
    });
    if (!warehouse) {
      throw { status: 404, message: "Warehouse not found" };
    }
  }

  const physicalTypes = [
    "PURCHASE_RECEIPT",
    "SALE_DELIVERY",
    "MANUFACTURING_CONSUME",
    "MANUFACTURING_PRODUCE",
    "STOCK_ADJUSTMENT",
    "WAREHOUSE_TRANSFER_OUT",
    "WAREHOUSE_TRANSFER_IN",
  ];

  // 3. Compute Opening Balance (sum of all physical movements before startDate)
  const openingFilter = {
    productId: Number(productId),
    tenantId,
    createdAt: { lt: new Date(startDate) },
    movementType: { in: physicalTypes },
  };
  if (warehouseId) {
    openingFilter.warehouseId = Number(warehouseId);
  }

  const openingSum = await prisma.stockMovement.aggregate({
    where: openingFilter,
    _sum: {
      qty: true,
    },
  });

  const openingStock = Number(openingSum._sum.qty) || 0;

  // 4. Fetch chronological movements between startDate and endDate
  const movementsFilter = {
    productId: Number(productId),
    tenantId,
    createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    movementType: { in: physicalTypes },
  };
  if (warehouseId) {
    movementsFilter.warehouseId = Number(warehouseId);
  }

  const movements = await prisma.stockMovement.findMany({
    where: movementsFilter,
    orderBy: { createdAt: "asc" },
  });

  // 5. Batch resolve reference objects
  const saleIds = [];
  const purchaseIds = [];
  const moIds = [];
  const adjIds = [];
  const transferIds = [];

  for (const m of movements) {
    if (m.referenceType === "SALE") saleIds.push(m.referenceId);
    else if (m.referenceType === "PURCHASE") purchaseIds.push(m.referenceId);
    else if (m.referenceType === "MANUFACTURING") moIds.push(m.referenceId);
    else if (m.referenceType === "ADJUSTMENT") adjIds.push(m.referenceId);
    else if (m.referenceType === "TRANSFER") transferIds.push(m.referenceId);
  }

  const [sales, purchases, mos, adjs, transfers] = await Promise.all([
    saleIds.length ? prisma.salesOrder.findMany({ where: { id: { in: saleIds } } }) : [],
    purchaseIds.length ? prisma.purchaseOrder.findMany({ where: { id: { in: purchaseIds } } }) : [],
    moIds.length ? prisma.manufacturingOrder.findMany({ where: { id: { in: moIds } } }) : [],
    adjIds.length ? prisma.inventoryAdjustment.findMany({ where: { id: { in: adjIds } } }) : [],
    transferIds.length ? prisma.stockTransfer.findMany({ where: { id: { in: transferIds } } }) : [],
  ]);

  const salesMap = new Map(sales.map(s => [s.id, s.orderRef]));
  const purchaseMap = new Map(purchases.map(p => [p.id, p.orderRef]));
  const moMap = new Map(mos.map(m => [m.id, m.moRef]));
  const adjMap = new Map(adjs.map(a => [a.id, a.adjustmentRef]));
  const transferMap = new Map(transfers.map(t => [t.id, t.transferRef]));

  const getRefCode = (refType, refId) => {
    if (refType === "SALE") return salesMap.get(refId) || `SO #${refId}`;
    if (refType === "PURCHASE") return purchaseMap.get(refId) || `PO #${refId}`;
    if (refType === "MANUFACTURING") {
      // Find matching mo
      const mo = mos.find(m => m.id === refId);
      return mo ? mo.moRef : `MO #${refId}`;
    }
    if (refType === "ADJUSTMENT") return adjMap.get(refId) || `ADJ #${refId}`;
    if (refType === "TRANSFER") return transferMap.get(refId) || `TRA #${refId}`;
    return String(refId);
  };

  // 6. Build running ledger rows
  let runningBalance = openingStock;
  const rows = [];

  let purchasesTotal = 0;
  let salesTotal = 0;
  let producedTotal = 0;
  let consumedTotal = 0;
  let adjustmentsTotal = 0;
  let transfersTotal = 0;

  for (const m of movements) {
    const qty = Number(m.qty);
    runningBalance += qty;

    const inQty = qty > 0 ? qty : 0;
    const outQty = qty < 0 ? Math.abs(qty) : 0;

    // Accumulate metrics
    if (m.movementType === "PURCHASE_RECEIPT") purchasesTotal += inQty;
    else if (m.movementType === "SALE_DELIVERY") salesTotal += outQty;
    else if (m.movementType === "MANUFACTURING_PRODUCE") producedTotal += inQty;
    else if (m.movementType === "MANUFACTURING_CONSUME") consumedTotal += outQty;
    else if (m.movementType === "STOCK_ADJUSTMENT") adjustmentsTotal += qty; // can be + or -
    else if (m.movementType === "WAREHOUSE_TRANSFER_OUT" || m.movementType === "WAREHOUSE_TRANSFER_IN") {
      transfersTotal += qty; // net transfer affect (should be 0 global, but warehouse specific exists)
    }

    rows.push({
      id: m.id,
      date: m.createdAt,
      movementType: m.movementType,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      reference: getRefCode(m.referenceType, m.referenceId),
      inQty,
      outQty,
      runningBalance: Number(runningBalance.toFixed(3)),
      reason: m.reason,
      warehouseId: m.warehouseId,
    });
  }

  const closingStock = Number(runningBalance.toFixed(3));
  const netChange = Number((closingStock - openingStock).toFixed(3));

  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
    },
    warehouse: warehouse ? { id: warehouse.id, name: warehouse.name, code: warehouse.code } : null,
    openingStock,
    closingStock,
    purchases: purchasesTotal,
    sales: salesTotal,
    manufacturingProduced: producedTotal,
    manufacturingConsumed: consumedTotal,
    adjustments: adjustmentsTotal,
    transfers: transfersTotal,
    netChange,
    rows,
  };
};
