import * as analyticsService from "./analytics.service.js";
import * as reportService from "./report.service.js";
import { validateDateRange, validateExport } from "./analytics.validation.js";
import prisma from "../../config/prisma.js";

export const getDashboardCtrl = async (req, res, next) => {
  try {
    const data = await analyticsService.getExecutiveDashboard(req.user.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getSalesCtrl = async (req, res, next) => {
  try {
    validateDateRange(req.query);
    const data = await analyticsService.getSalesAnalytics(req.user.tenantId, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getPurchaseCtrl = async (req, res, next) => {
  try {
    validateDateRange(req.query);
    const data = await analyticsService.getPurchaseAnalytics(req.user.tenantId, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getInventoryCtrl = async (req, res, next) => {
  try {
    const data = await analyticsService.getInventoryAnalytics(req.user.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getManufacturingCtrl = async (req, res, next) => {
  try {
    const data = await analyticsService.getManufacturingAnalytics(req.user.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getVendorsCtrl = async (req, res, next) => {
  try {
    const data = await analyticsService.getVendorAnalytics(req.user.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getAuditCtrl = async (req, res, next) => {
  try {
    validateDateRange(req.query);
    const data = await analyticsService.getAuditLogsAnalytics(req.user.tenantId, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Export Report Controller (CSV, XLSX, PDF output generation)
 */
export const exportReportCtrl = async (req, res, next) => {
  try {
    validateExport(req.query);
    validateDateRange(req.query);

    const tenantId = req.user.tenantId;
    const type = req.query.type.toLowerCase();
    const format = req.query.format.toLowerCase();

    // Department-scoped RBAC controls for exports
    const userRole = req.user.role;
    if (userRole !== "ADMIN" && userRole !== "BUSINESS_OWNER") {
      if (type === "sales" && userRole !== "SALES_USER") {
        throw { status: 403, message: "Forbidden: You do not have access to sales reports." };
      }
      if (type === "purchase" && userRole !== "PURCHASE_USER") {
        throw { status: 403, message: "Forbidden: You do not have access to purchase reports." };
      }
      if (type === "inventory" && userRole !== "INVENTORY_MANAGER") {
        throw { status: 403, message: "Forbidden: You do not have access to inventory reports." };
      }
      if (type === "manufacturing" && userRole !== "MANUFACTURING_USER") {
        throw { status: 403, message: "Forbidden: You do not have access to manufacturing reports." };
      }
      if (type === "audit") {
        throw { status: 403, message: "Forbidden: You do not have access to audit trail reports." };
      }
    }

    let exportData = [];
    let columns = [];
    let reportTitle = "";

    // 1. Fetch data based on requested export type
    if (type === "sales") {
      reportTitle = "Sales Revenue Report";
      const where = { tenantId, status: { not: "CANCELLED" } };
      if (req.query.startDate) where.orderDate = { gte: new Date(req.query.startDate) };
      if (req.query.endDate) where.orderDate = { ...where.orderDate, lte: new Date(req.query.endDate) };

      const orders = await prisma.salesOrder.findMany({
        where,
        include: { customer: { select: { name: true } }, lines: true },
        orderBy: { orderDate: "desc" }
      });

      exportData = orders.map(o => {
        const rev = o.lines.reduce((s, l) => s + (Number(l.deliveredQty) * Number(l.unitPrice)), 0);
        return {
          orderDate: o.orderDate.toLocaleDateString(),
          orderRef: o.orderRef,
          customer: o.customer.name,
          revenue: rev,
          status: o.status
        };
      });

      columns = [
        { header: "Order Date", value: "orderDate" },
        { header: "Order Reference", value: "orderRef" },
        { header: "Customer Name", value: "customer" },
        { header: "Delivered Revenue (INR)", value: row => Number(row.revenue).toFixed(2) },
        { header: "Status", value: "status" }
      ];
    } else if (type === "purchase") {
      reportTitle = "Purchase spend Report";
      const where = { tenantId, status: { not: "CANCELLED" } };
      if (req.query.startDate) where.orderDate = { gte: new Date(req.query.startDate) };
      if (req.query.endDate) where.orderDate = { ...where.orderDate, lte: new Date(req.query.endDate) };

      const orders = await prisma.purchaseOrder.findMany({
        where,
        include: { vendor: { select: { name: true } }, lines: true },
        orderBy: { orderDate: "desc" }
      });

      exportData = orders.map(o => {
        const spend = o.lines.reduce((s, l) => s + (Number(l.receivedQty) * Number(l.unitCost)), 0);
        return {
          orderDate: o.orderDate.toLocaleDateString(),
          orderRef: o.orderRef,
          vendor: o.vendor.name,
          spend,
          status: o.status
        };
      });

      columns = [
        { header: "Order Date", value: "orderDate" },
        { header: "PO Reference", value: "orderRef" },
        { header: "Vendor Name", value: "vendor" },
        { header: "Received Spend (INR)", value: row => Number(row.spend).toFixed(2) },
        { header: "Status", value: "status" }
      ];
    } else if (type === "inventory") {
      reportTitle = "Inventory Valuation Report";
      const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: "asc" }
      });

      exportData = products.map(p => {
        const cost = Number(p.lastPurchaseCost || p.costPrice || 0);
        const onHand = Number(p.onHandQty);
        return {
          name: p.name,
          sku: p.sku,
          onHand,
          cost,
          value: onHand * cost
        };
      });

      columns = [
        { header: "Product Name", value: "name" },
        { header: "SKU", value: "sku" },
        { header: "On Hand Stock", value: row => Number(row.onHand).toFixed(2) },
        { header: "Unit Cost (INR)", value: row => Number(row.cost).toFixed(2) },
        { header: "Valuation (INR)", value: row => Number(row.value).toFixed(2) }
      ];
    } else if (type === "manufacturing") {
      reportTitle = "Manufacturing Operations Report";
      const where = { tenantId };
      if (req.query.startDate) where.createdAt = { gte: new Date(req.query.startDate) };
      if (req.query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(req.query.endDate) };

      const orders = await prisma.manufacturingOrder.findMany({
        where,
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" }
      });

      exportData = orders.map(mo => ({
        createdAt: mo.createdAt.toLocaleDateString(),
        moRef: mo.moRef,
        product: mo.product.name,
        qty: Number(mo.qty),
        status: mo.status
      }));

      columns = [
        { header: "Created Date", value: "createdAt" },
        { header: "MO Reference", value: "moRef" },
        { header: "Finished Product", value: "product" },
        { header: "Planned Qty", value: row => Number(row.qty).toFixed(0) },
        { header: "Status", value: "status" }
      ];
    } else if (type === "audit") {
      reportTitle = "Rapid ERP System Audit Trail";
      const logs = await analyticsService.getAuditLogsAnalytics(tenantId, req.query);

      exportData = logs.map(l => ({
        createdAt: l.createdAt.toLocaleString(),
        user: l.user?.name || "System",
        action: l.action,
        entity: l.entityType,
        entityId: l.entityId,
        desc: l.description
      }));

      columns = [
        { header: "Timestamp", value: "createdAt" },
        { header: "Triggered By", value: "user" },
        { header: "Action", value: "action" },
        { header: "Entity", value: "entity" },
        { header: "Record ID", value: row => String(row.entityId) },
        { header: "Description", value: "desc" }
      ];
    }

    // 2. Export according to requested format
    if (format === "csv") {
      const csvStr = reportService.generateCSV(exportData, columns);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${type}_report_${Date.now()}.csv"`);
      return res.send(csvStr);
    } else if (format === "xlsx") {
      const xlsxBuffer = reportService.generateExcel(exportData, reportTitle.slice(0, 30), columns);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${type}_report_${Date.now()}.xlsx"`);
      return res.send(xlsxBuffer);
    } else if (format === "pdf") {
      const pdfBuffer = await reportService.generatePDF(exportData, reportTitle, columns);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${type}_report_${Date.now()}.pdf"`);
      return res.send(pdfBuffer);
    }
  } catch (err) {
    next(err);
  }
};
