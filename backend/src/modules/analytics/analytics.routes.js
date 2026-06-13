import { Router } from "express";
import {
  getDashboardCtrl,
  getSalesCtrl,
  getPurchaseCtrl,
  getInventoryCtrl,
  getManufacturingCtrl,
  getVendorsCtrl,
  getAuditCtrl,
  exportReportCtrl,
} from "./analytics.controller.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";

const router = Router();

// All analytics and reporting routes require authentication
router.use(verifyToken);

// 1. Executive Dashboard (Admin and Business Owner only)
router.get("/dashboard", requireRole("ADMIN", "BUSINESS_OWNER"), getDashboardCtrl);

// 2. Sales Analytics (Admin, Business Owner, Sales User)
router.get("/sales", requireRole("ADMIN", "BUSINESS_OWNER", "SALES_USER"), getSalesCtrl);

// 3. Purchase Analytics (Admin, Business Owner, Purchase User)
router.get("/purchase", requireRole("ADMIN", "BUSINESS_OWNER", "PURCHASE_USER"), getPurchaseCtrl);

// 4. Inventory Analytics (Admin, Business Owner, Inventory Manager)
router.get("/inventory", requireRole("ADMIN", "BUSINESS_OWNER", "INVENTORY_MANAGER"), getInventoryCtrl);

// 5. Manufacturing Analytics (Admin, Business Owner, Manufacturing User)
router.get("/manufacturing", requireRole("ADMIN", "BUSINESS_OWNER", "MANUFACTURING_USER"), getManufacturingCtrl);

// 6. Vendor Performance Analytics (Admin, Business Owner, Purchase User)
router.get("/vendors", requireRole("ADMIN", "BUSINESS_OWNER", "PURCHASE_USER"), getVendorsCtrl);

// 7. Audit Log Analytics (Admin and Business Owner only)
router.get("/audit", requireRole("ADMIN", "BUSINESS_OWNER"), getAuditCtrl);

// 8. Custom Document Exporter (Access restricted internally based on department role scope)
router.get("/export", exportReportCtrl);

export default router;
