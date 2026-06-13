import api from './axios';

export const getSalesOrders = async () => {
  const { data } = await api.get('/sales');
  return data;
};

export const getSalesOrderById = async (id) => {
  const { data } = await api.get(`/sales/${id}`);
  return data;
};

export const createSalesOrder = async (orderData) => {
  const { data } = await api.post('/sales', orderData);
  return data;
};

export const confirmSalesOrder = async (id) => {
  const { data } = await api.post(`/sales/${id}/confirm`);
  return data;
};

export const deliverSalesOrder = async (id, lineDeliveries) => {
  const { data } = await api.post(`/sales/${id}/deliver`, { lineDeliveries });
  return data;
};

export const cancelSalesOrder = async (id) => {
  const { data } = await api.post(`/sales/${id}/cancel`);
  return data;
};
