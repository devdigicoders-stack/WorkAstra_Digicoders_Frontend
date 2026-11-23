import api from "./axios";

export const createOrUpdateNda = async (formData) => {
    try {
        const res = await api.post(`/api/nda`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getAllNdas = async (companyId = "", manage = false) => {
    try {
        const params = new URLSearchParams();
        if (companyId) params.append("companyId", companyId);
        if (manage) params.append("manage", "true");
        const queryString = params.toString() ? `?${params.toString()}` : "";
        const res = await api.get(`/api/nda${queryString}`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const signNda = async (ndaId, payload) => {
    try {
        const body = typeof payload === "string" ? { signatureBase64: payload } : payload;
        const res = await api.post(`/api/nda/${ndaId}/sign`, body);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getNdaSignatures = async (ndaId) => {
    try {
        const res = await api.get(`/api/nda/${ndaId}/signatures`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Admin deletes an NDA
export const deleteNda = async (id) => {
    try {
        const res = await api.delete(`/api/nda/${id}`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getMySignatures = async () => {
    try {
        const res = await api.get(`/api/nda/my-signatures`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getClientNdaSignatures = async () => {
    try {
        const res = await api.get(`/api/nda/client/signatures`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getClientNdaTemplate = async () => {
    try {
        const res = await api.get(`/api/nda/client/template`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
