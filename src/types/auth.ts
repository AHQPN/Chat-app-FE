// Auth Types

export interface LoginRequest {
    identifier: string;
    password: string;
}

export interface SignupRequest {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    role: string;
    userId: number;
}
