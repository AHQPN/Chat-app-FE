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

    // Get messages in a thread
    // GET /messages/{messageId}/thread
    async getThreadMessages(messageId: number, params: GetMessagesParams = {}): Promise<ApiResponse<PaginatedMessages>> {
        const response = await api.get<ApiResponse<PaginatedMessages>>(`/messages/${messageId}/thread`, {
            params: {
                page: params.page ?? 0,
                size: params.size ?? 20,
            },
        });
        return response.data;
    },

    // Upload attachments
    // POST /msginteractions/attachments
    async uploadAttachments(files: File[]): Promise<ApiResponse<number[]>> {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        const response = await api.post<ApiResponse<number[]>>('/msginteractions/attachments', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Check pin limit for conversation
    // GET /msginteractions/pin-limit/{conversationId}
    async checkPinLimit(conversationId: number): Promise<boolean> {
        try {
            const response = await api.get<ApiResponse<boolean>>(`/msginteractions/pin-limit/${conversationId}`);
            if (response.data.code === 1000) {
                return !!response.data.data; // true if limit reached, false otherwise
            }
            return true; // Assume limit reached on error to be safe
        } catch (error) {
            console.error('Failed to check pin limit:', error);
            return true; // Block pin on error
        }
    },

    // Revoke message (Soft delete)
    // DELETE /messages/{messageId}/revoke
    async revokeMessage(messageId: number): Promise<ApiResponse<void>> {
        const response = await api.delete<ApiResponse<void>>(`/messages/${messageId}/revoke`);
        return response.data;
    },

    // Delete message for me
    // DELETE /messages/{messageId}/delete-for-me
    async deleteMessageForMe(messageId: number): Promise<ApiResponse<void>> {
        const response = await api.delete<ApiResponse<void>>(`/messages/${messageId}/delete-for-me`);
        return response.data;
    },

    // Get message context (page containing a specific message)
    // GET /messages/{messageId}/context?size=20
    // Used for navigating to pinned messages or parent messages of replies
    async getMessageContext(messageId: number, size: number = 20): Promise<ApiResponse<PaginatedMessages>> {
        const response = await api.get<ApiResponse<PaginatedMessages>>(`/messages/${messageId}/context`, {
            params: { size },
        });
        return response.data;
    },

    // Update message content
    // PATCH /messages/{messageId}
    // After update, server sends WebSocket notification with full message info
    async updateMessage(messageId: number, content: string): Promise<ApiResponse<void>> {
        const response = await api.patch<ApiResponse<void>>(`/messages/${messageId}`, {
            message: content,
        });
        return response.data;
    },

    // Search messages in conversation
    async searchMessages(conversationId: number, keyword: string, params: GetMessagesParams = {}): Promise<ApiResponse<PaginatedMessages>> {
        const response = await api.get<ApiResponse<PaginatedMessages>>(`messages/conversation/${conversationId}/search`, {
            params: {
                keyword,
                page: params.page ?? 0,
                size: params.size ?? 20,
            },
        });
        return response.data;
    },
};
