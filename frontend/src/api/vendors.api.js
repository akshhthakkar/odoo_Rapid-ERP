import api from './axios';

export const getVendors = async (params = {}) => {
  const { data } = await api.get('/vendors', { params });
  return data;
};

export const createVendor = async (vendorData) => {
  const { data } = await api.post('/vendors', vendorData);
  return data;
};
