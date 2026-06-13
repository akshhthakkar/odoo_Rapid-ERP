import api from "./axios";

export const getInventoryLedger = async (params = {}) => {
  const { data } = await api.get("/inventory/ledger", { params });
  return data;
};

export const exportInventoryLedger = async (params = {}) => {
  const response = await api.get("/inventory/ledger/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};
