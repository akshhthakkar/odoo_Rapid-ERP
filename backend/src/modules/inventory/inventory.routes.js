import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import * as inventoryController from "./inventory.controller.js";

const router = express.Router();

// Apply auth to all inventory operations
router.use(verifyToken);

router.get("/dashboard", inventoryController.getDashboard);
router.get("/ledger", inventoryController.getLedger);
router.get("/valuation", inventoryController.getValuation);

router.get("/warehouses", inventoryController.getWarehousesList);
router.post("/warehouses", inventoryController.addWarehouse);
router.patch("/warehouses/:id/deactivate", inventoryController.deactivateWarehouseCtrl);

router.get("/transfers", inventoryController.getTransfersList);
router.post("/transfers", inventoryController.createTransfer);

router.get("/adjustments", inventoryController.getAdjustmentsList);
router.post("/adjustments", inventoryController.createAdjustment);

router.get("/product/:id", inventoryController.getProductDetails);

export default router;
