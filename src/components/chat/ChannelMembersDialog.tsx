import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials, generateAvatarColor, getAvatarUrl } from '@/lib/utils';
import { conversationService } from '@/services/conversationService';
import { userService } from '@/services/userService';
import type { UserItem } from '@/services/userService';
import { Search, UserPlus, X, Shield, Loader2, Crown } from 'lucide-react';
import type { ConversationMember } from '@/types';

interface ChannelMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: number;
    conversationName: string;
    members: ConversationMember[];
    currentUserId?: number;
    isAdmin: boolean;
    // onMembersChange removed - WebSocket events now handle member updates
}

export function ChannelMembersDialog({
    open,
    onOpenChange,
    conversationId,
    conversationName,
    members,
    currentUserId,
    isAdmin,
}: ChannelMembersDialogProps) {
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get member IDs to filter out existing members from search (memoized to prevent infinite loops)
    const memberUserIds = useMemo(() => members.map(m => m.userId), [members]);

    // Search users when query changes
    useEffect(() => {
        if (!isAddingMode || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const searchUsers = async () => {
            setIsSearching(true);
            try {
                const results = await userService.searchUsers(searchQuery);
                // Filter out users already in the channel
                const filteredResults = results.filter(u => !memberUserIds.includes(u.userId));
                setSearchResults(filteredResults);
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, isAddingMode, memberUserIds]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setIsAddingMode(false);
            setSearchQuery('');
            setSearchResults([]);
            setError(null);
        }
    }, [open]);

    const handleAddMember = async (userId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await conversationService.addMembers(conversationId, [userId]);
            if (response.code === 1000) {
                // WebSocket will handle UI update via MEMBER_ADDED event
                setSearchQuery('');
                setSearchResults([]);
            } else {
                setError(response.message || 'Không thể thêm thành viên');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (userId === currentUserId) {
            setError('Bạn không thể tự xóa mình khỏi channel');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await conversationService.removeMembers(conversationId, [userId]);
            if (response.code === 1000) {
                // WebSocket will handle UI update via MEMBER_REMOVED event
            } else {
                setError(response.message || 'Không thể xóa thành viên');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetRole = async (member: ConversationMember, newRole: 'ADMIN' | 'MEMBER') => {
        if (member.userId === currentUserId) {
            setError('Bạn không thể thay đổi quyền của chính mình');
            return;
        }

        // Use conversationMemberId if available, otherwise fall back to id
        const memberId = member.conversationMemberId ?? member.id;

        setIsLoading(true);
        setError(null);
        try {
            await conversationService.setMemberRole(conversationId, memberId, newRole);
            // WebSocket will handle UI update via MEMBER_ROLE_UPDATED event
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        Thành viên của #{conversationName}
                    </DialogTitle>
                </DialogHeader>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {/* Add Member Section (Admin only) */}
                {isAdmin && (
                    <div className="space-y-3">
                        {isAddingMode ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <Input
                                        placeholder="Tìm kiếm người dùng..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40 hover:text-white"
                                        onClick={() => {
                                            setIsAddingMode(false);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Search Results */}
                                {isSearching ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <ScrollArea className="max-h-40">
                                        <div className="space-y-1">
                                            {searchResults.map((user) => (
                                                <button
                                                    key={user.userId}
                                                    onClick={() => handleAddMember(user.userId)}
                                                    disabled={isLoading}
                                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                >
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src={getAvatarUrl(user.avatar)} />
                                                        <AvatarFallback className={cn('text-white text-xs', generateAvatarColor(user.fullName))}>
                                                            {getInitials(user.fullName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 text-left">
                                                        <p className="text-sm font-medium text-white">{user.fullName}</p>
                                                    </div>
                                                    <UserPlus className="w-4 h-4 text-green-400" />
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : searchQuery.length >= 2 ? (
                                    <p className="text-center text-white/40 text-sm py-3">Không tìm thấy người dùng</p>
                                ) : null}
                            </div>
                        ) : (
                            <Button
                                onClick={() => setIsAddingMode(true)}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Thêm thành viên
                            </Button>
                        )}
                    </div>
                )}

                {/* Members List */}
                <div className="space-y-2">
                    <p className="text-sm text-white/60">{members.length} thành viên</p>
                    <ScrollArea className="max-h-64">
                        <div className="space-y-1">
                            {members.map((member) => (
                                <div
                                    key={member.userId}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                >
                                    <div className="relative">
                                        <Avatar className="w-9 h-9">
                                            <AvatarImage src={getAvatarUrl(member.avatar)} />
                                            <AvatarFallback className={cn('text-white text-sm', generateAvatarColor(member.fullName))}>
                                                {getInitials(member.fullName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {member.isOnline && (
                                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-white truncate">
                                                {member.fullName}
                                                {member.userId === currentUserId && (
                                                    <span className="text-white/40 ml-1">(bạn)</span>
                                                )}
                                            </p>

                                            {/* Role Badge - Clickable for admin to toggle roles */}
                                            {member.role === 'ADMIN' ? (
                                                isAdmin && member.userId !== currentUserId ? (
                                                    <button
                                                        onClick={() => handleSetRole(member, 'MEMBER')}
                                                        disabled={isLoading}
                                                        className="inline-flex items-center border border-amber-500/50 text-amber-400 text-xs px-1.5 py-0.5 rounded-full hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                                        title="Click để hạ xuống Member"
                                                    >
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Admin
                                                    </button>
                                                ) : (
                                                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs px-1.5 py-0">
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Admin
                                                    </Badge>
                                                )
                                            ) : (
                                                isAdmin && member.userId !== currentUserId && (
                                                    <button
                                                        onClick={() => handleSetRole(member, 'ADMIN')}
                                                        disabled={isLoading}
                                                        className="inline-flex items-center border border-white/20 text-white/50 text-xs px-1.5 py-0.5 rounded-full hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                                                        title="Click để nâng lên Admin"
                                                    >
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Nâng Admin
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Remove button (Admin only, can't remove self or other admins) */}
                                    {isAdmin && member.userId !== currentUserId && member.role !== 'ADMIN' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveMember(member.userId)}
                                            disabled={isLoading}
                                            className="w-7 h-7 text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
