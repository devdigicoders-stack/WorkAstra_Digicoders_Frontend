import api from "./axios";

export const saveFcmTokenToBackend = async (fcmToken) => {
    try {
        const response = await api.post("/api/user/save-fcm-token", { fcmToken });
        return response.data;
    } catch (error) {
        throw error.response?.data || new Error("Failed to save FCM token");
    }
};
