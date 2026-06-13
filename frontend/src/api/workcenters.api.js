import api from './axios';

export const getWorkCenters = async () => {
  const { data } = await api.get('/workcenters');
  return data;
};

export const createWorkCenter = async (workCenterData) => {
  const { data } = await api.post('/workcenters', workCenterData);
  return data;
};
