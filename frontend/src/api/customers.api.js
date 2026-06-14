import api from './axios';

export const getCustomers = async (params = {}) => {
  const { data } = await api.get('/customers', { params });
  return data;
};

export const createCustomer = async (customerData) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};
