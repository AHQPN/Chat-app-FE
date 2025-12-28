import { cn, getInitials, generateAvatarColor, formatDate, getFileName, formatFileSize, getFileIconColor, getAvatarUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Pin,
    Smile,
    Reply,
    FileIcon,
    AtSign,
    Info,
    MessageSquare,
    MoreVertical,
    Trash2,
    EyeOff,
    Pencil
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Message } from '@/types';

interface MessageItemProps {
    message: Message;
    showAvatar: boolean;
    isOwn: boolean;
    currentUserId?: number;
    emojis: { filename: string; url: string }[];
    onReply: (message: Message) => void;
    onReact: (emoji: string) => void;
    onPin: (id: number) => void;
    onUnpin: (id: number) => void;
    onThreadOpen?: (message: Message) => void;
    onRevoke: (id: number) => void;
    onDeleteForMe: (id: number) => void;
    onJumpToMessage?: (messageId: number) => void;
    onEdit?: (message: Message) => void;
}

export function MessageItem({
    message,
    showAvatar,
    isOwn,
    currentUserId,
    emojis,
    onReply,
    onReact,
    onPin,
    onUnpin,
    onThreadOpen,
    onRevoke,
    onDeleteForMe,
    onJumpToMessage,
    onEdit,
}: MessageItemProps) {
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
            id={`message-${message.id}`}
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
                        <AvatarImage src={getAvatarUrl(message.senderAvatar)} />
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
                "flex flex-col min-w-0 max-w-[75%]",
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

                {/* Reply indicator - Enhanced Quote Box */}
                {message.parentMessageId && (
                    <div
                        className={cn(
                            "flex items-start gap-2 mb-2 p-2 rounded-lg border-l-2 border-purple-500 bg-white/5 max-w-full cursor-pointer hover:bg-white/10 transition-colors",
                            isOwn ? "ml-auto" : "mr-auto"
                        )}
                        onClick={() => onJumpToMessage?.(message.parentMessageId!)}
                        title="Nhấn để xem tin nhắn gốc"
                    >
                        <Reply className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-purple-400 font-medium">Phản hồi tin nhắn</span>
                            <span className="text-xs text-white/60 truncate max-w-[200px]">
                                {message.parentContent || '[Đính kèm]'}
                            </span>
                        </div>
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
                            <span className="italic opacity-50 text-xs">Tin nhắn đã bị xóa ở phía bạn</span>
                        ) : message.status === 'REVOKED' ? (
                            <div className="flex items-center gap-2 italic text-white/50 select-none">
                                <Info className="w-4 h-4" />
                                <span>Tin nhắn đã được thu hồi</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {message.attachments?.map((attachment) => {
                                    const fileName = getFileName(attachment.fileUrl, attachment.fileType);
                                    const fileSize = formatFileSize(attachment.fileSize);
                                    const iconColor = getFileIconColor(attachment.fileType);

                                    return (
                                        <div key={attachment.id} className="max-w-sm">
                                            {attachment.fileType.startsWith('image/') ? (
                                                <img
                                                    src={attachment.fileUrl}
                                                    alt={fileName}
                                                    className="rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                                                />
                                            ) : (
                                                <a
                                                    href={attachment.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                                                >
                                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor.bg)}>
                                                        <FileIcon className={cn("w-5 h-5", iconColor.text)} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden min-w-0">
                                                        <span className="text-sm text-white/90 truncate" title={fileName}>
                                                            {fileName}
                                                        </span>
                                                        <span className="text-xs text-white/50">{fileSize}</span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                                {message.content && (
                                    <span>
                                        {message.mentions && message.mentions.length > 0
                                            ? (() => {
                                                // Create regex pattern for all mentions
                                                const mentionPatterns = message.mentions.map(m =>
                                                    `@${m.userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
                                                );
                                                const regex = new RegExp(`(${mentionPatterns.join('|')})`, 'g');
                                                const parts = message.content.split(regex);

                                                return parts.map((part, i) => {
                                                    const isMention = message.mentions?.some(m => part === `@${m.userName}`);
                                                    if (isMention) {
                                                        return (
                                                            <span
                                                                key={i}
                                                                className="inline-flex items-center gap-0.5 text-cyan-300 font-semibold bg-cyan-500/25 px-1.5 py-0.5 rounded-md mx-0.5 border border-cyan-400/30"
                                                            >
                                                                <AtSign className="w-3 h-3" />
                                                                {part.slice(1)}
                                                            </span>
                                                        );
                                                    }
                                                    return part;
                                                });
                                            })()
                                            : message.content
                                        }
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Thread & Actions Bar */}
                <div className="flex items-center gap-2 mt-1 px-1">
                    {/* Thread Info (if reply count > 0) */}
                    {(message.threadReplyCount && message.threadReplyCount > 0) ? (
                        <div
                            className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors",
                                isOwn && "ml-auto"
                            )}
                            onClick={() => onThreadOpen?.(message)}
                        >
                            <Avatar className="w-4 h-4">
                                {/* Assuming we might want to show avatars of repliers later, for now just generic dot or last replier */}
                                {/* <AvatarImage src={...} /> */}
                                <AvatarFallback className="bg-purple-500 text-white text-[8px]">
                                    {message.threadReplyCount}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-purple-400 font-medium">{message.threadReplyCount} trả lời</span>
                            <span className="text-xs text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">Xem thread ›</span>
                        </div>
                    ) : null}

                    {/* Actions (hover) */}
                    {/* Actions (hover) */}
                    {!message.isDeleted && message.status !== 'REVOKED' && (
                        <div className={cn(
                            "opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity px-2",
                            isOwn ? "mr-auto" : "ml-auto"
                        )}>
                            {/* Thread Button */}
                            {onThreadOpen && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
                                                onClick={() => onThreadOpen(message)}
                                            >
                                                <MessageSquare className="w-3 h-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Trả lời trong thread</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}

                            {/* Reply (Quote) */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
                                            onClick={() => onReply(message)}
                                        >
                                            <Reply className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Quote lại tin nhắn này</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {/* Reaction Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
                                        <Smile className="w-3 h-3" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-2 bg-slate-800 border-white/10 max-w-[340px]"
                                    side="top"
                                    align="center"
                                >
                                    <div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto w-[320px]">
                                        {emojis.length === 0 ? (
                                            <div className="w-full text-center py-4">
                                                <span className="text-white/40 text-xs">Loading emojis...</span>
                                            </div>
                                        ) : (
                                            emojis.map((item) => {
                                                // Check if user already reacted with this emoji
                                                const userReacted = message.reactions?.some(
                                                    r => r.userId === currentUserId && r.emoji === item.filename
                                                );
                                                return (
                                                    <button
                                                        key={item.filename}
                                                        onClick={() => onReact(item.filename)}
                                                        className={cn(
                                                            "w-9 h-9 flex-shrink-0 flex items-center justify-center rounded transition-colors",
                                                            userReacted
                                                                ? "bg-purple-500/30 ring-1 ring-purple-500"
                                                                : "hover:bg-white/10"
                                                        )}
                                                        title={item.filename.replace('.png', '')}
                                                    >
                                                        <img
                                                            src={item.url}
                                                            alt={item.filename}
                                                            className="w-6 h-6 object-contain"
                                                            loading="lazy"
                                                        />
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "w-6 h-6 rounded-full",
                                    message.isPinned
                                        ? "text-purple-400 hover:text-purple-300 hover:bg-purple-400/10"
                                        : "text-white/40 hover:text-white hover:bg-white/10"
                                )}
                                onClick={() => message.isPinned ? onUnpin(message.id) : onPin(message.id)}
                            >
                                <Pin className={cn("w-3 h-3", message.isPinned && "fill-current")} />
                            </Button>

                            {/* More Actions Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white min-w-[160px]">
                                    {isOwn && !message.isDeleted && onEdit && (
                                        <DropdownMenuItem
                                            onClick={() => onEdit(message)}
                                            className="hover:bg-white/10 cursor-pointer text-xs focus:bg-white/10 gap-2"
                                        >
                                            <Pencil className="w-3 h-3" />
                                            Chỉnh sửa tin nhắn
                                        </DropdownMenuItem>
                                    )}
                                    {isOwn && !message.isDeleted && (
                                        <DropdownMenuItem
                                            onClick={() => onRevoke(message.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-white/10 cursor-pointer text-xs focus:bg-white/10 focus:text-red-300 gap-2"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Thu hồi tin nhắn
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => onDeleteForMe(message.id)}
                                        className="hover:bg-white/10 cursor-pointer text-xs focus:bg-white/10 gap-2"
                                    >
                                        <EyeOff className="w-3 h-3" />
                                        Xóa ở phía tôi
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>

            {/* Pinned Indicator */}
            {message.isPinned && (
                <div className="flex items-center gap-1 text-[10px] text-purple-400 mt-1 font-medium">
                    <Pin className="w-3 h-3 fill-current" />
                    <span>Đã ghim</span>
                </div>
            )}

            {/* Reactions */}
            {!message.isDeleted && message.status !== 'REVOKED' && groupedReactions && Object.values(groupedReactions).length > 0 && (
                <div className={cn("flex items-center gap-1 mt-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}>
                    {Object.values(groupedReactions).map((reaction) => {
                        // Check if emoji is a URL or filename
                        const isUrl = reaction.emoji.startsWith('http');
                        const isFilename = reaction.emoji.endsWith('.png');

                        return (
                            <TooltipProvider key={reaction.emoji}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-white/10 hover:bg-white/10 rounded-full text-xs transition-colors"
                                            onClick={() => onReact(isFilename ? reaction.emoji : reaction.emoji)}
                                        >
                                            {isUrl ? (
                                                <img src={reaction.emoji} alt="emoji" className="w-4 h-4 object-contain" />
                                            ) : isFilename ? (
                                                // Find URL from emojis list if it's just filename
                                                <img
                                                    src={emojis.find(e => e.filename === reaction.emoji)?.url || reaction.emoji}
                                                    alt="emoji"
                                                    className="w-4 h-4 object-contain"
                                                />
                                            ) : (
                                                <span>{reaction.emoji}</span>
                                            )}
                                            <span className="text-white/60">{reaction.count}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {reaction.userNames.slice(0, 5).join(', ')}
                                        {reaction.userNames.length > 5 && ` và ${reaction.userNames.length - 5} người khác`}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
