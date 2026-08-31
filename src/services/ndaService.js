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
        let query = companyId ? `?companyId=${companyId}` : "?";
        if (manage) {
            query += query === "?" ? "manage=true" : "&manage=true";
        }
        const res = await api.get(`/api/nda${query}`);
        return res.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const signNda = async (ndaId, signatureBase64) => {
    try {
        const res = await api.post(`/api/nda/${ndaId}/sign`, { signatureBase64 });
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
