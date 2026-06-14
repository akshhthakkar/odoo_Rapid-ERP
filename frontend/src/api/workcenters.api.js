import api from './axios';

export const getWorkCenters = async (params = {}) => {
  const { data } = await api.get('/workcenters', { params });
  return data;
};

export const createWorkCenter = async (workCenterData) => {
  const { data } = await api.post('/workcenters', workCenterData);
  return data;
};
