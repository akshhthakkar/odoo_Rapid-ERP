import api from './axios';

export const getCustomers = async () => {
  const { data } = await api.get('/customers');
  return data;
};

export const createCustomer = async (customerData) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};
