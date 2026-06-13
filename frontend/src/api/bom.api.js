import api from './axios';

export const getBoms = async (params = {}) => {
  const { data } = await api.get('/bom', { params });
  return data;
};

export const getBomById = async (id) => {
  const { data } = await api.get(`/bom/${id}`);
  return data;
};

export const getBomByProductId = async (productId) => {
  const { data } = await api.get(`/bom/product/${productId}`);
  return data;
};

export const createBom = async (bomData) => {
  const { data } = await api.post('/bom', bomData);
  return data;
};

export const updateBom = async (id, bomData) => {
  const { data } = await api.put(`/bom/${id}`, bomData);
  return data;
};

export const deleteBom = async (id) => {
  const { data } = await api.delete(`/bom/${id}`);
  return data;
};
