import api from './axios';

export const resignationService = {
  submitResignation: async (data) => {
    const response = await api.post("/api/resignations", data);
    return response.data;
  },

  adminSubmitExit: async (data) => {
    const response = await api.post("/api/resignations/admin-exit", data);
    return response.data;
  },

  getMyResignation: async () => {
    const response = await api.get("/api/resignations/my-resignation");
    return response.data;
  },

  getAllResignations: async () => {
    const response = await api.get("/api/resignations");
    return response.data;
  },

  updateResignationStatus: async (id, data) => {
    const response = await api.patch(`/api/resignations/${id}/status`, data);
    return response.data;
  },

  processClearance: async (id) => {
    const response = await api.patch(`/api/resignations/${id}/clearance`);
    return response.data;
  },

  deleteResignation: async (id) => {
    const response = await api.delete(`/api/resignations/${id}`);
    return response.data;
  },

  restoreEmployee: async (id) => {
    const response = await api.patch(`/api/resignations/${id}/restore`);
    return response.data;
  },

  downloadExperienceLetter: async (id) => {
    const response = await api.get(`/api/resignations/${id}/experience-letter`, {
      responseType: 'blob'
    });
    return response;
  },

  downloadSalarySlips: async (id) => {
    const response = await api.get(`/api/resignations/${id}/salary-slips`, {
      responseType: 'blob'
    });
    return response;
  }
};
