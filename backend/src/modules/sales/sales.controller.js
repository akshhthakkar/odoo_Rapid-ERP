import * as salesService from "./sales.service.js";

export const listSalesOrders = async (req, res, next) => {
  try {
    const orders = await salesService.listSalesOrders(req.user.tenantId);
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

export const getSalesOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Sales Order ID" };
    const order = await salesService.getSalesOrderById(id, req.user.tenantId);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};

export const createSalesOrder = async (req, res, next) => {
  try {
    const order = await salesService.createSalesOrder(req.body, req.user.id, req.user.tenantId);
    res.status(201).json({ message: "Sales Order created in Draft state successfully", order });
  } catch (err) {
    next(err);
  }
};

export const confirmSalesOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Sales Order ID" };
    const result = await salesService.confirmSalesOrder(id, req.user.id, req.user.tenantId);
    res.status(200).json({
      message: "Sales Order confirmed and stock reserved successfully",
      order: result.order,
      triggeredProcurements: result.triggeredProcurements,
    });
  } catch (err) {
    next(err);
  }
};

export const deliverSalesOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Sales Order ID" };
    const order = await salesService.deliverSalesOrder(id, req.body.lineDeliveries, req.user.id, req.user.tenantId);
    res.status(200).json({ message: "Delivery recorded successfully", order });
  } catch (err) {
    next(err);
  }
};

export const cancelSalesOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Sales Order ID" };
    const order = await salesService.cancelSalesOrder(id, req.user.id, req.user.tenantId);
    res.status(200).json({ message: "Sales Order cancelled successfully", order });
  } catch (err) {
    next(err);
  }
};
