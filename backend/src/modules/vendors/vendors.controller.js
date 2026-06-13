import * as vendorService from "./vendors.service.js";

export const listVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getVendors(req.user.tenantId);
    res.status(200).json(vendors);
  } catch (err) {
    next(err);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body, req.user.id, req.user.tenantId);
    res.status(201).json({ message: "Vendor created successfully", vendor });
  } catch (err) {
    next(err);
  }
};

export const editVendor = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid vendor ID" };
    const vendor = await vendorService.updateVendor(id, req.body, req.user.id, req.user.tenantId);
    res.status(200).json({ message: "Vendor updated successfully", vendor });
  } catch (err) {
    next(err);
  }
};
