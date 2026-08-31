import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const fetchUsers = async () => {
    const res = await api.get(ENDPOINTS.AUTH.ALL_USERS);
    return res.data;
};

export const fetchClients = async () => {
    const res = await api.get(ENDPOINTS.USER.GET_CLIENTS);
    return res.data;
};

export const createUser = async (data) => {
    const res = await api.post("/api/user/create", data);
    return res.data;
};

export const updateUser = async (data) => {
    const id = data instanceof FormData ? data.get('_id') : data._id;
    const res = await api.put(ENDPOINTS.USER.UPDATE_USER(id), data);
    return res.data;
};

export const toggleUserStatus = async (id) => {
    const res = await api.patch(ENDPOINTS.USER.TOGGLE_STATUS(id));
    return res.data;
};

export const deleteUser = async (id) => {
    const res = await api.delete(ENDPOINTS.USER.DELETE_USER(id));
    return res.data;
};

export const fetchProfile = async () => {
    const res = await api.get(ENDPOINTS.AUTH.PROFILE);
    return res.data;
};

export const verifyToken = async () => {
    const res = await api.get(ENDPOINTS.AUTH.VERIFY_TOKEN);
    return res.data;
};

// ─── Bank & UPI Details ───
export const getMyBankDetails = async () => {
    const res = await api.get("/api/user/bank-details");
    return res.data;
};

export const submitBankDetails = async (formData) => {
    const res = await api.put("/api/user/bank-details", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

export const approveBankDetails = async (userId) => {
    const res = await api.patch(`/api/user/${userId}/bank-details/approve`);
    return res.data;
};

export const rejectBankDetails = async (userId, reason) => {
    const res = await api.patch(`/api/user/${userId}/bank-details/reject`, { reason });
    return res.data;
};

export const adminEditBankDetails = async (userId, formData) => {
    const res = await api.put(`/api/user/${userId}/bank-details/admin-edit`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

