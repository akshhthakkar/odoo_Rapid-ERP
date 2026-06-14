import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import * as inventoryController from "./inventory.controller.js";

const router = express.Router();

// Apply auth and base role checks to all inventory operations
router.use(verifyToken);
router.use(requireRole("ADMIN", "BUSINESS_OWNER", "INVENTORY_MANAGER"));

router.get("/dashboard", inventoryController.getDashboard);
router.get("/ledger", inventoryController.getLedger);
router.get("/valuation", inventoryController.getValuation);

router.get("/warehouses", inventoryController.getWarehousesList);
router.post("/warehouses", requireRole("ADMIN", "INVENTORY_MANAGER"), inventoryController.addWarehouse);
router.patch("/warehouses/:id/deactivate", requireRole("ADMIN", "INVENTORY_MANAGER"), inventoryController.deactivateWarehouseCtrl);

router.get("/transfers", inventoryController.getTransfersList);
router.post("/transfers", requireRole("ADMIN", "INVENTORY_MANAGER"), inventoryController.createTransfer);

router.get("/adjustments", inventoryController.getAdjustmentsList);
router.post("/adjustments", requireRole("ADMIN", "INVENTORY_MANAGER"), inventoryController.createAdjustment);

router.get("/product/:id", inventoryController.getProductDetails);

export default router;
