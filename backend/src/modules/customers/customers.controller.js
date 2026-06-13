import * as customerService from "./customers.service.js";

export const listCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getCustomers(req.user.tenantId);
    res.status(200).json(customers);
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body, req.user.id, req.user.tenantId);
    res.status(201).json({ message: "Customer created successfully", customer });
  } catch (err) {
    next(err);
  }
};
