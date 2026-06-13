import api from './axios';

export const registerCompany = async (companyData) => {
  const { data } = await api.post('/company/register', companyData);
  return data;
};
