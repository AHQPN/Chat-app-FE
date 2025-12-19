import api from './api';
import type { ApiResponse, Conversation, CreateConversationRequest } from '@/types';

export const conversationService = {
    // Get all conversations for current user (channels + DMs)
    // GET /conversations/user/me
    async getMyConversations(): Promise<Conversation[]> {
        const response = await api.get<Conversation[]>('/conversations/user/me');
        return response.data;
    },

    // Create a new conversation (Channel or DM)
    // POST /conversations
    // Body: { workspaceId, name, type, isPrivate }
    // Response: "Conversation created successfully" (string)
    async createConversation(data: CreateConversationRequest): Promise<string> {
        const response = await api.post<string>('/conversations', data);
        return response.data;
    },

    // Update conversation
    // PUT /conversations/{conversationId}
    async updateConversation(conversationId: number, data: { name?: string; isPrivate?: boolean }): Promise<string> {
        const response = await api.put<string>(`/conversations/${conversationId}`, data);
        return response.data;
    },

    // Add members to conversation
    // POST /conversations/{conversationId}/members
    async addMembers(conversationId: number, memberIds: number[]): Promise<ApiResponse<void>> {
        const response = await api.post<ApiResponse<void>>(`/conversations/${conversationId}/members`, { memberIds });
        return response.data;
    },

    // Set member role
    // POST /conversations/{conversationId}
    async setMemberRole(conversationId: number, conversationMemberId: number, conversationRole: 'ADMIN' | 'MEMBER'): Promise<string> {
        const response = await api.post<string>(`/conversations/${conversationId}`, {
            conversationMemberId,
            conversationRole,
        });
        return response.data;
    },
};
