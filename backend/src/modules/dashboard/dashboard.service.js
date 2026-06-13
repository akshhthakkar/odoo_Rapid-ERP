import prisma from '../../config/prisma.js';
import * as analyticsService from '../analytics/analytics.service.js';

/**
 * Helper to compute percentage trend.
 */
const getTrend = (current, prior) => {
  const currentVal = Number(current || 0);
  const priorVal = Number(prior || 0);
  if (priorVal === 0) return currentVal > 0 ? 100 : 0;
  return Number((((currentVal - priorVal) / priorVal) * 100).toFixed(1));
};

export const getExecutiveDashboard = async (tenantId, query = {}, user = {}) => {
  // 1. Establish Date Ranges
  const now = new Date();
  const start = query.startDate ? new Date(query.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = query.endDate ? new Date(query.endDate) : new Date();

  const filterDate = {
    gte: start,
    lte: end
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 2. Concurrently fetch data from Analytics service and operational databases
  const [
    salesAnalytics,
    purchaseAnalytics,
    inventoryAnalytics,
    mfgAnalytics,
    auditLogs,
    salesOrdersToday,
    pendingDeliveries,
    partiallyDelivered,
    cancelledOrders,
    openPOs,
    partialReceipts,
    delayedPOs,
    pendingReplenishments,
    poStatusCounts,
    activeMOs,
    completedMOs,
    delayedMOs,
    workOrdersInProgress,
    completedMOsLast30Days,
    delayedMosList,
    delayedPosList,
    products,
    balances,
    salesToday,
    todayMovements
  ] = await Promise.all([
    // Reuse analytics queries
    analyticsService.getSalesAnalytics(tenantId, query),
    analyticsService.getPurchaseAnalytics(tenantId, query),
    analyticsService.getInventoryAnalytics(tenantId),
    analyticsService.getManufacturingAnalytics(tenantId),
    analyticsService.getAuditLogsAnalytics(tenantId, { limit: 10 }),

    // Sales Command Center Counts
    prisma.salesOrder.count({
      where: {
        tenantId,
        createdAt: { gte: startOfToday }
      }
    }),
    prisma.salesOrder.count({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] },
        orderDate: filterDate
      }
    }),
    prisma.salesOrder.count({
      where: {
        tenantId,
        status: 'PARTIALLY_DELIVERED',
        orderDate: filterDate
      }
    }),
    prisma.salesOrder.count({
      where: {
        tenantId,
        status: 'CANCELLED',
        orderDate: filterDate
      }
    }),

    // Procurement Command Center Counts
    prisma.purchaseOrder.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'] },
        orderDate: filterDate
      }
    }),
    prisma.purchaseOrder.count({
      where: {
        tenantId,
        status: 'PARTIALLY_RECEIVED',
        orderDate: filterDate
      }
    }),
    prisma.purchaseOrder.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'] },
        expectedDeliveryDate: { lt: now },
        orderDate: filterDate
      }
    }),
    prisma.salesOrderLine.count({
      where: {
        salesOrder: {
          tenantId,
          orderDate: filterDate
        },
        replenishmentStatus: { in: ['TRIGGERED', 'IN_PROGRESS'] }
      }
    }),
    prisma.purchaseOrder.groupBy({
      by: ['status'],
      where: {
        tenantId,
        orderDate: filterDate
      },
      _count: { status: true }
    }),

    // Manufacturing Command Center Counts
    prisma.manufacturingOrder.count({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        createdAt: filterDate
      }
    }),
    prisma.manufacturingOrder.count({
      where: {
        tenantId,
        status: 'DONE',
        createdAt: filterDate
      }
    }),
    prisma.manufacturingOrder.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS'] },
        scheduledDate: { lt: now },
        createdAt: filterDate
      }
    }),
    prisma.workOrder.count({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
        manufacturingOrder: { createdAt: filterDate }
      }
    }),
    prisma.manufacturingOrder.findMany({
      where: {
        tenantId,
        status: 'DONE',
        completedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: { qty: true, completedAt: true }
    }),

    // Lists for building drilldown Alert Center details
    prisma.manufacturingOrder.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS'] },
        scheduledDate: { lt: now }
      },
      include: { product: { select: { name: true } } }
    }),
    prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'] },
        expectedDeliveryDate: { lt: now }
      },
      include: { vendor: { select: { name: true } } }
    }),

    // Products and Balances for valuation/alerts
    prisma.product.findMany({
      where: { tenantId, isActive: true }
    }),
    prisma.inventoryBalance.findMany({
      where: { tenantId, warehouse: { isActive: true } },
      include: { warehouse: true }
    }),

    // Today's Sales Orders for Morning Brief
    prisma.salesOrder.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        orderDate: { gte: startOfToday }
      },
      include: { lines: true }
    }),

    // Today's Stock Movements for ledger summary
    prisma.stockMovement.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfToday }
      }
    })
  ]);

  // 3. Process Financial Snapshot
  const revenue = salesAnalytics.kpis.totalRevenue;
  const purchaseSpend = purchaseAnalytics.kpis.totalSpend;
  const inventoryValue = inventoryAnalytics.kpis.totalValue;
  const profitEstimate = revenue - purchaseSpend;

  // 4. Compute PO status breakdown pie chart data
  const poStatusBreakdown = { DRAFT: 0, SENT: 0, PARTIALLY_RECEIVED: 0, RECEIVED: 0, CANCELLED: 0 };
  poStatusCounts.forEach(group => {
    poStatusBreakdown[group.status] = group._count.status;
  });

  // 5. Compute Production Output Trend in the last 30 days
  const outputMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    outputMap[dateStr] = 0;
  }
  completedMOsLast30Days.forEach(mo => {
    if (mo.completedAt) {
      const dateStr = mo.completedAt.toISOString().split('T')[0];
      if (outputMap[dateStr] !== undefined) {
        outputMap[dateStr] += Number(mo.qty);
      }
    }
  });
  const productionOutput = Object.entries(outputMap).map(([date, qty]) => ({ date, qty }));

  // 5.5 Compute Today's Inventory Movements Summary
  let todayPurchases = 0;
  let todaySales = 0;
  let todayProduction = 0;
  let todayConsumption = 0;

  todayMovements.forEach(m => {
    const qty = Math.abs(Number(m.qty));
    if (m.movementType === "PURCHASE_RECEIPT") todayPurchases += qty;
    else if (m.movementType === "SALE_DELIVERY") todaySales += qty;
    else if (m.movementType === "MANUFACTURING_PRODUCE") todayProduction += qty;
    else if (m.movementType === "MANUFACTURING_CONSUME") todayConsumption += qty;
  });


  // 6. Compute Inventory Alerts and Warehouse Heat Map values
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const stockAlerts = [];

  products.forEach(p => {
    const onHand = Number(p.onHandQty);
    const reserved = Number(p.reservedQty);
    const freeToUse = onHand - reserved;
    const reorder = Number(p.reorderLevel);

    if (onHand <= 0 && reorder > 0) {
      outOfStockCount++;
      stockAlerts.push({
        type: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        message: `${p.name} is completely out of stock`,
        actionUrl: `/inventory/product/${p.id}`
      });
    } else if (freeToUse < reorder) {
      lowStockCount++;
      stockAlerts.push({
        type: 'LOW_STOCK',
        severity: 'MEDIUM',
        message: `${p.name} is running below reorder levels`,
        actionUrl: `/inventory/product/${p.id}`
      });
    }
  });

  // High Stock Volume Alerts (instead of hardcoded warehouse capacity alerts)
  const warehouseBalances = {};
  balances.forEach(b => {
    const code = b.warehouse.code;
    const name = b.warehouse.name;
    if (!warehouseBalances[code]) warehouseBalances[code] = { name, qty: 0 };
    warehouseBalances[code].qty += Number(b.onHandQty);
  });

  const volumeAlerts = [];
  Object.entries(warehouseBalances).forEach(([code, data]) => {
    if (data.qty > 2000) {
      volumeAlerts.push({
        type: 'INVENTORY_VOLUME_THRESHOLD',
        severity: 'MEDIUM',
        message: `Inventory Volume Threshold Alert: Warehouse ${data.name} stores ${data.qty.toFixed(0)} units`,
        actionUrl: '/inventory'
      });
    }
  });

  // Combine Delayed Alerts
  const delayedMoAlerts = delayedMosList.map(mo => ({
    type: 'DELAYED_MANUFACTURING',
    severity: 'HIGH',
    message: `Manufacturing Order ${mo.moRef} for ${mo.product.name} is delayed`,
    actionUrl: `/manufacturing/${mo.id}`
  }));

  const delayedPoAlerts = delayedPosList.map(po => ({
    type: 'DELAYED_PURCHASE',
    severity: 'HIGH',
    message: `Purchase Order ${po.orderRef} from ${po.vendor.name} is delayed`,
    actionUrl: `/purchase/${po.id}`
  }));

  const alerts = [
    ...stockAlerts.filter(a => a.severity === 'CRITICAL'),
    ...delayedMoAlerts,
    ...delayedPoAlerts,
    ...stockAlerts.filter(a => a.severity === 'MEDIUM'),
    ...volumeAlerts
  ];

  // 7. Compute Business Health Score
  let healthScorePoints = 100;
  healthScorePoints -= (delayedMOs * 5);
  healthScorePoints -= (delayedPOs * 5);
  healthScorePoints -= (lowStockCount * 2);
  if (outOfStockCount > 0) healthScorePoints -= 10;
  const healthScore = Math.max(0, Math.min(100, healthScorePoints));

  // 8. Compute Morning Brief Data
  const greetingHour = now.getHours();
  let greetingPrefix = 'Good Morning';
  if (greetingHour >= 12 && greetingHour < 18) greetingPrefix = 'Good Afternoon';
  else if (greetingHour >= 18) greetingPrefix = 'Good Evening';

  let revenueToday = 0;
  salesToday.forEach(so => {
    so.lines.forEach(l => {
      revenueToday += Number(l.deliveredQty) * Number(l.unitPrice);
    });
  });

  const morningBrief = {
    greeting: `${greetingPrefix}, ${user.name || 'Executive'}`,
    revenueToday,
    pendingDeliveriesCount: pendingDeliveries,
    delayedMOsCount: delayedMOs,
    lowStockCount
  };

  // 9. Period-over-period Smart Insights
  const queryDuration = end.getTime() - start.getTime();
  const priorStart = new Date(start.getTime() - queryDuration);
  const priorEnd = start;

  const [priorSales, priorPurchases] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        orderDate: { gte: priorStart, lt: priorEnd }
      },
      include: { lines: true }
    }),
    prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        orderDate: { gte: priorStart, lt: priorEnd }
      },
      include: { lines: true }
    })
  ]);

  let priorRevenue = 0;
  priorSales.forEach(so => {
    so.lines.forEach(l => {
      priorRevenue += Number(l.deliveredQty) * Number(l.unitPrice);
    });
  });

  let priorSpend = 0;
  priorPurchases.forEach(po => {
    po.lines.forEach(l => {
      priorSpend += Number(l.receivedQty) * Number(l.unitCost);
    });
  });

  const revenueGrowth = getTrend(revenue, priorRevenue);
  const spendGrowth = getTrend(purchaseSpend, priorSpend);

  const insights = [];
  if (revenueGrowth > 0) {
    insights.push(`Revenue increased ${revenueGrowth}% compared to the prior period.`);
  } else if (revenueGrowth < 0) {
    insights.push(`Revenue decreased ${Math.abs(revenueGrowth)}% compared to the prior period.`);
  } else {
    insights.push('Revenue remained stable compared to the prior period.');
  }

  if (spendGrowth > 0) {
    insights.push(`Purchase spend rose by ${spendGrowth}% compared to the prior period.`);
  } else if (spendGrowth < 0) {
    insights.push(`Purchase spend fell Z% (${Math.abs(spendGrowth)}%) compared to the prior period.`);
  }

  if (lowStockCount > 0) {
    insights.push(`${lowStockCount} products are currently below their reorder points.`);
  } else {
    insights.push('All inventory balances are currently above reorder levels.');
  }

  if (delayedMOs > 0) {
    insights.push(`Manufacturing throughput is affected by ${delayedMOs} delayed production orders.`);
  }

  // 10. Compile Revenue vs Spend Trend
  const combinedTrendMap = {};
  salesAnalytics.salesTrends.forEach(t => {
    if (!combinedTrendMap[t.month]) combinedTrendMap[t.month] = { month: t.month, revenue: 0, spend: 0 };
    combinedTrendMap[t.month].revenue += Number(t.revenue);
  });
  purchaseAnalytics.purchaseTrends.forEach(t => {
    if (!combinedTrendMap[t.month]) combinedTrendMap[t.month] = { month: t.month, revenue: 0, spend: 0 };
    combinedTrendMap[t.month].spend += Number(t.spend);
  });
  const revenueSpendTrend = Object.values(combinedTrendMap);

  return {
    financials: {
      revenue,
      purchaseSpend,
      inventoryValue,
      profitEstimate,
      healthScore
    },
    sales: {
      salesOrdersToday,
      pendingDeliveries,
      partiallyDelivered,
      cancelledOrders
    },
    purchasing: {
      openPOs,
      partialReceipts,
      delayedPOs,
      pendingReplenishments,
      poStatusBreakdown
    },
    manufacturing: {
      activeMOs,
      completedMOs,
      delayedMOs,
      workOrdersInProgress,
      productionOutput
    },
    inventory: {
      inventoryValue,
      reservedStock: inventoryAnalytics.kpis.reservedStock,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      warehouseHeatMap: inventoryAnalytics.warehouseValuation.map(w => ({
        warehouseCode: w.warehouse,
        value: w.value
      })),
      todaySummary: {
        purchases: todayPurchases,
        sales: todaySales,
        production: todayProduction,
        consumption: todayConsumption
      }
    },
    alerts: alerts.slice(0, 15),
    recentActivity: auditLogs.map(log => ({
      createdAt: log.createdAt,
      user: log.user?.name || 'System',
      action: log.action,
      description: log.description
    })),
    topProducts: salesAnalytics.topProducts,
    topCustomers: salesAnalytics.topCustomers,
    topVendors: purchaseAnalytics.vendorSpend,
    insights,
    morningBrief,
    revenueSpendTrend
  };
};
