import api from './api';
import type { ApiResponse, Workspace, WorkspaceMemberRequest } from '@/types';

export const workspaceService = {
    // Get all workspaces for current user
    async getMyWorkspaces(): Promise<ApiResponse<Workspace[]>> {
        const response = await api.get<ApiResponse<Workspace[]>>('/workspaces/my-workspaces');
        return response.data;
    },

    // Create a new workspace (Admin only)
    async createWorkspace(name: string): Promise<ApiResponse<Workspace>> {
        const response = await api.post<ApiResponse<Workspace>>('/workspaces', { name });
        return response.data;
    },

    // Add member to workspace (Admin only)
    async addMember(data: WorkspaceMemberRequest): Promise<ApiResponse<void>> {
        const response = await api.post<ApiResponse<void>>('/workspaces/add-member', data);
        return response.data;
    },
};
