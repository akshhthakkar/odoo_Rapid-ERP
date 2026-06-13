import prisma from "../../config/prisma.js";

/**
 * Helper to compute percentage trend.
 */
const getTrend = (current, prior) => {
  const currentVal = Number(current || 0);
  const priorVal = Number(prior || 0);
  if (priorVal === 0) return currentVal > 0 ? 100 : 0;
  return Number((((currentVal - priorVal) / priorVal) * 100).toFixed(1));
};

/**
 * 1. Executive Dashboard Service
 */
export const getExecutiveDashboard = async (tenantId) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Run all count and value metrics in parallel
  const [
    activeProductsCount,
    customersCount,
    vendorsCount,
    salesOrdersCount,
    purchaseOrdersCount,
    manufacturingOrdersCount,
    salesOrderLines,
    purchaseOrderLines,
    inventoryValueAggregation,
    priorSalesLines,
    priorPurchaseLines
  ] = await Promise.all([
    // Active products count
    prisma.product.count({ where: { tenantId, isActive: true } }),
    // Customers count
    prisma.customer.count({ where: { tenantId } }),
    // Vendors count
    prisma.vendor.count({ where: { tenantId } }),
    // Sales orders count (non-draft, non-cancelled)
    prisma.salesOrder.count({ where: { tenantId, status: { notIn: ["DRAFT", "CANCELLED"] } } }),
    // Purchase orders count
    prisma.purchaseOrder.count({ where: { tenantId, status: { notIn: ["DRAFT", "CANCELLED"] } } }),
    // Manufacturing orders count
    prisma.manufacturingOrder.count({ where: { tenantId, status: { notIn: ["DRAFT", "CANCELLED"] } } }),

    // Delivered Revenue (Sales Order Lines) - Current 30 days
    prisma.salesOrderLine.findMany({
      where: {
        salesOrder: { tenantId, orderDate: { gte: thirtyDaysAgo } }
      },
      include: { salesOrder: true }
    }),

    // Delivered Purchase Spend (Purchase Order Lines) - Current 30 days
    prisma.purchaseOrderLine.findMany({
      where: {
        purchaseOrder: { tenantId, orderDate: { gte: thirtyDaysAgo } }
      },
      include: { purchaseOrder: true }
    }),

    // Inventory Value
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { onHandQty: true, lastPurchaseCost: true, costPrice: true }
    }),

    // Delivered Revenue - Prior Period (Days 31-60)
    prisma.salesOrderLine.findMany({
      where: {
        salesOrder: {
          tenantId,
          orderDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      },
      include: { salesOrder: true }
    }),

    // Delivered Purchase Spend - Prior Period (Days 31-60)
    prisma.purchaseOrderLine.findMany({
      where: {
        purchaseOrder: {
          tenantId,
          orderDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      },
      include: { purchaseOrder: true }
    })
  ]);

  // Compute Current Revenue and Spend with in-memory status filter
  const currentRevenue = salesOrderLines
    .filter(line => line.salesOrder && line.salesOrder.status !== "CANCELLED")
    .reduce((sum, line) => {
      return sum + (Number(line.deliveredQty) * Number(line.unitPrice));
    }, 0);

  const currentSpend = purchaseOrderLines
    .filter(line => line.purchaseOrder && line.purchaseOrder.status !== "CANCELLED")
    .reduce((sum, line) => {
      return sum + (Number(line.receivedQty) * Number(line.unitCost));
    }, 0);

  // Compute Prior Revenue and Spend with in-memory status filter
  const priorRevenue = priorSalesLines
    .filter(line => line.salesOrder && line.salesOrder.status !== "CANCELLED")
    .reduce((sum, line) => {
      return sum + (Number(line.deliveredQty) * Number(line.unitPrice));
    }, 0);

  const priorSpend = priorPurchaseLines
    .filter(line => line.purchaseOrder && line.purchaseOrder.status !== "CANCELLED")
    .reduce((sum, line) => {
      return sum + (Number(line.receivedQty) * Number(line.unitCost));
    }, 0);

  // Compute Current Inventory Value
  const inventoryValue = inventoryValueAggregation.reduce((sum, p) => {
    const cost = Number(p.lastPurchaseCost || p.costPrice || 0);
    return sum + (Number(p.onHandQty) * cost);
  }, 0);

  // Compute Trends
  const revenueTrend = getTrend(currentRevenue, priorRevenue);
  const spendTrend = getTrend(currentSpend, priorSpend);

  return {
    revenue: currentRevenue,
    revenueTrend,
    purchaseSpend: currentSpend,
    spendTrend,
    inventoryValue,
    salesOrders: salesOrdersCount,
    purchaseOrders: purchaseOrdersCount,
    manufacturingOrders: manufacturingOrdersCount,
    activeProducts: activeProductsCount,
    customers: customersCount,
    vendors: vendorsCount
  };
};

/**
 * 2. Sales Analytics Service
 */
export const getSalesAnalytics = async (tenantId, query = {}) => {
  const where = { tenantId, status: { not: "CANCELLED" } };
  if (query.startDate) where.orderDate = { ...where.orderDate, gte: new Date(query.startDate) };
  if (query.endDate) where.orderDate = { ...where.orderDate, lte: new Date(query.endDate) };

  // Fetch sales orders with lines
  const salesOrders = await prisma.salesOrder.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      lines: {
        include: {
          product: { select: { name: true, sku: true } }
        }
      }
    },
    orderBy: { orderDate: "asc" }
  });

  // Aggregates
  let totalRevenue = 0;
  const monthlyRevenueMap = {};
  const topProductsMap = {};
  const topCustomersMap = {};

  salesOrders.forEach(so => {
    const month = so.orderDate.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!monthlyRevenueMap[month]) monthlyRevenueMap[month] = 0;

    so.lines.forEach(line => {
      const rev = Number(line.deliveredQty) * Number(line.unitPrice);
      totalRevenue += rev;
      monthlyRevenueMap[month] += rev;

      // Product sales
      const pName = line.product.name;
      if (!topProductsMap[pName]) topProductsMap[pName] = { qty: 0, revenue: 0 };
      topProductsMap[pName].qty += Number(line.deliveredQty);
      topProductsMap[pName].revenue += rev;
    });

    // Customer spend
    const cName = so.customer.name;
    const orderRev = so.lines.reduce((s, l) => s + (Number(l.deliveredQty) * Number(l.unitPrice)), 0);
    if (!topCustomersMap[cName]) topCustomersMap[cName] = { orders: 0, revenue: 0 };
    topCustomersMap[cName].orders += 1;
    topCustomersMap[cName].revenue += orderRev;
  });

  const averageOrderValue = salesOrders.length > 0 ? (totalRevenue / salesOrders.length) : 0;

  // Format charts
  const salesTrends = Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({ month, revenue }));
  const topProducts = Object.entries(topProductsMap)
    .map(([product, d]) => ({ product, qty: d.qty, revenue: d.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topCustomers = Object.entries(topCustomersMap)
    .map(([customer, d]) => ({ customer, orders: d.orders, revenue: d.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    kpis: {
      totalRevenue,
      salesCount: salesOrders.length,
      averageOrderValue,
      growth: 0 // Will default to 0 for single-range query
    },
    salesTrends,
    topProducts,
    topCustomers
  };
};

/**
 * 3. Purchase Analytics Service
 */
export const getPurchaseAnalytics = async (tenantId, query = {}) => {
  const where = { tenantId, status: { not: "CANCELLED" } };
  if (query.startDate) where.orderDate = { ...where.orderDate, gte: new Date(query.startDate) };
  if (query.endDate) where.orderDate = { ...where.orderDate, lte: new Date(query.endDate) };

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      vendor: { select: { name: true } },
      lines: {
        include: {
          product: { select: { name: true } }
        }
      }
    },
    orderBy: { orderDate: "asc" }
  });

  let totalSpend = 0;
  const monthlySpendMap = {};
  const vendorSpendMap = {};
  let openCount = 0;
  let receivedCount = 0;

  purchaseOrders.forEach(po => {
    const month = po.orderDate.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!monthlySpendMap[month]) monthlySpendMap[month] = 0;

    if (po.status === "DRAFT" || po.status === "SENT" || po.status === "PARTIALLY_RECEIVED") {
      openCount++;
    } else if (po.status === "RECEIVED") {
      receivedCount++;
    }

    const orderCost = po.lines.reduce((s, l) => s + (Number(l.receivedQty) * Number(l.unitCost)), 0);
    totalSpend += orderCost;
    monthlySpendMap[month] += orderCost;

    const vName = po.vendor.name;
    if (!vendorSpendMap[vName]) vendorSpendMap[vName] = 0;
    vendorSpendMap[vName] += orderCost;
  });

  const purchaseTrends = Object.entries(monthlySpendMap).map(([month, spend]) => ({ month, spend }));
  const vendorSpend = Object.entries(vendorSpendMap)
    .map(([vendor, spend]) => ({ vendor, spend }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  return {
    kpis: {
      totalSpend,
      purchaseCount: purchaseOrders.length,
      openPurchaseOrders: openCount,
      receivedPurchaseOrders: receivedCount
    },
    purchaseTrends,
    vendorSpend
  };
};

/**
 * 4. Inventory Analytics Service (incorporating Last Inbound Stock Movement Date Approximate Inventory Aging)
 */
export const getInventoryAnalytics = async (tenantId) => {
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    include: {
      inventoryBalances: {
        include: { warehouse: { select: { code: true, name: true } } }
      }
    }
  });

  let totalValue = 0;
  let totalUnits = 0;
  let totalReserved = 0;
  const lowStockProducts = [];
  const outOfStockProducts = [];
  const warehouseBalances = {};

  // Find last inbound movement dates for all products in one query to avoid loops
  const inboundMovements = await prisma.stockMovement.findMany({
    where: {
      tenantId,
      qty: { gt: 0 },
      movementType: { in: ["PURCHASE_RECEIPT", "MANUFACTURING_PRODUCE", "STOCK_ADJUSTMENT", "INVENTORY_ADJUSTMENT"] }
    },
    orderBy: { createdAt: "desc" }
  });

  // Build mapping of productId -> latest inbound Date
  const productLatestInboundMap = {};
  inboundMovements.forEach(m => {
    if (!productLatestInboundMap[m.productId]) {
      productLatestInboundMap[m.productId] = m.createdAt;
    }
  });

  const now = new Date();
  const agingBuckets = { "0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0 };

  products.forEach(p => {
    const onHand = Number(p.onHandQty);
    const reserved = Number(p.reservedQty);
    const freeToUse = onHand - reserved;
    const cost = Number(p.lastPurchaseCost || p.costPrice || 0);

    totalUnits += onHand;
    totalReserved += reserved;
    totalValue += (onHand * cost);

    if (onHand <= 0) {
      outOfStockProducts.push({ name: p.name, sku: p.sku });
    } else if (freeToUse < Number(p.reorderLevel)) {
      lowStockProducts.push({ name: p.name, sku: p.sku, onHand, reorderLevel: Number(p.reorderLevel) });
    }

    // Warehouse break down value
    p.inventoryBalances.forEach(bal => {
      const whName = bal.warehouse.name;
      if (!warehouseBalances[whName]) warehouseBalances[whName] = { value: 0, qty: 0 };
      warehouseBalances[whName].value += (Number(bal.onHandQty) * cost);
      warehouseBalances[whName].qty += Number(bal.onHandQty);
    });

    // Compute Approximate Aging using last positive stock receipt timestamp
    const lastInboundDate = productLatestInboundMap[p.id];
    if (onHand > 0) {
      if (lastInboundDate) {
        const days = Math.floor((now.getTime() - lastInboundDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) agingBuckets["0-30 Days"] += onHand;
        else if (days <= 60) agingBuckets["31-60 Days"] += onHand;
        else if (days <= 90) agingBuckets["61-90 Days"] += onHand;
        else agingBuckets["90+ Days"] += onHand;
      } else {
        // Fallback: use product creation date
        const days = Math.floor((now.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) agingBuckets["0-30 Days"] += onHand;
        else if (days <= 60) agingBuckets["31-60 Days"] += onHand;
        else if (days <= 90) agingBuckets["61-90 Days"] += onHand;
        else agingBuckets["90+ Days"] += onHand;
      }
    }
  });

  const warehouseValuation = Object.entries(warehouseBalances).map(([warehouse, data]) => ({
    warehouse,
    value: data.value,
    qty: data.qty
  }));

  const aging = Object.entries(agingBuckets).map(([bucket, qty]) => ({ bucket, qty }));

  return {
    kpis: {
      totalValue,
      totalUnits,
      reservedStock: totalReserved,
      availableStock: totalUnits - totalReserved,
      lowStockProductsCount: lowStockProducts.length,
      outOfStockProductsCount: outOfStockProducts.length
    },
    warehouseValuation,
    aging,
    lowStockProducts: lowStockProducts.slice(0, 10),
    outOfStockProducts: outOfStockProducts.slice(0, 10)
  };
};

/**
 * 5. Manufacturing & Work Center Analytics Service
 */
export const getManufacturingAnalytics = async (tenantId) => {
  const [moList, workOrders, completedWorkOrders, bomOperations] = await Promise.all([
    prisma.manufacturingOrder.findMany({
      where: { tenantId },
      include: { product: { select: { name: true } } }
    }),
    prisma.workOrder.findMany({
      where: { tenantId },
      include: { workCenter: { select: { name: true } } }
    }),
    prisma.workOrder.findMany({
      where: { tenantId, status: "DONE" },
      include: { workCenter: { select: { id: true, name: true } } }
    }),
    prisma.boMOperation.findMany({
      include: { workCenter: { select: { id: true, name: true } } }
    })
  ]);

  let draftMo = 0;
  let confirmedMo = 0;
  let inProgressMo = 0;
  let completedMo = 0;
  let cancelledMo = 0;

  let totalDurationForAvg = 0;
  let completedMoForAvgCount = 0;

  const productProducedMap = {};

  moList.forEach(mo => {
    if (mo.status === "DRAFT") draftMo++;
    else if (mo.status === "CONFIRMED") confirmedMo++;
    else if (mo.status === "IN_PROGRESS") inProgressMo++;
    else if (mo.status === "DONE") {
      completedMo++;
      if (mo.completedAt) {
        const durationHours = (mo.completedAt.getTime() - mo.createdAt.getTime()) / (1000 * 60 * 60);
        totalDurationForAvg += durationHours;
        completedMoForAvgCount++;
      }
      // Production count
      const pName = mo.product.name;
      if (!productProducedMap[pName]) productProducedMap[pName] = 0;
      productProducedMap[pName] += Number(mo.qty);
    } else if (mo.status === "CANCELLED") cancelledMo++;
  });

  const averageMOCompletionTimeHours = completedMoForAvgCount > 0 ? (totalDurationForAvg / completedMoForAvgCount) : 0;

  // Work Center Throughput (total completed operations duration)
  const workCenterThroughputMap = {};
  completedWorkOrders.forEach(wo => {
    const wcName = wo.workCenter.name;
    if (!workCenterThroughputMap[wcName]) workCenterThroughputMap[wcName] = 0;
    workCenterThroughputMap[wcName] += Number(wo.durationMins);
  });

  const workCenterThroughput = Object.entries(workCenterThroughputMap).map(([workCenter, durationMins]) => ({
    workCenter,
    durationMins
  }));

  const productionOutput = Object.entries(productProducedMap).map(([product, produced]) => ({
    product,
    produced
  }));

  return {
    kpis: {
      draftMOs: draftMo,
      confirmedMOs: confirmedMo,
      inProgressMOs: inProgressMo,
      completedMOs: completedMo,
      cancelledMOs: cancelledMo,
      completedWorkOrdersCount: completedWorkOrders.length,
      averageMOCompletionTimeHours
    },
    workCenterThroughput,
    productionOutput
  };
};

/**
 * 6. Vendor Analytics Service
 */
export const getVendorAnalytics = async (tenantId) => {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { tenantId, status: "RECEIVED" },
    include: {
      vendor: { select: { name: true } }
    }
  });

  const vendorPerformanceMap = {};

  purchaseOrders.forEach(po => {
    const vName = po.vendor.name;
    if (!vendorPerformanceMap[vName]) {
      vendorPerformanceMap[vName] = { orderCount: 0, totalLeadTimeDays: 0, totalSpend: 0 };
    }

    // Compute Lead Time
    if (po.receivedDate && po.orderDate) {
      const leadTimeDays = (po.receivedDate.getTime() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24);
      vendorPerformanceMap[vName].totalLeadTimeDays += leadTimeDays;
      vendorPerformanceMap[vName].orderCount += 1;
    }
  });

  const topVendors = Object.entries(vendorPerformanceMap)
    .map(([vendor, d]) => ({
      vendor,
      orders: d.orderCount,
      averageDeliveryTimeDays: d.orderCount > 0 ? Number((d.totalLeadTimeDays / d.orderCount).toFixed(1)) : 0
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  return topVendors;
};

/**
 * 7. Audit Trail Service
 */
export const getAuditLogsAnalytics = async (tenantId, query = {}) => {
  const where = { tenantId };

  if (query.entityType) where.entityType = query.entityType;
  if (query.action) where.action = query.action;
  if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
  if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };

  return prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: query.limit ? Number(query.limit) : 100
  });
};
