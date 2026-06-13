import * as vendorService from './vendors.service.js';

export const listVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getVendors();
    res.status(200).json(vendors);
  } catch (err) {
    next(err);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body, req.user.id);
    res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (err) {
    next(err);
  }
};
