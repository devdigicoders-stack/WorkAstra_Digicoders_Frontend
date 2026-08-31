import api from "../../../services/axios";

export const updateUpiDetails = async (data) => {
    const response = await api.post(`/api/payments/upi-update`, data);
    return response.data;
};

export const getUpiDetails = async () => {
    const response = await api.get(`/api/payments/upi`);
    return response.data;
};

export const submitPayment = async (data) => {
    const response = await api.post(`/api/payments/submit`, data, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return response.data;
};

export const getMyPayments = async () => {
    const response = await api.get(`/api/payments/my`);
    return response.data;
};

export const getAllPayments = async () => {
    const response = await api.get(`/api/payments/all`);
    return response.data;
};

export const updatePaymentStatus = async (id, data) => {
    const response = await api.put(`/api/payments/${id}/status`, data);
    return response.data;
};
