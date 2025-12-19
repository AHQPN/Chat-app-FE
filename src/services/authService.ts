import api from './api';
import type { ApiResponse, AuthResponse, LoginRequest, SignupRequest } from '@/types';

export const authService = {
    // Login with email/phone and password
    async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
        return response.data;
    },

    // Register new user
    async signup(data: SignupRequest): Promise<ApiResponse<void>> {
        const response = await api.post<ApiResponse<void>>('/auth/signup', data);
        return response.data;
    },

    // Logout - invalidate tokens
    async logout(): Promise<ApiResponse<void>> {
        const response = await api.post<ApiResponse<void>>('/auth/logout');
        return response.data;
    },

    // Get social login URL
    async getSocialLoginUrl(loginType: 'GOOGLE' | 'FACEBOOK'): Promise<ApiResponse<{ authUrl: string }>> {
        const response = await api.get<ApiResponse<{ authUrl: string }>>('/auth/social-login', {
            params: { login_type: loginType },
        });
        return response.data;
    },

    // Resend verification email
    async resendVerification(email: string, type: string): Promise<string> {
        const response = await api.post('/auth/resend', null, {
            params: { email, type },
        });
        return response.data;
    },
};
