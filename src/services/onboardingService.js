import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const submitOnboarding = async (formData) => {
    // Note: formData should be an instance of FormData to handle file uploads
    const response = await api.post(ENDPOINTS.ONBOARDING.SUBMIT, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
};

export const getOnboardingRequests = async () => {
    const response = await api.get(ENDPOINTS.ONBOARDING.REQUESTS);
    return response.data;
};

export const approveOnboarding = async (id, basicSalary) => {
    const response = await api.post(ENDPOINTS.ONBOARDING.APPROVE(id), { basicSalary });
    return response.data;
};

export const rejectOnboarding = async (id) => {
    const response = await api.post(ENDPOINTS.ONBOARDING.REJECT(id));
    return response.data;
};
