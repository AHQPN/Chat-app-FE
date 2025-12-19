import { useState, useEffect, useRef } from 'react';
import { messageService } from '@/services/messageService';
import { webSocketService } from '@/services/websocketService';
import { cn, getInitials, generateAvatarColor, formatDate } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Hash,
    Lock,
    Users,
    Pin,
    Settings,
    Send,
    Paperclip,
    Smile,
    MoreHorizontal,
    Reply,
    Loader2,
    MessageSquare,
    AtSign,
} from 'lucide-react';
import type { Conversation, Message } from '@/types';

interface MessageViewProps {
    conversation: Conversation | null;
    currentUserId?: number;
}

export function MessageView({ conversation, currentUserId }: MessageViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch messages when conversation changes
    useEffect(() => {
        if (!conversation) return;

        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const response = await messageService.getMessages(conversation.id);
                if (response.code === 1000 && response.data) {
                    // Reverse to show oldest first
                    setMessages(response.data.content.reverse());
                }
            } catch (error) {
                console.error('Failed to fetch messages:', error);
                setMessages([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();
    }, [conversation?.id]);

    // Subscribe to new messages via WebSocket
    useEffect(() => {
        if (!conversation) return;

        console.log('Subscribing to conversation:', conversation.id);
        const subscription = webSocketService.subscribe(
            `/topic/conversation/${conversation.id}`,
            (newMessage: Message) => {
                console.log('Received new message:', newMessage);
                setMessages((prev) => [...prev, newMessage]);
            }
        );

        return () => {
            console.log('Unsubscribing from conversation:', conversation.id);
            if (subscription) {
                subscription.unsubscribe();
            }
            webSocketService.unsubscribe(`/topic/conversation/${conversation.id}`);
        };
    }, [conversation?.id]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !conversation) return;

        setIsSending(true);
        try {
            webSocketService.sendMessage(conversation.id, messageInput.trim());
            setMessageInput('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/30 text-white/40">
                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                    <MessageSquare className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-white/60 mb-2">Chưa chọn cuộc trò chuyện</h3>
                <p className="text-sm">Chọn một channel hoặc DM để bắt đầu chat</p>
            </div>
        );
    }

    const isChannel = conversation.type === 'CHANNEL';

    return (
        <div className="flex-1 flex flex-col bg-slate-800/30 overflow-hidden">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-slate-900/30 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {isChannel ? (
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            {conversation.isPrivate ? (
                                <Lock className="w-4 h-4 text-white/70" />
                            ) : (
                                <Hash className="w-4 h-4 text-white/70" />
                            )}
                        </div>
                    ) : (
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={conversation.members?.[0]?.avatar} />
                            <AvatarFallback className={cn('text-white text-sm', generateAvatarColor(conversation.name))}>
                                {getInitials(conversation.name)}
                            </AvatarFallback>
                        </Avatar>
                    )}
                    <div>
                        <h3 className="text-white font-semibold text-sm">{conversation.name}</h3>
                        {isChannel && (
                            <p className="text-white/40 text-xs">
                                {conversation.members?.length || 0} thành viên
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-white/50 hover:text-white hover:bg-white/10">
                                    <Users className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Thành viên</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-white/50 hover:text-white hover:bg-white/10">
                                    <Pin className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tin nhắn đã ghim</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-white/50 hover:text-white hover:bg-white/10">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cài đặt</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 min-h-0" ref={scrollRef}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full py-12">
                        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mb-4">
                            {isChannel ? (
                                <Hash className="w-10 h-10 text-purple-400" />
                            ) : (
                                <MessageSquare className="w-10 h-10 text-purple-400" />
                            )}
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2">
                            Chào mừng đến với #{conversation.name}
                        </h3>
                        <p className="text-white/50 text-sm max-w-md">
                            Đây là khởi đầu của cuộc trò chuyện. Hãy gửi tin nhắn đầu tiên!
                        </p>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        {messages.map((message, index) => {
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;

                            return (
                                <MessageItem
                                    key={message.id}
                                    message={message}
                                    showAvatar={showAvatar}
                                    isOwn={message.senderId === currentUserId}
                                />
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/5 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="relative">
                    <div className="flex items-end gap-2 bg-white/5 rounded-xl p-2 border border-white/10 focus-within:border-purple-500/50 transition-colors">
                        <Button type="button" variant="ghost" size="icon" className="w-9 h-9 text-white/40 hover:text-white hover:bg-white/10 flex-shrink-0">
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <Input
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={`Nhắn tin đến #${conversation.name}`}
                            className="flex-1 border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Button type="button" variant="ghost" size="icon" className="w-9 h-9 text-white/40 hover:text-white hover:bg-white/10">
                                <AtSign className="w-5 h-5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="w-9 h-9 text-white/40 hover:text-white hover:bg-white/10">
                                <Smile className="w-5 h-5" />
                            </Button>
                            <Button
                                type="submit"
                                disabled={!messageInput.trim() || isSending}
                                className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Individual Message Item
function MessageItem({
    message,
    showAvatar,
    isOwn,
}: {
    message: Message;
    showAvatar: boolean;
    isOwn: boolean;
}) {
    // Group reactions by emoji
    const groupedReactions = message.reactions?.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                userNames: []
            };
        }
        acc[reaction.emoji].count++;
        acc[reaction.emoji].userNames.push(reaction.userName);
        return acc;
    }, {} as Record<string, { emoji: string; count: number; userNames: string[] }>);

    return (
        <div
            className={cn(
                'group flex gap-3',
                isOwn ? 'flex-row-reverse' : 'flex-row',
                showAvatar ? 'mt-4' : 'mt-1'
            )}
        >
            {/* Avatar or spacer */}
            <div className="w-8 flex-shrink-0 flex flex-col items-center">
                {showAvatar ? (
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={message.senderAvatar} />
                        <AvatarFallback className={cn('text-white text-xs', generateAvatarColor(message.senderName))}>
                            {getInitials(message.senderName)}
                        </AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="w-8" />
                )}
            </div>

            {/* Content Wrapper */}
            <div className={cn(
                "flex flex-col min-w-0 max-w-[75%]", // Chiều rộng 3/4 (75%)
                isOwn ? "items-end" : "items-start"
            )}>
                {showAvatar && (
                    <div className={cn("flex items-baseline gap-2 mb-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                        <span className={cn('font-semibold text-sm', isOwn ? 'text-purple-400' : 'text-white')}>
                            {message.senderName}
                        </span>
                        <span className="text-white/30 text-xs">{formatDate(message.createdAt)}</span>
                    </div>
                )}

                {/* Reply indicator */}
                {message.parentContent && (
                    <div className="flex items-center gap-2 mb-1 text-white/40 text-xs px-2">
                        <Reply className="w-3 h-3" />
                        <span className="truncate max-w-full">{message.parentContent}</span>
                    </div>
                )}

                {/* Message Bubble + Actions */}
                <div className={cn("relative group/msg flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
                    {/* Bubble */}
                    <div className={cn(
                        "rounded-2xl px-4 py-2 text-sm break-words shadow-sm",
                        isOwn
                            ? "bg-purple-600 text-white rounded-tr-sm"
                            : "bg-white/10 text-white/90 rounded-tl-sm"
                    )}>
                        {message.isDeleted ? (
                            <span className="italic opacity-50">Tin nhắn đã bị xóa</span>
                        ) : (
                            message.content
                        )}
                    </div>

                    {/* Actions (hover) */}
                    <div className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
                            <Smile className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
                            <Reply className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Reactions */}
                {groupedReactions && Object.values(groupedReactions).length > 0 && (
                    <div className={cn("flex items-center gap-1 mt-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}>
                        {Object.values(groupedReactions).map((reaction) => (
                            <TooltipProvider key={reaction.emoji}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-white/10 hover:bg-white/10 rounded-full text-xs transition-colors"
                                        >
                                            <span>{reaction.emoji}</span>
                                            <span className="text-white/60">{reaction.count}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {reaction.userNames.slice(0, 5).join(', ')}
                                        {reaction.userNames.length > 5 && ` và ${reaction.userNames.length - 5} người khác`}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
