import api from './api';
import type { ApiResponse } from '@/types';

// Response từ GET /users/search
export interface SearchUserResult {
    userId: number;
    fullName: string;
    avatar?: string | null;
}

// Response từ GET /users/me
export interface UserProfile {
    userId: number;
    fullName: string;
    avatar?: string | null;
}

// User item trong danh sách
export interface UserItem {
    userId: number;
    fullName: string;
    avatar?: string | null;
}

// Paginated response từ GET /users
export interface PaginatedUsers {
    content: UserItem[];
    totalPages: number;
    totalElements: number;
    last: boolean;
    first: boolean;
    size: number;
    number: number; // current page (0-indexed)
    numberOfElements: number;
    empty: boolean;
}

export interface GetUsersParams {
    page?: number;
    size?: number;
    sort?: string;
}

export const userService = {
    // Lấy danh sách users có phân trang
    // GET /users?page=0&size=20&sort=fullName,asc
    async getUsers(params: GetUsersParams = {}): Promise<ApiResponse<PaginatedUsers>> {
        const response = await api.get<ApiResponse<PaginatedUsers>>('/users', {
            params: {
                page: params.page ?? 0,
                size: params.size ?? 20,
                sort: params.sort ?? 'fullName,asc',
            },
        });
        return response.data;
    },

    // Tìm kiếm users theo tên
    // GET /users/search?name=...
    async searchUsers(name: string): Promise<SearchUserResult[]> {
        const response = await api.get<SearchUserResult[]>('/users/search', {
            params: { name },
        });
        return response.data;
    },

    // Lấy profile của user hiện tại
    // GET /users/me
    async getMe(): Promise<UserProfile> {
        const response = await api.get<UserProfile>('/users/me');
        return response.data;
    },
};
