import api from "./axios";

export const assetService = {
  getAssets: async () => {
    const response = await api.get("/api/assets");
    return response.data;
  },

  getMyAssets: async () => {
    const response = await api.get("/api/assets/my-assets");
    return response.data;
  },

  getAssetById: async (id) => {
    const response = await api.get(`/api/assets/${id}`);
    return response.data;
  },

  createAsset: async (data) => {
    const response = await api.post("/api/assets", data);
    return response.data;
  },

  updateAsset: async (id, data) => {
    const response = await api.put(`/api/assets/${id}`, data);
    return response.data;
  },

  deleteAsset: async (id) => {
    const response = await api.delete(`/api/assets/${id}`);
    return response.data;
  },

  assignAsset: async (id, userId) => {
    const response = await api.patch(`/api/assets/${id}/assign`, { userId });
    return response.data;
  },

  unassignAsset: async (id) => {
    const response = await api.patch(`/api/assets/${id}/unassign`);
    return response.data;
  },
};
