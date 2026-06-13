import { Router } from "express";
import { verifyToken } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import {
  listAuditLogs,
  getAuditLogDetail,
  exportAuditLogs,
} from "./audit.controller.js";

const router = Router();

// Guard all audit routes to verifyToken and roles ADMIN or BUSINESS_OWNER
router.use(verifyToken, requireRole("ADMIN", "BUSINESS_OWNER"));

router.get("/", listAuditLogs);
router.get("/export", exportAuditLogs);
router.get("/:id", getAuditLogDetail);

export default router;
