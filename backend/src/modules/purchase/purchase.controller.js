import * as purchaseService from './purchase.service.js';

export const listPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await purchaseService.getPurchaseOrders(req.query, req.user.tenantId);
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

export const getPurchaseOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: 'Invalid Purchase Order ID' };
    const po = await purchaseService.getPurchaseOrderById(id, req.user.tenantId);
    res.status(200).json(po);
  } catch (err) {
    next(err);
  }
};

export const createPurchaseOrder = async (req, res, next) => {
  try {
    const po = await purchaseService.createPurchaseOrder(req.body, req.user.id, req.user.tenantId);
    res.status(201).json({ message: 'Purchase Order created successfully', purchaseOrder: po });
  } catch (err) {
    next(err);
  }
};

export const confirmPurchaseOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: 'Invalid Purchase Order ID' };
    const po = await purchaseService.confirmPurchaseOrder(id, req.user.id, req.user.tenantId);
    res.status(200).json({ message: 'Purchase Order confirmed successfully', purchaseOrder: po });
  } catch (err) {
    next(err);
  }
};

export const receiveGoods = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: 'Invalid Purchase Order ID' };
    const po = await purchaseService.receiveGoods(id, req.body, req.user.id, req.user.tenantId);
    res.status(200).json({ message: 'Goods received successfully', purchaseOrder: po });
  } catch (err) {
    next(err);
  }
};

export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: 'Invalid Purchase Order ID' };
    const po = await purchaseService.cancelPurchaseOrder(id, req.user.id, req.user.tenantId);
    res.status(200).json({ message: 'Purchase Order cancelled', purchaseOrder: po });
  } catch (err) {
    next(err);
  }
};
