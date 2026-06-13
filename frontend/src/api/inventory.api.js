import api from './axios';

export const getInventoryDashboard = async () => {
  const { data } = await api.get('/inventory/dashboard');
  return data;
};

export const getStockLedger = async (params = {}) => {
  const { data } = await api.get('/inventory/ledger', { params });
  return data;
};

export const getInventoryValuation = async () => {
  const { data } = await api.get('/inventory/valuation');
  return data;
};

export const getWarehouses = async () => {
  const { data } = await api.get('/inventory/warehouses');
  return data;
};

export const createWarehouse = async (whData) => {
  const { data } = await api.post('/inventory/warehouses', whData);
  return data;
};

export const getStockTransfers = async () => {
  const { data } = await api.get('/inventory/transfers');
  return data;
};

export const createStockTransfer = async (transferData) => {
  const { data } = await api.post('/inventory/transfers', transferData);
  return data;
};

export const getInventoryAdjustments = async () => {
  const { data } = await api.get('/inventory/adjustments');
  return data;
};

export const createInventoryAdjustment = async (adjData) => {
  const { data } = await api.post('/inventory/adjustments', adjData);
  return data;
};

export const getProductInventoryDetails = async (productId) => {
  const { data } = await api.get(`/inventory/product/${productId}`);
  return data;
};

export const deactivateWarehouse = async (warehouseId) => {
  const { data } = await api.patch(`/inventory/warehouses/${warehouseId}/deactivate`);
  return data;
};
