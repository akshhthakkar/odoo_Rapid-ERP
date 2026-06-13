import * as inventoryService from "./inventory.service.js";

export const getDashboard = async (req, res, next) => {
  try {
    const data = await inventoryService.getInventoryDashboard(req.user.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getLedger = async (req, res, next) => {
  try {
    const list = await inventoryService.getStockLedger(req.query, req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const getValuation = async (req, res, next) => {
  try {
    const list = await inventoryService.getInventoryValuation(req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const getWarehousesList = async (req, res, next) => {
  try {
    const list = await inventoryService.getWarehouses(req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const addWarehouse = async (req, res, next) => {
  try {
    const wh = await inventoryService.createWarehouse(req.body, req.user.tenantId);
    res.status(201).json(wh);
  } catch (err) {
    next(err);
  }
};

export const deactivateWarehouseCtrl = async (req, res, next) => {
  try {
    const updated = await inventoryService.deactivateWarehouse(req.params.id, req.user.tenantId);
    res.json({ message: "Warehouse deactivated successfully.", warehouse: updated });
  } catch (err) {
    next(err);
  }
};

export const getTransfersList = async (req, res, next) => {
  try {
    const list = await inventoryService.getStockTransfers(req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const createTransfer = async (req, res, next) => {
  try {
    const transfer = await inventoryService.createStockTransfer(req.body, req.user.id, req.user.tenantId);
    res.status(201).json(transfer);
  } catch (err) {
    next(err);
  }
};

export const getAdjustmentsList = async (req, res, next) => {
  try {
    const list = await inventoryService.getInventoryAdjustments(req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const createAdjustment = async (req, res, next) => {
  try {
    const adjustment = await inventoryService.createInventoryAdjustment(req.body, req.user.id, req.user.tenantId);
    res.status(201).json(adjustment);
  } catch (err) {
    next(err);
  }
};

export const getProductDetails = async (req, res, next) => {
  try {
    const details = await inventoryService.getProductInventoryDetails(req.params.id, req.user.tenantId);
    res.json(details);
  } catch (err) {
    next(err);
  }
};
