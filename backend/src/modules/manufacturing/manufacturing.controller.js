import * as manufacturingService from "./manufacturing.service.js";

export const getMOs = async (req, res, next) => {
  try {
    const list = await manufacturingService.listManufacturingOrders(req.query, req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const getMOById = async (req, res, next) => {
  try {
    const mo = await manufacturingService.getManufacturingOrderById(req.params.id, req.user.tenantId);
    res.json(mo);
  } catch (err) {
    next(err);
  }
};

export const createMO = async (req, res, next) => {
  try {
    const mo = await manufacturingService.createManufacturingOrder(req.body, req.user.id, req.user.tenantId);
    res.status(201).json(mo);
  } catch (err) {
    next(err);
  }
};

export const confirmMO = async (req, res, next) => {
  try {
    const mo = await manufacturingService.confirmManufacturingOrder(req.params.id, req.user.id, req.user.tenantId);
    res.json(mo);
  } catch (err) {
    next(err);
  }
};

export const startMO = async (req, res, next) => {
  try {
    const mo = await manufacturingService.startManufacturingOrder(req.params.id, req.user.id, req.user.tenantId);
    res.json(mo);
  } catch (err) {
    next(err);
  }
};

export const startWorkOrder = async (req, res, next) => {
  try {
    const wo = await manufacturingService.startWorkOrder(req.params.id, req.params.woId, req.user.id, req.user.tenantId);
    res.json(wo);
  } catch (err) {
    next(err);
  }
};

export const completeWorkOrder = async (req, res, next) => {
  try {
    const wo = await manufacturingService.completeWorkOrder(req.params.id, req.params.woId, req.user.id, req.user.tenantId);
    res.json(wo);
  } catch (err) {
    next(err);
  }
};

export const completeMO = async (req, res, next) => {
  try {
    const mo = await manufacturingService.completeManufacturingOrder(req.params.id, req.user.id, req.user.tenantId);
    res.json(mo);
  } catch (err) {
    next(err);
  }
};

export const cancelMO = async (req, res, next) => {
  try {
    const mo = await manufacturingService.cancelManufacturingOrder(req.params.id, req.user.id, req.user.tenantId);
    res.json(mo);
  } catch (err) {
    next(err);
  }
};
