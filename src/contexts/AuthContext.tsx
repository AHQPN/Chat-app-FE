import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { User, LoginRequest, SignupRequest, UserRole } from '@/types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<{ success: boolean; message?: string }>;
    signup: (data: SignupRequest) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
    socialLogin: (type: 'GOOGLE' | 'FACEBOOK') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing auth on mount
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        if (storedUser && accessToken) {
            try {
                let userData = JSON.parse(storedUser);

                // Try to refresh user info from token if available
                const claims = parseJwt(accessToken);
                if (claims && (claims.fullName || claims.name || claims.avatar)) {
                    userData = {
                        ...userData,
                        fullName: claims.fullName || claims.name || userData.fullName,
                        avatar: claims.avatar || userData.avatar
                    };
                    // Update storage with fresh data
                    localStorage.setItem('user', JSON.stringify(userData));
                }

                setUser(userData);
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (data: LoginRequest): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await authService.login(data);

            if (response.code === 1000 && response.data) {
                const { accessToken, refreshToken, role, userId } = response.data;

                // Store tokens
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);

                // Parse token to get user info (fullName, avatar)
                const claims = parseJwt(accessToken);
                const fullName = claims?.fullName || claims?.name || data.identifier;
                const avatar = claims?.avatar || null;

                // Create user object
                const userData: User = {
                    id: userId,
                    fullName: fullName,
                    avatar: avatar,
                    role: role as UserRole,
                };

                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);

                return { success: true };
            }

            return { success: false, message: response.message || 'Đăng nhập thất bại' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            return {
                success: false,
                message: err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
            };
        }
    };

    const signup = async (data: SignupRequest): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await authService.signup(data);

            if (response.code === 1000) {
                return { success: true, message: response.message };
            }

            return { success: false, message: response.message || 'Đăng ký thất bại' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            return {
                success: false,
                message: err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
            };
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch {
            // Ignore errors on logout
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    const socialLogin = async (type: 'GOOGLE' | 'FACEBOOK') => {
        try {
            const response = await authService.getSocialLoginUrl(type);
            if (response.data?.authUrl) {
                window.location.href = response.data.authUrl;
            }
        } catch (error) {
            console.error('Social login error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isAdmin: user?.role === 'Admin',
                isLoading,
                login,
                signup,
                logout,
                socialLogin,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
