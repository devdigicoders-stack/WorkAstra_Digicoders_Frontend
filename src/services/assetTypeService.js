import api from './axios';

export const assetTypeService = {
    getAssetTypes: async () => {
        const response = await api.get('/api/asset-types');
        return response.data;
    },

    createAssetType: async (data) => {
        const response = await api.post('/api/asset-types', data);
        return response.data;
    },

    updateAssetType: async (id, data) => {
        const response = await api.put(`/api/asset-types/${id}`, data);
        return response.data;
    },

    deleteAssetType: async (id) => {
        const response = await api.delete(`/api/asset-types/${id}`);
        return response.data;
    }
};
