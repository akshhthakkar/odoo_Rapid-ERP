import * as bomService from "./bom.service.js";

export const listBoms = async (req, res, next) => {
  try {
    const boms = await bomService.getBoms(req.query, req.user.tenantId);
    res.status(200).json(boms);
  } catch (err) {
    next(err);
  }
};

export const getBom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Bill of Materials ID" };
    const bom = await bomService.getBomById(id, req.user.tenantId);
    res.status(200).json(bom);
  } catch (err) {
    next(err);
  }
};

export const getBomByProduct = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) throw { status: 400, message: "Invalid Product ID" };
    const bom = await bomService.getBomByProductId(productId, req.user.tenantId);
    res.status(200).json(bom);
  } catch (err) {
    next(err);
  }
};

export const createBom = async (req, res, next) => {
  try {
    const bom = await bomService.createBom(req.body, req.user.id, req.user.tenantId);
    res.status(201).json({ message: "Bill of Materials created successfully", bom });
  } catch (err) {
    next(err);
  }
};

export const updateBom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Bill of Materials ID" };
    const bom = await bomService.updateBom(id, req.body, req.user.id, req.user.tenantId);
    res.status(200).json({ message: "Bill of Materials updated successfully", bom });
  } catch (err) {
    next(err);
  }
};

export const deleteBom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid Bill of Materials ID" };
    const result = await bomService.softDeleteBom(id, req.user.id, req.user.tenantId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
