import { getInventoryLedger } from "./inventoryLedger.service.js";
import {
  exportInventoryLedgerToCSV,
  exportInventoryLedgerToXLSX,
  exportInventoryLedgerToPDF,
} from "../../utils/reportExporter.js";
import { logAudit } from "../../utils/auditLogger.js";

export const getLedger = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, warehouseId, startDate, endDate } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "productId query parameter is required" });
    }

    const ledger = await getInventoryLedger({
      productId,
      warehouseId,
      startDate,
      endDate,
      tenantId,
    });

    res.status(200).json(ledger);
  } catch (err) {
    next(err);
  }
};

export const exportLedger = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, warehouseId, startDate, endDate, format = "csv" } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "productId query parameter is required" });
    }

    const ledgerData = await getInventoryLedger({
      productId,
      warehouseId,
      startDate,
      endDate,
      tenantId,
    });

    const product = ledgerData.product;
    const warehouse = ledgerData.warehouse;

    let fileBuffer;
    let contentType;
    let fileName = `inventory_ledger_${product.sku}_${Date.now()}`;

    if (format === "xlsx") {
      fileBuffer = exportInventoryLedgerToXLSX(product, warehouse, ledgerData);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileName += ".xlsx";
    } else if (format === "pdf") {
      fileBuffer = await exportInventoryLedgerToPDF(product, warehouse, ledgerData);
      contentType = "application/pdf";
      fileName += ".pdf";
    } else {
      fileBuffer = exportInventoryLedgerToCSV(product, warehouse, ledgerData);
      contentType = "text/csv";
      fileName += ".csv";
    }

    // Log the report export audit event
    await logAudit({
      tenantId,
      userId: req.user.id,
      action: "REPORT_EXPORTED",
      entityType: "InventoryLedger",
      entityId: product.id,
      description: `Exported inventory ledger for product "${product.name}" (${product.sku}) as ${format.toUpperCase()}`,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(fileBuffer);
  } catch (err) {
    next(err);
  }
};
