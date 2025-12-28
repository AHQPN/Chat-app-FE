import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, Calendar } from 'lucide-react';
import { cn, getInitials, generateAvatarColor, formatDate, getAvatarUrl } from '@/lib/utils';
import { messageService } from '@/services/messageService';
import type { Message } from '@/types';

interface SearchMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: number;
    onSelectMessage: (messageId: number) => void;
}

export function SearchMessageDialog({
    open,
    onOpenChange,
    conversationId,
    onSelectMessage,
}: SearchMessageDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Debounce search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, conversationId]);

    const handleSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsLoading(true);
        try {
            const response = await messageService.searchMessages(conversationId, query, {
                page: 0,
                size: 50 // Limit to 50 results for now
            });

            if (response.code === 1000 && response.data) {
                setSearchResults(response.data.content);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
            setHasSearched(true);
        }
    };

    const handleSelectResult = (messageId: number) => {
        onSelectMessage(messageId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2 border-b border-white/10">
                    <DialogTitle className="flex items-center gap-2 text-lg font-medium">
                        <Search className="w-5 h-5 text-purple-400" />
                        Tìm kiếm tin nhắn
                    </DialogTitle>
                    <DialogDescription className="hidden">
                        Tìm kiếm tin nhắn trong cuộc trò chuyện này
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                            placeholder="Nhập từ khóa tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[400px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-white/40">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <span className="text-sm">Đang tìm kiếm...</span>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="flex flex-col">
                                {searchResults.map((message) => (
                                    <button
                                        key={message.id}
                                        onClick={() => handleSelectResult(message.id)}
                                        className="flex gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left group"
                                    >
                                        <Avatar className="w-10 h-10 flex-shrink-0 mt-1">
                                            <AvatarImage src={getAvatarUrl(message.senderAvatar)} />
                                            <AvatarFallback className={cn('text-xs text-white', generateAvatarColor(message.senderName))}>
                                                {getInitials(message.senderName)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-sm text-purple-300">
                                                    {message.senderName}
                                                </span>
                                                <span className="text-[10px] text-white/40 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(message.createdAt)}
                                                </span>
                                            </div>

                                            <p className="text-sm text-white/80 line-clamp-2 break-words">
                                                {message.content}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : hasSearched && searchQuery ? (
                            <div className="flex flex-col items-center justify-center py-10 text-white/40">
                                <Search className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm text-center px-6">
                                    Không tìm thấy kết quả nào cho "{searchQuery}"
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                <Search className="w-16 h-16 mb-4 opacity-10" />
                                <p className="text-sm">Nhập từ khóa để tìm kiếm trong cuộc trò chuyện</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="p-2 border-t border-white/10 text-center text-[10px] text-white/30">
                    {searchResults.length > 0 ? `Tìm thấy ${searchResults.length} kết quả` : 'Tìm kiếm nội dung tin nhắn cũ'}
                </div>
            </DialogContent>
        </Dialog>
    );
}
