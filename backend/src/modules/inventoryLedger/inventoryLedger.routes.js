import { Router } from "express";
import { verifyToken } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { getLedger, exportLedger } from "./inventoryLedger.controller.js";

const router = Router();

// Guard all inventory ledger routes with verifyToken and roles
router.use(verifyToken);
router.use(requireRole("ADMIN", "BUSINESS_OWNER", "INVENTORY_MANAGER"));

router.get("/", getLedger);
router.get("/export", exportLedger);

export default router;
