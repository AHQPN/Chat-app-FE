import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, Lock, Loader2, X, Check, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { userService, type UserItem } from '@/services/userService';

interface CreateChannelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateChannel: (name: string, isPrivate: boolean, memberIds: number[]) => Promise<void>;
}

export function CreateChannelDialog({
    open,
    onOpenChange,
    onCreateChannel,
}: CreateChannelDialogProps) {
    const [name, setName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // User selection state
    const [users, setUsers] = useState<UserItem[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

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

    const toggleUserSelection = (user: UserItem) => {
        setSelectedUsers((prev) => {
            const isSelected = prev.some((u) => u.userId === user.userId);
            if (isSelected) {
                return prev.filter((u) => u.userId !== user.userId);
            } else {
                return [...prev, user];
            }
        });
    };

    const removeSelectedUser = (userId: number) => {
        setSelectedUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Vui lòng nhập tên channel');
            return;
        }

        if (name.length < 2) {
            setError('Tên channel phải có ít nhất 2 ký tự');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const memberIds = selectedUsers.map((u) => u.userId);
            await onCreateChannel(name.trim(), isPrivate, memberIds);
            // Reset form
            resetForm();
            onOpenChange(false);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            const message = error.response?.data?.message || 'Không thể tạo channel. Vui lòng thử lại.';
            setError(message);
            console.error('Create channel error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setIsPrivate(false);
        setError('');
        setSelectedUsers([]);
        setSearchQuery('');
        setCurrentPage(0);
    };

    const handleClose = () => {
        if (!isLoading) {
            resetForm();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {isPrivate ? (
                            <Lock className="w-5 h-5 text-amber-400" />
                        ) : (
                            <Hash className="w-5 h-5 text-purple-400" />
                        )}
                        Tạo Channel mới
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        Channel là nơi để nhóm trò chuyện về một chủ đề cụ thể
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col space-y-4">
                    {/* Channel Name */}
                    <div className="space-y-2">
                        <Label htmlFor="channelName" className="text-white/80">
                            Tên channel
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                                #
                            </span>
                            <Input
                                id="channelName"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                                    setError('');
                                }}
                                placeholder="tên-channel"
                                className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Private toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                isPrivate ? "bg-amber-500/20" : "bg-white/10"
                            )}>
                                {isPrivate ? (
                                    <Lock className="w-5 h-5 text-amber-400" />
                                ) : (
                                    <Hash className="w-5 h-5 text-white/60" />
                                )}
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">
                                    {isPrivate ? 'Private Channel' : 'Public Channel'}
                                </p>
                                <p className="text-white/50 text-xs">
                                    {isPrivate
                                        ? 'Chỉ những người được mời mới có thể tham gia'
                                        : 'Mọi người trong workspace đều có thể tham gia'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPrivate(!isPrivate)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                isPrivate ? "bg-purple-600" : "bg-white/20"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                isPrivate ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>

                    {/* Selected Members */}
                    {selectedUsers.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-white/80 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Thành viên đã chọn ({selectedUsers.length})
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map((user) => (
                                    <div
                                        key={user.userId}
                                        className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded-full"
                                    >
                                        <Avatar className="w-5 h-5">
                                            <AvatarImage src={user.avatar || undefined} />
                                            <AvatarFallback className={cn('text-[10px] text-white', generateAvatarColor(user.fullName))}>
                                                {getInitials(user.fullName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-white text-xs">{user.fullName}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSelectedUser(user.userId)}
                                            className="text-white/60 hover:text-white"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User Search & List */}
                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                        <Label className="text-white/80">Thêm thành viên (tùy chọn)</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm thành viên..."
                                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                            />
                        </div>

                        <ScrollArea className="flex-1 max-h-[200px] border border-white/10 rounded-lg">
                            {isLoadingUsers ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-6 text-white/40 text-sm">
                                    Không tìm thấy thành viên
                                </div>
                            ) : (
                                <div className="p-1">
                                    {filteredUsers.map((user) => {
                                        const isSelected = selectedUsers.some((u) => u.userId === user.userId);
                                        return (
                                            <button
                                                key={user.userId}
                                                type="button"
                                                onClick={() => toggleUserSelection(user)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-2 rounded-md transition-colors",
                                                    isSelected
                                                        ? "bg-purple-500/20"
                                                        : "hover:bg-white/5"
                                                )}
                                            >
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={user.avatar || undefined} />
                                                    <AvatarFallback className={cn('text-xs text-white', generateAvatarColor(user.fullName))}>
                                                        {getInitials(user.fullName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="flex-1 text-left text-white text-sm">
                                                    {user.fullName}
                                                </span>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-purple-400" />
                                                )}
                                            </button>
                                        );
                                    })}
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
                                    disabled={currentPage === 0}
                                    className="text-white/60 hover:text-white"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-white/60 text-xs">
                                    Trang {currentPage + 1} / {totalPages}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                                    disabled={currentPage === totalPages - 1}
                                    className="text-white/60 hover:text-white"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                'Tạo Channel'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
