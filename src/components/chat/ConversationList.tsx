import { useState } from 'react';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Hash, Lock, MessageCircle, Search, Plus, ChevronDown, Loader2, Users,
    UserPlus
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '@/types';

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    workspaceName?: string;
    isLoading: boolean;
    onCreateChannel?: () => void;
    onCreateDM?: () => void;
}

export function ConversationList({
    conversations,
    selectedConversation,
    onSelectConversation,
    workspaceName,
    isLoading,
    onCreateChannel,
    onCreateDM,
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const channels = conversations.filter((c) => c.type === 'CHANNEL');
    const directMessages = conversations.filter((c) => c.type === 'DM');

    // Filter conversations by search query
    const filteredChannels = channels.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredDMs = directMessages.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-64 min-w-64 h-full bg-slate-900/70 flex flex-col border-r border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg truncate">
                        {workspaceName || 'ChatApp'}
                    </h2>
                </div>
            </div>

            {/* Search */}
            <div className="p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50 h-9"
                    />
                </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-white/30" />
                        </div>
                        <p className="text-white/60 text-sm">Chưa có cuộc trò chuyện nào</p>
                        <p className="text-white/40 text-xs mt-1">
                            Nhấn + để tạo channel hoặc DM mới
                        </p>
                    </div>
                ) : (
                    <div className="px-2 pb-4">
                        {/* Channels Section */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between px-2 mb-1">
                                <div className="flex items-center gap-1 text-white/50 text-xs font-semibold uppercase tracking-wider">
                                    <ChevronDown className="w-3 h-3" />
                                    <span>Channels ({filteredChannels.length})</span>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={onCreateChannel}
                                                className="w-5 h-5 text-white/40 hover:text-white hover:bg-white/10"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Tạo channel mới</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {filteredChannels.length === 0 ? (
                                <p className="text-white/30 text-xs px-2 py-2">Không có channel nào</p>
                            ) : (
                                filteredChannels.map((conversation) => (
                                    <ConversationItem
                                        key={conversation.id}
                                        conversation={conversation}
                                        isSelected={selectedConversation?.id === conversation.id}
                                        onClick={() => onSelectConversation(conversation)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Direct Messages Section */}
                        <div>
                            <div className="flex items-center justify-between px-2 mb-1">
                                <div className="flex items-center gap-1 text-white/50 text-xs font-semibold uppercase tracking-wider">
                                    <ChevronDown className="w-3 h-3" />
                                    <span>Tin nhắn trực tiếp ({filteredDMs.length})</span>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={onCreateDM}
                                                className="w-5 h-5 text-white/40 hover:text-white hover:bg-white/10"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Tạo tin nhắn trực tiếp</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {filteredDMs.length === 0 ? (
                                <p className="text-white/30 text-xs px-2 py-2">Không có tin nhắn nào</p>
                            ) : (
                                filteredDMs.map((conversation) => (
                                    <ConversationItem
                                        key={conversation.id}
                                        conversation={conversation}
                                        isSelected={selectedConversation?.id === conversation.id}
                                        onClick={() => onSelectConversation(conversation)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </ScrollArea>

            <Separator className="bg-white/5" />

            {/* Footer - Stats */}
            <div className="p-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-medium truncate">
                            {conversations.length} cuộc trò chuyện
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Individual Conversation Item
function ConversationItem({
    conversation,
    isSelected,
    onClick,
}: {
    conversation: Conversation;
    isSelected: boolean;
    onClick: () => void;
}) {
    const isChannel = conversation.type === 'CHANNEL';
    const isPrivate = conversation.isPrivate;

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-150 group',
                isSelected
                    ? 'bg-purple-500/20 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
            )}
        >
            {isChannel ? (
                <div className="flex-shrink-0">
                    {isPrivate ? (
                        <Lock className="w-4 h-4" />
                    ) : (
                        <Hash className="w-4 h-4" />
                    )}
                </div>
            ) : (
                <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarImage src={conversation.members?.[0]?.avatar} />
                    <AvatarFallback className={cn('text-xs text-white', generateAvatarColor(conversation.name))}>
                        {getInitials(conversation.name)}
                    </AvatarFallback>
                </Avatar>
            )}
            <span className="flex-1 truncate text-sm text-left">{conversation.name}</span>
        </button>
    );
}
