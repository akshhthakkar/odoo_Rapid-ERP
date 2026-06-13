import api from './axios';

export const getPurchaseOrders = async (params = {}) => {
  const { data } = await api.get('/purchase', { params });
  return data;
};

export const getPurchaseOrder = async (id) => {
  const { data } = await api.get(`/purchase/${id}`);
  return data;
};

export const createPurchaseOrder = async (orderData) => {
  const { data } = await api.post('/purchase', orderData);
  return data;
};

export const confirmPurchaseOrder = async (id) => {
  const { data } = await api.post(`/purchase/${id}/confirm`);
  return data;
};

export const receiveGoods = async (id, payload) => {
  const { data } = await api.post(`/purchase/${id}/receive`, payload);
  return data;
};

export const cancelPurchaseOrder = async (id) => {
  const { data } = await api.post(`/purchase/${id}/cancel`);
  return data;
};
