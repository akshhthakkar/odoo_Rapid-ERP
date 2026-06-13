import { Router } from "express";
import { verifyToken } from "../../middleware/auth.js";
import { getLedger, exportLedger } from "./inventoryLedger.controller.js";

const router = Router();

// Guard all inventory ledger routes with verifyToken
router.use(verifyToken);

router.get("/", getLedger);
router.get("/export", exportLedger);

export default router;
