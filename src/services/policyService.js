import api from "./axios";

export const getPolicyByTitle = async (title, companyId) => {
    try {
        const query = companyId ? `?companyId=${companyId}` : "";
        const response = await api.get(`/api/policies/title/${title}${query}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch policy" };
    }
};

export const getAllPolicies = async (companyId) => {
    try {
        const query = companyId ? `?companyId=${companyId}` : "";
        const response = await api.get(`/api/policies${query}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch policies" };
    }
};

export const createOrUpdatePolicy = async (data) => {
    try {
        const response = await api.post("/api/policies", data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to save policy" };
    }
};

export const deletePolicy = async (id) => {
    try {
        const response = await api.delete(`/api/policies/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to delete policy" };
    }
};
