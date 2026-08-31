import api from "../../../services/axios";

export const createComplaint = async (data) => {
    const response = await api.post(`/api/complaints/create`, data);
    return response.data;
};

export const getMyComplaints = async () => {
    const response = await api.get(`/api/complaints/my`);
    return response.data;
};

export const getAllComplaints = async () => {
    const response = await api.get(`/api/complaints/all`);
    return response.data;
};

export const updateComplaintStatus = async (id, data) => {
    const response = await api.put(`/api/complaints/${id}/status`, data);
    return response.data;
};

