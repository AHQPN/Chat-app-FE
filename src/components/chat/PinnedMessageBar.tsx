import { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X, FileIcon } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Message } from '@/types';
import { Button } from '@/components/ui/button';

interface PinnedMessageBarProps {
    pinnedMessages: Message[];
    onJump: (messageId: number) => void;
    onUnpin: (messageId: number) => void;
}

export function PinnedMessageBar({ pinnedMessages, onJump, onUnpin }: PinnedMessageBarProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (pinnedMessages.length === 0) return null;

    // We want to show the latest pinned message (which is usually the last one in the list if sorted by time)
    // Or we can just show the customized header.
    // Let's show the summary header.

    return (
        <div className="flex flex-col border-b border-white/10 bg-slate-900/95 backdrop-blur z-20 transition-all duration-200">
            {/* Header / Summary Bar */}
            <div
                className={cn(
                    "flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors",
                    isOpen && "bg-white/5"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Pin className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-purple-400">
                            {pinnedMessages.length} tin nhắn đã ghim
                        </span>
                        {!isOpen && (
                            <span className="text-xs text-white/50 truncate">
                                Nhấn để xem danh sách
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-white/40 hover:text-white"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* List View */}
            {isOpen && (
                <div className="max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                    {pinnedMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className="group flex gap-3 px-4 py-3 hover:bg-white/5 border-t border-white/5 cursor-pointer relative"
                            onClick={() => onJump(msg.id)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-semibold text-xs text-white/90">{msg.senderName}</span>
                                    <span className="text-[10px] text-white/40">{formatDate(msg.createdAt)}</span>
                                </div>
                                <div className="text-sm text-white/70 line-clamp-2">
                                    {msg.content || (
                                        <span className="flex items-center gap-1 italic text-white/40">
                                            <FileIcon className="w-3 h-3" />
                                            Đính kèm
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Unpin Action */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 h-6 w-6 text-white/40 hover:text-red-400 hover:bg-red-400/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUnpin(msg.id);
                                }}
                                title="Bỏ ghim"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
