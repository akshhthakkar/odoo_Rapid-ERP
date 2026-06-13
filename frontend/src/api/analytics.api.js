import api from "./axios";

export const getDashboard = async () => {
  const { data } = await api.get("/analytics/dashboard");
  return data;
};

export const getSalesAnalytics = async (params = {}) => {
  const { data } = await api.get("/analytics/sales", { params });
  return data;
};

export const getPurchaseAnalytics = async (params = {}) => {
  const { data } = await api.get("/analytics/purchase", { params });
  return data;
};

export const getInventoryAnalytics = async () => {
  const { data } = await api.get("/analytics/inventory");
  return data;
};

export const getManufacturingAnalytics = async () => {
  const { data } = await api.get("/analytics/manufacturing");
  return data;
};

export const getVendorsAnalytics = async () => {
  const { data } = await api.get("/analytics/vendors");
  return data;
};

export const getAuditLogs = async (params = {}) => {
  const { data } = await api.get("/analytics/audit", { params });
  return data;
};

export const exportReport = async (params = {}) => {
  const response = await api.get("/analytics/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};
