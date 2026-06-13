import { getAuditLogs, getAuditLogById } from "./audit.service.js";
import {
  exportAuditLogsToCSV,
  exportAuditLogsToXLSX,
  exportAuditLogsToPDF,
} from "../../utils/reportExporter.js";
import { logAudit } from "../../utils/auditLogger.js";

export const listAuditLogs = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      page,
      limit,
      startDate,
      endDate,
      userId,
      action,
      entityType,
      searchText,
    } = req.query;

    const result = await getAuditLogs({
      tenantId,
      page,
      limit,
      startDate,
      endDate,
      userId,
      action,
      entityType,
      searchText,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogDetail = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const log = await getAuditLogById(id, tenantId);
    res.status(200).json(log);
  } catch (err) {
    next(err);
  }
};

export const exportAuditLogs = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      format = "csv",
      startDate,
      endDate,
      userId,
      action,
      entityType,
      searchText,
    } = req.query;

    // Fetch logs without pagination (or with a safe upper limit like 2000 records)
    const result = await getAuditLogs({
      tenantId,
      page: 1,
      limit: 2000,
      startDate,
      endDate,
      userId,
      action,
      entityType,
      searchText,
    });

    const logs = result.logs;
    let fileBuffer;
    let contentType;
    let fileName = `audit_trail_${Date.now()}`;

    if (format === "xlsx") {
      fileBuffer = exportAuditLogsToXLSX(logs);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileName += ".xlsx";
    } else if (format === "pdf") {
      fileBuffer = await exportAuditLogsToPDF(logs);
      contentType = "application/pdf";
      fileName += ".pdf";
    } else {
      fileBuffer = exportAuditLogsToCSV(logs);
      contentType = "text/csv";
      fileName += ".csv";
    }

    // Log the report export audit event
    await logAudit({
      tenantId,
      userId: req.user.id,
      action: "REPORT_EXPORTED",
      entityType: "AuditLog",
      entityId: req.user.id, // reference to performing user
      description: `Exported audit trail report as ${format.toUpperCase()}`,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(fileBuffer);
  } catch (err) {
    next(err);
  }
};
