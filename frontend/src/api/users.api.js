import api from './axios';

export const inviteUser = async (data) => {
  const response = await api.post('/users/invite', data);
  return response.data;
};

export const getCompanyUsers = async (params = {}) => {
  const { data } = await api.get('/users', { params });
  return data;
};

export const changePassword = async (data) => {
  const response = await api.post('/users/change-password', data);
  return response.data;
};
