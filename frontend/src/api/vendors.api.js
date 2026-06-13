import api from './axios';

export const getVendors = async () => {
  const { data } = await api.get('/vendors');
  return data;
};

export const createVendor = async (vendorData) => {
  const { data } = await api.post('/vendors', vendorData);
  return data;
};
