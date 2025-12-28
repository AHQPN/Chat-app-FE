import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { User, UserRole } from '@/types';

export default function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const accessToken = searchParams.get('accessToken');
                const refreshToken = searchParams.get('refreshToken');
                const userId = searchParams.get('userId');
                const role = searchParams.get('role');
                const fullName = searchParams.get('fullName');
                const avatar = searchParams.get('avatar');

                if (!accessToken || !refreshToken || !userId) {
                    setError('Missing authentication data. Please try again.');
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                // Store tokens
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);

                // Create user object
                const userData: User = {
                    id: parseInt(userId, 10),
                    fullName: fullName || 'User',
                    avatar: avatar || undefined,
                    role: (role as UserRole) || 'User',
                };

                localStorage.setItem('user', JSON.stringify(userData));

                // Redirect to chat
                window.location.href = '/chat';
            } catch (err) {
                console.error('Auth callback error:', err);
                setError('Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-center">
                    <div className="text-red-400 text-lg mb-2">{error}</div>
                    <div className="text-white/60 text-sm">Redirecting to login...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                <div className="text-white text-lg">Đang đăng nhập...</div>
                <div className="text-white/60 text-sm mt-2">Vui lòng chờ trong giây lát</div>
            </div>
        </div>
    );
}
