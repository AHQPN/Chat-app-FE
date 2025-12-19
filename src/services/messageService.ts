import api from './api';
import type { ApiResponse, Message } from '@/types';

export interface GetMessagesParams {
    page?: number;
    size?: number;
}

export interface PaginatedMessages {
    content: Message[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export const messageService = {
    // Get messages for a conversation
    // GET /messages/conversation/{conversationId}?page=0&size=15
    async getMessages(conversationId: number, params: GetMessagesParams = {}): Promise<ApiResponse<PaginatedMessages>> {
        const response = await api.get<ApiResponse<PaginatedMessages>>(`/messages/conversation/${conversationId}`, {
            params: {
                page: params.page ?? 0,
                size: params.size ?? 20,
            },
        });
        return response.data;
    },
};
