import { Button } from '@/components/ui/button';
import { Hash, Users } from 'lucide-react';
import type { Conversation } from '@/types';

interface JoinChannelViewProps {
    conversation: Conversation;
    onJoin: () => void;
    isJoining: boolean;
}

export function JoinChannelView({ conversation, onJoin, isJoining }: JoinChannelViewProps) {
    return (
        <div className="flex-1 flex items-center justify-center bg-slate-900 text-white h-full">
            <div className="flex flex-col items-center max-w-md text-center p-8 bg-slate-800/50 rounded-2xl border border-white/10 shadow-2xl mx-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
                    <Hash className="w-10 h-10 text-white/40" />
                </div>

                <h2 className="text-2xl font-bold mb-2">#{conversation.name}</h2>
                <div className="flex items-center gap-2 text-white/50 mb-6 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{conversation.totalMembers || 0} thành viên</span>
                </div>

                <p className="text-white/70 mb-8 leading-relaxed">
                    Đây là một kênh công khai. Bạn cần tham gia để xem tin nhắn và bắt đầu trò chuyện cùng mọi người trong kênh này.
                </p>

                <Button
                    onClick={onJoin}
                    disabled={isJoining}
                    size="lg"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                    {isJoining ? 'Đang tham gia...' : 'Tham gia Channel'}
                </Button>
            </div>
        </div>
    );
}
