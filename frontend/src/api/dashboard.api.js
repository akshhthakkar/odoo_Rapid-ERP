import api from './axios';

/**
 * Fetch executive intelligence command center metrics.
 *
 * @param {object} params - Date filters: startDate, endDate, range
 */
export const getExecutiveDashboard = async (params = {}) => {
  const { data } = await api.get('/dashboard', { params });
  return data;
};
