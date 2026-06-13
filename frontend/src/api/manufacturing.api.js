import api from './axios';

export const getManufacturingOrders = async (params = {}) => {
  const { data } = await api.get('/manufacturing', { params });
  return data;
};

export const getManufacturingOrder = async (id) => {
  const { data } = await api.get(`/manufacturing/${id}`);
  return data;
};

export const createManufacturingOrder = async (moData) => {
  const { data } = await api.post('/manufacturing', moData);
  return data;
};

export const confirmManufacturingOrder = async (id) => {
  const { data } = await api.post(`/manufacturing/${id}/confirm`);
  return data;
};

export const startManufacturingOrder = async (id) => {
  const { data } = await api.post(`/manufacturing/${id}/start`);
  return data;
};

export const startWorkOrder = async (moId, woId) => {
  const { data } = await api.post(`/manufacturing/${moId}/work-orders/${woId}/start`);
  return data;
};

export const completeWorkOrder = async (moId, woId) => {
  const { data } = await api.post(`/manufacturing/${moId}/work-orders/${woId}/complete`);
  return data;
};

export const completeManufacturingOrder = async (id) => {
  const { data } = await api.post(`/manufacturing/${id}/complete`);
  return data;
};

export const cancelManufacturingOrder = async (id) => {
  const { data } = await api.post(`/manufacturing/${id}/cancel`);
  return data;
};
