import { Router } from "express";
import {
  getMOs,
  getMOById,
  createMO,
  confirmMO,
  startMO,
  startWorkOrder,
  completeWorkOrder,
  completeMO,
  cancelMO,
} from "./manufacturing.controller.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";

const router = Router();

// All manufacturing execution routes require authentication
router.use(verifyToken);

// Read-only routes (restricted to ADMIN, BUSINESS_OWNER, and MANUFACTURING_USER)
router.get("/", requireRole("ADMIN", "BUSINESS_OWNER", "MANUFACTURING_USER"), getMOs);
router.get("/:id", requireRole("ADMIN", "BUSINESS_OWNER", "MANUFACTURING_USER"), getMOById);

// Execution / modification routes (restricted to ADMIN and MANUFACTURING_USER)
router.post("/", requireRole("ADMIN", "MANUFACTURING_USER"), createMO);
router.post("/:id/confirm", requireRole("ADMIN", "MANUFACTURING_USER"), confirmMO);
router.post("/:id/start", requireRole("ADMIN", "MANUFACTURING_USER"), startMO);
router.post("/:id/work-orders/:woId/start", requireRole("ADMIN", "MANUFACTURING_USER"), startWorkOrder);
router.post("/:id/work-orders/:woId/complete", requireRole("ADMIN", "MANUFACTURING_USER"), completeWorkOrder);
router.post("/:id/complete", requireRole("ADMIN", "MANUFACTURING_USER"), completeMO);
router.post("/:id/cancel", requireRole("ADMIN", "MANUFACTURING_USER"), cancelMO);

export default router;
