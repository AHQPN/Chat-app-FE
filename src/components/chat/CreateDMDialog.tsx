import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { userService, type UserItem } from '@/services/userService';

interface CreateDMDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectUser: (user: UserItem) => Promise<void>;
}

export function CreateDMDialog({
    open,
    onOpenChange,
    onSelectUser,
}: CreateDMDialogProps) {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [error, setError] = useState('');

    // Fetch users on mount and when page changes
    useEffect(() => {
        if (open) {
            fetchUsers();
        }
    }, [open, currentPage]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await userService.getUsers({ page: currentPage, size: 10 });
            if (response.code === 1000 && response.data) {
                setUsers(response.data.content);
                setTotalPages(response.data.totalPages);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Filter users by search query (client-side)
    const filteredUsers = users.filter((user) =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectUser = async (user: UserItem) => {
        setSelectedUser(user);
        setIsCreating(true);
        setError('');

        try {
            await onSelectUser(user);
            // Reset and close
            resetForm();
            onOpenChange(false);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            const message = error.response?.data?.message || 'Không thể tạo tin nhắn. Vui lòng thử lại.';
            setError(message);
            console.error('Create DM error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const resetForm = () => {
        setSearchQuery('');
        setSelectedUser(null);
        setCurrentPage(0);
        setError('');
    };

    const handleClose = () => {
        if (!isCreating) {
            resetForm();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                        Tin nhắn trực tiếp
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        Chọn người bạn muốn nhắn tin
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo tên..."
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                            autoFocus
                        />
                    </div>

                    {/* User List */}
                    <ScrollArea className="flex-1 max-h-[350px] border border-white/10 rounded-lg">
                        {isLoadingUsers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Search className="w-12 h-12 text-white/20 mb-3" />
                                <p className="text-white/60 text-sm">Không tìm thấy người dùng</p>
                                <p className="text-white/40 text-xs mt-1">
                                    Thử tìm với tên khác
                                </p>
                            </div>
                        ) : (
                            <div className="p-1">
                                {filteredUsers.map((user) => (
                                    <button
                                        key={user.userId}
                                        onClick={() => handleSelectUser(user)}
                                        disabled={isCreating}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                                            selectedUser?.userId === user.userId && isCreating
                                                ? "bg-purple-500/30"
                                                : "hover:bg-white/5"
                                        )}
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={user.avatar || undefined} />
                                            <AvatarFallback className={cn('text-white font-medium', generateAvatarColor(user.fullName))}>
                                                {getInitials(user.fullName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <p className="text-white font-medium text-sm">
                                                {user.fullName}
                                            </p>
                                            <p className="text-white/40 text-xs">
                                                Click để bắt đầu trò chuyện
                                            </p>
                                        </div>
                                        {selectedUser?.userId === user.userId && isCreating && (
                                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                disabled={currentPage === 0 || isCreating}
                                className="text-white/60 hover:text-white"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Trước
                            </Button>
                            <span className="text-white/60 text-xs">
                                Trang {currentPage + 1} / {totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage === totalPages - 1 || isCreating}
                                className="text-white/60 hover:text-white"
                            >
                                Sau
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isCreating}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                        Đóng
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
