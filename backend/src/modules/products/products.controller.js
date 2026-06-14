import * as productService from "./products.service.js";

export const listProducts = async (req, res, next) => {
  try {
    const products = await productService.getProducts(req.user.tenantId, req.query);
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid product ID" };
    const product = await productService.getProductById(id, req.user.tenantId);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body, req.user.id, req.user.tenantId);
    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid product ID" };
    const product = await productService.updateProduct(id, req.body, req.user.id, req.user.tenantId);
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw { status: 400, message: "Invalid product ID" };
    const result = await productService.deleteProduct(id, req.user.id, req.user.tenantId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
