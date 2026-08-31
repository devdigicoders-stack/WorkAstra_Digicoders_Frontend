import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

export const createTicket = async (data) => {
    return await api.post(ENDPOINTS.TICKET.CREATE, data);
};

export const getTickets = async () => {
    return await api.get(ENDPOINTS.TICKET.GET_ALL);
};

export const getTicketById = async (id) => {
    return await api.get(ENDPOINTS.TICKET.GET_BY_ID(id));
};

export const updateTicketStatus = async (id, status) => {
    return await api.put(ENDPOINTS.TICKET.UPDATE_STATUS(id), { status });
};

export const replyToTicket = async (id, message) => {
    return await api.post(ENDPOINTS.TICKET.REPLY(id), { message });
};
