import { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, Smile, Loader2, Reply } from 'lucide-react';
import { messageService } from '@/services/messageService';
import { MessageItem } from './MessageItem'; // Reusing component
import type { Message } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ThreadViewProps {
    rootMessage: Message;
    onClose: () => void;
    currentUserId: number | undefined;
    emojis: { filename: string; url: string }[];
    onSendReply: (content: string, threadId: number, files: File[], parentMessageId?: number) => Promise<void>;
    onReact: (messageId: number, emoji: string) => void;
    onPin: (messageId: number) => void;
    onUnpin: (messageId: number) => void;
    newReply: Message | null;
    messageUpdate: any | null;
    onRevoke: (id: number) => void;
    onDeleteForMe: (id: number) => Promise<boolean>;
}

export function ThreadView({
    rootMessage,
    onClose,
    currentUserId,
    emojis,
    onSendReply,
    onReact,
    onPin,
    onUnpin,
    newReply,
    messageUpdate,
    onRevoke,
    onDeleteForMe
}: ThreadViewProps) {
    const [replies, setReplies] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReplyDeleteForMe = async (id: number) => {
        const deleted = await onDeleteForMe(id);
        if (deleted) {
            setReplies(prev => prev.filter(r => r.id !== id));
        }
    };

    // Initial fetch
    useEffect(() => {
        const fetchReplies = async () => {
            setIsLoading(true);
            try {
                const response = await messageService.getThreadMessages(rootMessage.id);
                if (response.code === 1000 && response.data) {
                    const sortedReplies = response.data.content.sort((a: Message, b: Message) =>
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                    setReplies(sortedReplies);
                }
            } catch (error) {
                console.error('Failed to fetch thread replies:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReplies();
    }, [rootMessage.id]);

    // Handle updates (reactions, etc.)
    useEffect(() => {
        if (!messageUpdate) return;

        // Handle Reaction Updates
        if (messageUpdate.type === 'REACTION_ADDED' || messageUpdate.type === 'REACTION_UPDATED' || messageUpdate.type === 'REACTION_REMOVED') {
            setReplies(prev => prev.map(msg => {
                if (msg.id === messageUpdate.messageId) {
                    let newReactions = msg.reactions ? [...msg.reactions] : [];
                    if (messageUpdate.type === 'REACTION_ADDED') {
                        newReactions.push({
                            userId: messageUpdate.userId,
                            userName: messageUpdate.userName,
                            emoji: messageUpdate.emoji,
                            reactedAt: messageUpdate.reactedAt
                        });
                    } else if (messageUpdate.type === 'REACTION_UPDATED') {
                        newReactions = newReactions.map(r => r.userId === messageUpdate.userId ? { ...r, emoji: messageUpdate.emoji, reactedAt: messageUpdate.reactedAt } : r);
                    } else if (messageUpdate.type === 'REACTION_REMOVED') {
                        newReactions = newReactions.filter(r => r.userId !== messageUpdate.userId);
                    }
                    return { ...msg, reactions: newReactions };
                }
                return msg;
            }));
        }
        // Handle General Message Updates (if full message object is passed with same ID)
        else if (messageUpdate.id) {
            setReplies(prev => prev.map(msg => msg.id === messageUpdate.id ? { ...msg, ...messageUpdate } : msg));
        }

    }, [messageUpdate]);

    // Handle new real-time reply
    useEffect(() => {
        if (newReply && newReply.threadId === rootMessage.id) {
            setReplies(prev => {
                // Prevent duplicate
                if (prev.some(m => m.id === newReply.id)) return prev;
                return [...prev, newReply];
            });
        }
    }, [newReply, rootMessage.id]);

    // Scroll to bottom on new reply
    useEffect(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [replies]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((!inputValue.trim() && selectedFiles.length === 0) || isSending) return;
        setIsSending(true);
        try {
            await onSendReply(inputValue, rootMessage.id, selectedFiles, replyingTo?.id);
            setInputValue('');
            setSelectedFiles([]);
            setReplyingTo(null);
        } catch (error) {
            console.error('Failed to send reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-white/10 w-[400px] flex-shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Thread</h3>
                    <span className="text-xs text-white/50">#{rootMessage.id}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 text-white/60 hover:text-white">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full" ref={scrollRef}>
                    <div className="p-4 space-y-6">
                        {/* Root Message */}
                        <div className="mb-6 pb-6 border-b border-white/10">
                            <MessageItem
                                key={rootMessage.id}
                                message={rootMessage}
                                showAvatar={true}
                                isOwn={rootMessage.senderId === currentUserId}
                                currentUserId={currentUserId}
                                emojis={emojis}
                                onReply={() => { }} // Disable reply to root inside thread view for now (or make it quote)
                                onReact={(emoji) => onReact(rootMessage.id, emoji)}
                                onPin={onPin}
                                onUnpin={onUnpin}
                                onRevoke={onRevoke}
                                onDeleteForMe={onDeleteForMe}
                            // Hide thread button on root message inside thread view
                            />
                        </div>

                        {/* Replies Separator */}
                        <div className="relative flex items-center justify-center mb-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <span className="relative bg-slate-900 px-2 text-xs text-white/40">
                                {replies.length} trả lời
                            </span>
                        </div>

                        {/* Replies List */}
                        {isLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {replies.map((reply) => (
                                    <MessageItem
                                        key={reply.id}
                                        message={reply}
                                        showAvatar={true} // Always show avatar in thread
                                        isOwn={reply.senderId === currentUserId}
                                        currentUserId={currentUserId}
                                        emojis={emojis}
                                        onReply={(msg) => setReplyingTo(msg)}
                                        onReact={(emoji) => onReact(reply.id, emoji)}
                                        onPin={onPin}
                                        onUnpin={onUnpin}
                                        onThreadOpen={undefined}
                                        onRevoke={onRevoke}
                                        onDeleteForMe={handleReplyDeleteForMe}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-slate-800/30">
                <div className="bg-white/5 rounded-lg border border-white/10 p-2 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
                    {/* Reply Preview */}
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-purple-500/10 border-l-2 border-purple-500 rounded p-2 mb-2">
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs text-purple-400 font-medium flex items-center gap-1">
                                    <Reply className="w-3 h-3" />
                                    Đang trả lời {replyingTo.senderName}
                                </span>
                                <span className="text-xs text-white/60 truncate">{replyingTo.content || '[File đính kèm]'}</span>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* File Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="relative group bg-white/10 rounded p-1 pr-6 flex items-center">
                                    <span className="text-xs text-white truncate max-w-[150px]">{file.name}</span>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="absolute right-1 top-1 text-white/50 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />

                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Trả lời trong thread..."
                        className="bg-transparent border-none text-white placeholder:text-white/30 focus-visible:ring-0 p-0 h-auto min-h-[40px]"
                        disabled={isSending}
                    />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-white/40 hover:text-white">
                                <Smile className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-white/40 hover:text-white"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button
                            onClick={handleSend}
                            disabled={(!inputValue.trim() && selectedFiles.length === 0) || isSending}
                            size="sm"
                            className={cn(
                                "bg-purple-600 hover:bg-purple-500 text-white",
                                ((!inputValue.trim() && selectedFiles.length === 0) || isSending) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
