import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messageService } from '@/services/messageService';
import { conversationService } from '@/services/conversationService';
import { webSocketService } from '@/services/websocketService';
import { emojiService } from '@/services/emojiService';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { ChannelMembersDialog } from './ChannelMembersDialog';
import { SearchMessageDialog } from './SearchMessageDialog';

import { MessageItem } from './MessageItem'; // Import extracted MessageItem
import { ThreadView } from './ThreadView'; // Import ThreadView
import { PinnedMessageBar } from './PinnedMessageBar'; // Import PinnedMessageBar
import {
    Hash,
    Lock,
    Users,
    Pin,
    Settings,
    Send,
    Paperclip,
    Reply,
    Loader2,
    MessageSquare,
    X,
    FileIcon,
    Search,
} from 'lucide-react';
import { updateUserStatusCache, getUserStatusFromCache } from '../../store/userStatusStore';
import type { Conversation, Message, ConversationMember } from '@/types';

interface MessageViewProps {
    conversation: Conversation | null;
    currentUserId?: number;
}

export function MessageView({ conversation, currentUserId }: MessageViewProps) {
    const { user } = useAuth(); // Get current user info for message sender details
    const [messages, setMessages] = useState<Message[]>([]);
    // messageInput state removed - using uncontrolled input for performance
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [latestThreadReply, setLatestThreadReply] = useState<Message | null>(null);
    const [messageUpdate, setMessageUpdate] = useState<Message | null>(null);

    // Edit message state
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editContent, setEditContent] = useState('');

    // Pagination state for bidirectional infinite scroll
    const [minLoadedPage, setMinLoadedPage] = useState(0); // Oldest page loaded
    const [maxLoadedPage, setMaxLoadedPage] = useState(0); // Newest page loaded
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadingDirection, setLoadingDirection] = useState<'up' | 'down' | null>(null);
    const isPaginatingRef = useRef(false); // Ref to track pagination across async batching

    // Conversation detail with members for mention
    const [conversationDetail, setConversationDetail] = useState<Conversation | null>(null);
    const conversationDetailRef = useRef<Conversation | null>(null); // Ref to access latest detail in WS callback

    useEffect(() => {
        conversationDetailRef.current = conversationDetail;
    }, [conversationDetail]);

    // Typing users state
    const [typingUsers, setTypingUsers] = useState<Record<number, { userName: string; avatar?: string }>>({});
    const typingTimeoutRef = useRef<any>(null);
    const isTypingRef = useRef(false); // Track if we've already sent typing=true
    const lastTypingSentRef = useRef<number>(0); // Timestamp of last typing=true sent (for throttling)

    // Emoji list from API
    const [emojis, setEmojis] = useState<{ filename: string; url: string }[]>([]);

    // Mention states (currently not used with uncontrolled input)
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [suggestedMembers, setSuggestedMembers] = useState<ConversationMember[]>([]);
    const [mentionIndex, setMentionIndex] = useState<number>(-1); // Index of @ in input

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Channel Members Dialog state
    const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeThread, setActiveThread] = useState<Message | null>(null); // State for active thread
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll state refs - declared early so they can be reset in fetchMessages
    const isInitialLoad = useRef(true);
    const prevMessagesLength = useRef(0);

    // Load emojis on mount
    useEffect(() => {
        emojiService.getEmojisForPicker().then(setEmojis);
    }, []);

    // Fetch conversation detail (with members) when conversation changes
    useEffect(() => {
        if (!conversation) {
            setConversationDetail(null);
            return;
        }

        const fetchConversationDetail = async () => {
            try {
                const response = await conversationService.getConversationDetail(conversation.id);
                if (response.code === 1000 && response.data) {
                    const updatedData = { ...response.data };
                    if (updatedData.members) {
                        updatedData.members = updatedData.members.map(m => {
                            const cached = getUserStatusFromCache(m.userId);
                            if (cached) {
                                return { ...m, isOnline: cached.isOnline, lastActive: cached.lastActive };
                            }
                            return m;
                        });
                    }
                    setConversationDetail(updatedData);
                }
            } catch (error) {
                console.error('Failed to fetch conversation detail:', error);
                // Fallback to conversation prop if API fails
                setConversationDetail(conversation);
            }
        };

        fetchConversationDetail();
    }, [conversation?.id]);

    // Fetch messages when conversation changes
    useEffect(() => {
        if (!conversation) return;

        const fetchMessages = async () => {
            setIsLoading(true);
            // Reset pagination state
            setMinLoadedPage(0);
            setMaxLoadedPage(0);
            // Reset scroll state for new conversation
            isInitialLoad.current = true;
            prevMessagesLength.current = 0;
            // Clear typing users from previous conversation
            setTypingUsers({});

            try {
                const response = await messageService.getMessages(conversation.id, { page: 0, size: 20 });
                if (response.code === 1000 && response.data) {
                    // Reverse to show oldest first (page 0 contains newest messages)
                    const loadedMessages = response.data.content.reverse();
                    setMessages(loadedMessages);
                    setTotalPages(response.data.totalPages);
                    setMinLoadedPage(0);
                    setMaxLoadedPage(0);

                    // Mark last message as read
                    if (loadedMessages.length > 0) {
                        const lastMessageId = loadedMessages[loadedMessages.length - 1].id;
                        conversationService.setReadMessage(conversation.id, lastMessageId).catch(err => {
                            console.error('Failed to mark messages as read:', err);
                        });
                    }
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

    // Load older messages (scroll UP - higher page numbers = older messages)
    const loadOlderMessages = async (): Promise<boolean> => {
        if (!conversation || isLoadingMore || maxLoadedPage >= totalPages - 1) {
            return false; // No more older pages to load
        }

        const nextPage = maxLoadedPage + 1;
        isPaginatingRef.current = true; // Set ref before async operation
        setIsLoadingMore(true);
        setLoadingDirection('up');

        try {
            const response = await messageService.getMessages(conversation.id, { page: nextPage, size: 20 });
            if (response.code === 1000 && response.data && response.data.content.length > 0) {
                // Prepend older messages (reverse them first since API returns newest first)
                const olderMessages = response.data.content.reverse();
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueOlderMessages = olderMessages.filter(m => !existingIds.has(m.id));
                    return [...uniqueOlderMessages, ...prev];
                });
                setMaxLoadedPage(nextPage);
                return true;
            }
        } catch (error) {
            console.error('Failed to load older messages:', error);
        } finally {
            setIsLoadingMore(false);
            setLoadingDirection(null);
        }
        return false;
    };

    // Load newer messages (scroll DOWN - lower page numbers = newer messages)
    // This is used when navigating to an old message and then scrolling down
    // 
    // API pagination: page 0 = newest messages, higher pages = older messages
    // Within each page: messages are sorted newest-first (index 0 = newest in that page)
    // 
    // Our messages array: oldest first (beginning) to newest (end)
    // 
    // When loading newer messages (lower page number):
    // - The new page contains messages NEWER than what we have
    // - After reverse(), the page becomes oldest-first
    // - We append at the end so user can continue scrolling down chronologically
    const loadNewerMessages = async (): Promise<boolean> => {
        if (!conversation || isLoadingMore || minLoadedPage <= 0) {
            return false; // Already at newest page
        }

        const prevPage = minLoadedPage - 1;
        isPaginatingRef.current = true; // Set ref before async operation
        setIsLoadingMore(true);
        setLoadingDirection('down');

        try {
            const response = await messageService.getMessages(conversation.id, { page: prevPage, size: 20 });
            if (response.code === 1000 && response.data && response.data.content.length > 0) {
                // API returns newest-first, reverse to get oldest-first for chronological order
                const newerMessages = response.data.content.reverse();
                // Append at the end - these are chronologically after our current messages
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNewerMessages = newerMessages.filter(m => !existingIds.has(m.id));
                    return [...prev, ...uniqueNewerMessages];
                });
                setMinLoadedPage(prevPage);
                return true;
            }
        } catch (error) {
            console.error('Failed to load newer messages:', error);
        } finally {
            setIsLoadingMore(false);
            setLoadingDirection(null);
        }
        return false;
    };

    // Subscribe to new messages via WebSocket
    useEffect(() => {
        if (!conversation) return;

        const subscriptionId = Math.random().toString(36).substring(7);
        // console.log(...)

        webSocketService.subscribe(
            `/topic/conversation/${conversation.id}`,
            'messageview',
            (packet: any) => {
                // console.log(...)
                // console.log(...)

                // Handle User Status
                if (packet.type === 'USER_STATUS') {
                    const isOnline = packet.status === 'ONLINE';
                    updateUserStatusCache(packet.userId, isOnline, packet.lastActive);
                    setConversationDetail(prev => {
                        if (!prev || !prev.members) return prev;
                        return {
                            ...prev,
                            members: prev.members.map(m =>
                                m.userId === packet.userId
                                    ? { ...m, isOnline: packet.status === 'ONLINE', lastActive: packet.lastActive }
                                    : m
                            )
                        };
                    });
                    return;
                }

                // Handle Typing
                if (packet.type === 'TYPING') {
                    if (packet.userId === currentUserId) return; // Ignore own typing
                    // Only show typing for current conversation
                    if (packet.conversationId !== conversation.id) return;

                    setTypingUsers(prev => {
                        const newTyping = { ...prev };
                        if (packet.isTyping) {
                            newTyping[packet.userId] = {
                                userName: packet.userName,
                                avatar: packet.avatar
                            };
                        } else {
                            delete newTyping[packet.userId];
                        }
                        return newTyping;
                    });

                    // Auto remove typing status after 5s safety net
                    if (packet.isTyping) {
                        setTimeout(() => {
                            setTypingUsers(prev => {
                                const newTyping = { ...prev };
                                delete newTyping[packet.userId];
                                return newTyping;
                            });
                        }, 5000);
                    }
                    return;
                }

                // Handle Reaction Events
                if (packet.type === 'REACTION_ADDED' || packet.type === 'REACTION_UPDATED' || packet.type === 'REACTION_REMOVED') {
                    setMessageUpdate(packet); // Notify ThreadView for replies

                    // Update main messages list
                    setMessages((prevMessages) => {
                        return prevMessages.map((msg) => {
                            if (msg.id === packet.messageId) {
                                let newReactions = msg.reactions ? [...msg.reactions] : [];

                                if (packet.type === 'REACTION_ADDED') {
                                    newReactions.push({
                                        userId: packet.userId,
                                        userName: packet.userName,
                                        emoji: packet.emoji,
                                        reactedAt: packet.reactedAt
                                    });
                                } else if (packet.type === 'REACTION_UPDATED') {
                                    newReactions = newReactions.map(r =>
                                        r.userId === packet.userId
                                            ? { ...r, emoji: packet.emoji, reactedAt: packet.reactedAt } // Fixed logic
                                            : r
                                    );
                                } else if (packet.type === 'REACTION_REMOVED') {
                                    newReactions = newReactions.filter(r => r.userId !== packet.userId);
                                }

                                return { ...msg, reactions: newReactions };
                            }
                            return msg;
                        });
                    });

                    // Update active thread root message if needed
                    setActiveThread(prev => {
                        if (prev && prev.id === packet.messageId) {
                            let newReactions = prev.reactions ? [...prev.reactions] : [];
                            if (packet.type === 'REACTION_ADDED') {
                                newReactions.push({
                                    userId: packet.userId,
                                    userName: packet.userName,
                                    emoji: packet.emoji,
                                    reactedAt: packet.reactedAt
                                });
                            } else if (packet.type === 'REACTION_UPDATED') {
                                newReactions = newReactions.map(r =>
                                    r.userId === packet.userId
                                        ? { ...r, emoji: packet.emoji, reactedAt: packet.reactedAt }
                                        : r
                                );
                            } else if (packet.type === 'REACTION_REMOVED') {
                                newReactions = newReactions.filter(r => r.userId !== packet.userId);
                            }
                            return { ...prev, reactions: newReactions };
                        }
                        return prev;
                    });
                    return;
                }

                // Check if it's an update to an existing message (e.g. status change, pin, content update)
                const targetId = packet.id || packet.messageId;
                const currentConvoId = conversation.id;

                // If no targetId, skip
                if (!targetId) {
                    // console.log(...)
                    return;
                }

                // Log for debugging
                // console.log(...)

                // Handle REVOKED status explicitly
                if (packet.status === 'REVOKED') {
                    setMessageUpdate({ id: targetId, status: 'REVOKED', content: '' }); // Notify ThreadView (manual construct or packet)

                    setMessages((prevMessages) =>
                        prevMessages.map(m =>
                            m.id === targetId
                                ? { ...m, status: 'REVOKED' as const, content: '' }
                                : m
                        )
                    );

                    setActiveThread(prev => prev && prev.id === targetId
                        ? { ...prev, status: 'REVOKED' as const, content: '' }
                        : prev
                    );
                    return;
                }

                // Handle DELETED status 
                if (packet.status === 'DELETED' || packet.isDeleted === true) {
                    setMessageUpdate({ id: targetId, status: 'DELETED', isDeleted: true }); // Notify ThreadView

                    setMessages((prevMessages) =>
                        prevMessages.map(m =>
                            m.id === targetId
                                ? { ...m, status: 'DELETED' as const, isDeleted: true }
                                : m
                        )
                    );

                    setActiveThread(prev => prev && prev.id === targetId
                        ? { ...prev, status: 'DELETED' as const, isDeleted: true }
                        : prev
                    );
                    return;
                }

                // Logic Enrich if it's a new message
                let enrichedPacket = { ...packet };

                if (packet.conversationId == currentConvoId && !enrichedPacket.senderName) {
                    const senderId = enrichedPacket.senderId || enrichedPacket.userId;
                    if (senderId == currentUserId && user) {
                        enrichedPacket.senderName = user.fullName;
                        enrichedPacket.senderAvatar = user.avatar;
                    } else if (conversationDetailRef.current?.members) {
                        const sender = conversationDetailRef.current.members.find(m => m.userId == senderId);
                        if (sender) {
                            enrichedPacket.senderName = sender.fullName;
                            enrichedPacket.senderAvatar = sender.avatar;
                        }
                    }
                }

                // Update Thread View if this is a reply
                if (enrichedPacket.threadId && enrichedPacket.id) {
                    // console.log(...)
                    setLatestThreadReply(enrichedPacket);
                }

                setMessages((prevMessages) => {
                    // Check if message already exists (for update)
                    const existingIndex = prevMessages.findIndex(m => m.id === targetId);

                    if (existingIndex >= 0) {
                        // Update existing message (edit content, pin/unpin, etc.)
                        // console.log(...)
                        return prevMessages.map(m =>
                            m.id === targetId
                                ? { ...m, ...enrichedPacket }
                                : m
                        );
                    }

                    // It's a new message
                    if (packet.conversationId == currentConvoId) {
                        // If it's a thread reply, DO NOT add to main chat list
                        if (enrichedPacket.threadId) {
                            return prevMessages;
                        }

                        // Mark new message as read since we're viewing this conversation
                        conversationService.setReadMessage(currentConvoId, enrichedPacket.id).catch(err => {
                            console.error('Failed to mark new message as read:', err);
                        });

                        const newMessages = [...prevMessages, enrichedPacket];
                        // console.log(...)
                        return newMessages;
                    }

                    // console.log(...)
                    return prevMessages;
                });

            }
        );

        // Don't unsubscribe when switching conversations
        // ChatPage handles all subscriptions and only unsubscribes when user leaves a conversation
        // This just registers/updates the 'messageview' callback for the current conversation
    }, [conversation?.id]);

    // Scroll to bottom when new messages arrive (only for NEW messages via WebSocket, not pagination)

    useEffect(() => {
        // console.log(...)

        // Only scroll to bottom on:
        // 1. Initial load
        // 2. New WebSocket messages (not pagination loading)
        const wasPaginating = isPaginatingRef.current;
        const isNewMessageAtEnd = messages.length > prevMessagesLength.current && !wasPaginating;

        if (scrollRef.current && (isInitialLoad.current || isNewMessageAtEnd)) {
            // Use requestAnimationFrame to ensure DOM is fully rendered before scrolling
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
                    if (viewport) {
                        viewport.scrollTop = viewport.scrollHeight;
                    } else if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                });
            });
            isInitialLoad.current = false;
        }

        // Clear pagination flag after processing
        isPaginatingRef.current = false;
        prevMessagesLength.current = messages.length;
    }, [messages]);

    // Handle scroll for bidirectional infinite scroll
    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const scrollTop = target.scrollTop;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;
        const prevScrollHeight = scrollHeight;

        // Load older messages when scroll is near the TOP (within 100px)
        if (scrollTop < 100 && !isLoadingMore && maxLoadedPage < totalPages - 1) {
            const loaded = await loadOlderMessages();

            // Preserve scroll position after loading older messages
            if (loaded && scrollRef.current) {
                const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
                if (viewport) {
                    requestAnimationFrame(() => {
                        const newScrollHeight = viewport.scrollHeight;
                        viewport.scrollTop = newScrollHeight - prevScrollHeight + scrollTop;
                    });
                }
            }
        }

        // Load newer messages when scroll is near the BOTTOM (within 100px)
        if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore && minLoadedPage > 0) {
            await loadNewerMessages();
        }
    };

    // Jump to a specific message using getMessageContext API
    const handleJumpToMessage = async (messageId: number) => {
        // First, check if message is already loaded
        let element = document.getElementById(`message-${messageId}`);

        if (element) {
            // Message is loaded, scroll to it
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-purple-500/20');
            setTimeout(() => element?.classList.remove('bg-purple-500/20'), 2000);
            return;
        }

        // Message not loaded, use getMessageContext API to fetch the page containing it
        if (!conversation) return;

        setIsLoading(true);
        try {
            const response = await messageService.getMessageContext(messageId, 20);
            if (response.code === 1000 && response.data) {
                const pageData = response.data;
                const pageNumber = pageData.number; // Page containing the target message

                // Replace messages with the new context
                setMessages(pageData.content.reverse());
                setTotalPages(pageData.totalPages);
                setMinLoadedPage(pageNumber);
                setMaxLoadedPage(pageNumber);

                // Wait for React to render, then scroll to the message
                await new Promise(resolve => setTimeout(resolve, 100));
                element = document.getElementById(`message-${messageId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('bg-purple-500/20');
                    setTimeout(() => element?.classList.remove('bg-purple-500/20'), 2000);
                }
            }
        } catch (error) {
            console.error('Failed to get message context:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Note: handleInputChange removed - now using uncontrolled input with inline onChange for typing indicator

    const handleSelectMention = (member: ConversationMember) => {
        if (mentionIndex === -1) return;

        const input = inputRef.current as HTMLInputElement | null;
        if (!input) return;

        const currentValue = input.value;
        const before = currentValue.slice(0, mentionIndex);
        const queryLength = mentionQuery?.length || 0;
        const after = currentValue.slice(mentionIndex + 1 + queryLength);

        const mentionText = `@${member.fullName}`;
        const newValue = before + mentionText + ' ' + after;
        const newCursorPosition = before.length + mentionText.length + 1;

        // Update input value directly (uncontrolled)
        input.value = newValue;

        setMentionQuery(null);
        setSuggestedMembers([]);
        setMentionIndex(-1);

        // Focus input and set cursor position
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    };

    const handleRevokeMessage = async (messageId: number) => {
        if (!confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) return;
        try {
            const response = await messageService.revokeMessage(messageId);
            if (response.code === 1000) {
                // Wait for WS update
            }
        } catch (error) {
            console.error('Failed to revoke message:', error);
        }
    };

    const handleDeleteForMe = async (messageId: number): Promise<boolean> => {
        if (!confirm('Bạn có chắc chắn muốn xóa tin nhắn này ở phía bạn?')) return false;
        try {
            const response = await messageService.deleteMessageForMe(messageId);
            if (response.code === 1000) {
                setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
                if (activeThread?.id === messageId) setActiveThread(null);
                return true;
            }
        } catch (error) {
            console.error('Failed to delete message for me:', error);
        }
        return false;
    };

    const handleSendMessage = async (text: string, files: File[], threadId?: number, parentMessageIdOverride?: number) => {
        // console.log(...)
        if ((!text.trim() && files.length === 0) || !conversation) return;

        // Clear typing status
        webSocketService.sendTyping(conversation.id, false);
        isTypingRef.current = false;
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        setIsSending(true);
        try {
            let attachmentIds: number[] = [];
            if (files.length > 0) {
                setIsUploading(true);
                try {
                    const response = await messageService.uploadAttachments(files);
                    if (response.code === 1000 && response.data) {
                        attachmentIds = response.data;
                    } else {
                        throw new Error('Upload failed: ' + (response.message || 'Unknown error'));
                    }
                } catch (uploadError) {
                    console.error('Failed to upload attachments:', uploadError);
                    setIsUploading(false);
                    setIsSending(false);
                    alert('Không thể tải lên tệp đính kèm. Vui lòng thử lại.');
                    return;
                }
                setIsUploading(false);
            }

            // Extract mentioned user IDs for payload
            const memberIds = new Set<number>();
            if (conversationDetail?.members) {
                conversationDetail.members.forEach(member => {
                    if (text.includes(`@${member.fullName}`)) {
                        memberIds.add(member.userId);
                    }
                });
            }

            webSocketService.sendMessage(
                conversation.id,
                text.trim(),
                Array.from(memberIds),
                parentMessageIdOverride !== undefined ? parentMessageIdOverride : ((!threadId && replyingTo) ? replyingTo.id : undefined),
                attachmentIds,
                threadId
            );

            if (!threadId) {
                setSelectedFiles([]);
                setReplyingTo(null);
                setMentionQuery(null);
            }
            setIsSending(false);
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsUploading(false);
            setIsSending(false);
        }
    };

    // Group messages by date
    const groupedMessages = useMemo(() => {
        const groups: Record<string, Message[]> = {};
        messages.forEach(msg => {
            if (!msg || !msg.createdAt) return;
            const date = new Date(msg.createdAt).toDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    }, [messages]);

    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const inputValue = (inputRef.current as HTMLInputElement)?.value || '';
        handleSendMessage(inputValue, selectedFiles);
        // Clear input after sending
        if (inputRef.current) {
            (inputRef.current as HTMLInputElement).value = '';
        }
    };

    const handleReaction = (messageId: number, emoji: string) => {
        const message = messages.find(m => m.id === messageId);
        if (message) {
            const hasReacted = message.reactions?.some(r =>
                r.userId === currentUserId &&
                (r.emoji === emoji || r.emoji.endsWith(emoji))
            );
            if (hasReacted) webSocketService.unreaction(messageId);
            else webSocketService.reaction(messageId, emoji);
        } else {
            // Check active thread root
            if (activeThread && activeThread.id === messageId) {
                const hasReacted = activeThread.reactions?.some(r => r.userId === currentUserId && (r.emoji === emoji || r.emoji.endsWith(emoji)));
                if (hasReacted) webSocketService.unreaction(messageId);
                else webSocketService.reaction(messageId, emoji);
                return;
            }
            // Fallback for thread replies (handled optimistically by server or simple toggle)
            webSocketService.reaction(messageId, emoji);
        }
    };

    const handlePinMessage = async (id: number) => {
        if (!conversation) return;
        const isLimitReached = await messageService.checkPinLimit(conversation.id);
        if (isLimitReached) {
            alert('Đã đạt giới hạn số tin nhắn được ghim (tối đa 3).');
            return;
        }
        webSocketService.pinMessage(id);
    };

    const handleUnpinMessage = (id: number) => {
        webSocketService.unpinMessage(id);
    };

    // Handle opening edit dialog
    const handleEditMessage = (message: Message) => {
        setEditingMessage(message);
        setEditContent(message.content || '');
    };

    // Handle saving edited message
    const handleSaveEdit = async () => {
        if (!editingMessage || !editContent.trim()) return;

        try {
            await messageService.updateMessage(editingMessage.id, editContent.trim());
            // WebSocket notification will update the message in state
            setEditingMessage(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to update message:', error);
        }
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditContent('');
    };

    const isChannel = conversation?.type === 'CHANNEL';

    const otherMember = useMemo(() => {
        if (!conversationDetail?.members || isChannel || !conversation) return null;
        return conversationDetail.members.find(m => m.userId !== currentUserId);
    }, [conversationDetail, isChannel, currentUserId, conversation]);

    // Check if current user is admin of this channel
    const isChannelAdmin = useMemo(() => {
        if (!isChannel || !conversationDetail?.members || !currentUserId) return false;
        const currentMember = conversationDetail.members.find(m => m.userId === currentUserId);
        return currentMember?.role === 'ADMIN';
    }, [isChannel, conversationDetail, currentUserId]);

    // Handler to refresh conversation detail after member changes
    const handleMembersChange = async () => {
        if (!conversation) return;
        try {
            const response = await conversationService.getConversationDetail(conversation.id);
            if (response.code === 1000 && response.data) {
                setConversationDetail(response.data);
            }
        } catch (error) {
            console.error('Failed to refresh conversation detail:', error);
        }
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center text-white/40">
                Chọn một cuộc trò chuyện để bắt đầu
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-hidden">
                {/* Header */}
                <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
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
                            <div className="relative">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={conversation.members?.[0]?.avatar} />
                                    <AvatarFallback className={cn('text-white text-sm', generateAvatarColor(conversation.name))}>
                                        {getInitials(isChannel ? conversation.name : (otherMember?.fullName || conversation.name))}
                                    </AvatarFallback>
                                </Avatar>
                                {otherMember?.isOnline && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                                )}
                            </div>
                        )}
                        <div>
                            <h3 className="text-white font-semibold text-sm">
                                {isChannel ? conversation.name : (otherMember?.fullName || conversation.name)}
                            </h3>
                            {isChannel ? (
                                <p className="text-white/40 text-xs">
                                    {conversationDetail?.totalMembers ?? conversationDetail?.members?.length ?? 0} thành viên
                                </p>
                            ) : (
                                otherMember?.isOnline !== undefined && (
                                    <p className="text-white/40 text-xs">
                                        {otherMember.isOnline ? 'Online' : 'Offline'}
                                    </p>
                                )
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 text-white/50 hover:text-white hover:bg-white/10"
                                        onClick={() => setIsSearchOpen(true)}
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Tìm kiếm tin nhắn</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 text-white/50 hover:text-white hover:bg-white/10"
                                        onClick={() => setIsMembersDialogOpen(true)}
                                    >
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

                {/* Pinned Messages Bar */}
                <PinnedMessageBar
                    pinnedMessages={[...messages].filter(m => m.isPinned).reverse()}
                    onJump={handleJumpToMessage}
                    onUnpin={handleUnpinMessage}
                />

                {/* Messages Area */}
                <ScrollArea className="flex-1 px-4 min-h-0" ref={scrollRef} onScrollCapture={handleScroll}>
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
                            {/* Loading more indicator */}
                            {isLoadingMore && loadingDirection === 'up' && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin mr-2" />
                                    <span className="text-xs text-white/50">Đang tải thêm tin nhắn cũ...</span>
                                </div>
                            )}

                            {/* Load more button (if there are more pages) */}
                            {maxLoadedPage < totalPages - 1 && !isLoadingMore && (
                                <button
                                    onClick={() => loadOlderMessages()}
                                    className="w-full py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    ↑ Tải thêm tin nhắn cũ hơn
                                </button>
                            )}
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date}>
                                    <div className="relative flex items-center justify-center my-6">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-white/5"></span>
                                        </div>
                                        <span className="relative bg-slate-900 px-4 text-xs text-white/30 font-medium uppercase tracking-wider">
                                            {date}
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        {msgs.map((msg, index) => {
                                            const isOwn = msg.senderId === currentUserId;
                                            const showAvatar = !isOwn && (index === 0 || msgs[index - 1].senderId !== msg.senderId);
                                            return (
                                                <MessageItem
                                                    key={msg.id}
                                                    message={msg}
                                                    showAvatar={showAvatar}
                                                    isOwn={isOwn}
                                                    currentUserId={currentUserId}
                                                    emojis={emojis}
                                                    onReply={(m) => setReplyingTo(m)}
                                                    onReact={(emoji) => handleReaction(msg.id, emoji)}
                                                    onPin={handlePinMessage}
                                                    onUnpin={handleUnpinMessage}
                                                    onThreadOpen={(msg) => {
                                                        // console.log(...)
                                                        setActiveThread(msg);
                                                        setLatestThreadReply(null);
                                                    }}
                                                    onRevoke={handleRevokeMessage}
                                                    onDeleteForMe={handleDeleteForMe}
                                                    onJumpToMessage={handleJumpToMessage}
                                                    onEdit={handleEditMessage}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Loading newer messages indicator */}
                            {isLoadingMore && loadingDirection === 'down' && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin mr-2" />
                                    <span className="text-xs text-white/50">Đang tải thêm tin nhắn mới...</span>
                                </div>
                            )}

                            {/* Go to latest button (when viewing old messages) */}
                            {minLoadedPage > 0 && !isLoadingMore && (
                                <button
                                    onClick={async () => {
                                        // Reset to latest messages
                                        if (!conversation) return;
                                        setIsLoading(true);
                                        try {
                                            const response = await messageService.getMessages(conversation.id, { page: 0, size: 20 });
                                            if (response.code === 1000 && response.data) {
                                                setMessages(response.data.content.reverse());
                                                setTotalPages(response.data.totalPages);
                                                setMinLoadedPage(0);
                                                setMaxLoadedPage(0);
                                            }
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="w-full py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    ↓ Đi đến tin nhắn mới nhất
                                </button>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Typing Indicator */}
                {
                    Object.keys(typingUsers).length > 0 && (
                        <div className="mx-4 mt-1 px-4 py-1 flex items-center gap-2 text-xs text-white/50 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                            <span className="font-medium text-purple-300">
                                {Object.values(typingUsers).slice(0, 3).map(u => u.userName).join(', ')}
                                {Object.keys(typingUsers).length > 3 ? ` và ${Object.keys(typingUsers).length - 3} người khác` : ''}
                                {' '}đang nhập...
                            </span>
                        </div>
                    )
                }

                {/* Reply Banner */}
                {
                    replyingTo && (
                        <div className="mx-4 mt-2 px-4 py-2 bg-slate-800/80 border-t border-x border-white/5 rounded-t-lg flex items-center justify-between backdrop-blur-sm z-10 relative">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Reply className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs text-purple-400 font-medium">Đang trả lời {replyingTo.senderName}</span>
                                    <span className="text-xs text-white/50 truncate max-w-lg">
                                        {replyingTo.content || '[Attachment]'}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6 text-white/40 hover:text-white hover:bg-white/10"
                                onClick={() => setReplyingTo(null)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    )
                }

                {/* Pending Attachments */}
                {
                    selectedFiles.length > 0 && (
                        <div className="mx-4 mt-2 px-4 py-2 bg-slate-800/80 border-t border-x border-white/5 flex items-center gap-2 overflow-x-auto backdrop-blur-sm z-10 relative">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="relative group flex-shrink-0 w-20 h-20 bg-white/5 rounded-lg border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                                    {file.type.startsWith('image/') ? (
                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center p-2 text-center">
                                            <FileIcon className="w-8 h-8 text-white/40 mb-1" />
                                            <span className="text-[10px] text-white/60 truncate w-full px-1">{file.name}</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removeFile(index)}
                                        disabled={isUploading}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                }

                {/* Message Input */}
                <div className={cn("p-4 border-t border-white/5 flex-shrink-0 z-20 bg-slate-900/50 backdrop-blur-sm", replyingTo ? "pt-0 border-t-0" : "")}>
                    <form onSubmit={onFormSubmit} className="relative">
                        {mentionQuery !== null && suggestedMembers.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 w-64 p-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl shadow-black/50 max-h-60 overflow-y-auto z-[100]">
                                {suggestedMembers.map(member => (
                                    <button
                                        key={member.userId}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-md transition-colors text-left"
                                        onClick={() => handleSelectMention(member)}
                                    >
                                        <Avatar className="w-6 h-6">
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback className="text-[10px]">{getInitials(member.fullName)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm text-white">{member.fullName}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-end gap-2 rounded-xl p-2 border transition-all duration-200 bg-white/5 border-white/10 focus-within:border-purple-500/50">
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 text-white/40 hover:text-white hover:bg-white/10 flex-shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-5 h-5" />
                            </Button>

                            {/* Simple text input - UNCONTROLLED for better performance */}
                            <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                defaultValue=""
                                onChange={(e) => {
                                    const value = e.target.value;

                                    // Typing indicator - only sends WebSocket
                                    if (!conversation) return;

                                    if (typingTimeoutRef.current) {
                                        clearTimeout(typingTimeoutRef.current);
                                    }

                                    const now = Date.now();
                                    const THROTTLE_MS = 5000;

                                    if (!isTypingRef.current || (now - lastTypingSentRef.current >= THROTTLE_MS)) {
                                        isTypingRef.current = true;
                                        lastTypingSentRef.current = now;
                                        webSocketService.sendTyping(conversation.id, true);
                                    }

                                    typingTimeoutRef.current = setTimeout(() => {
                                        if (conversation) {
                                            webSocketService.sendTyping(conversation.id, false);
                                        }
                                        isTypingRef.current = false;
                                        typingTimeoutRef.current = null;
                                    }, 5000);

                                    // Mention detection - only update state when @ is present
                                    // Skip mention detection entirely if no @ in the text (most common case)
                                    if (!value.includes('@')) {
                                        // Only clear if there was a mention query
                                        if (mentionQuery !== null) {
                                            setMentionQuery(null);
                                            setSuggestedMembers([]);
                                        }
                                        return;
                                    }

                                    const cursorPosition = e.target.selectionStart || 0;
                                    const textBeforeCursor = value.slice(0, cursorPosition);
                                    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

                                    if (lastAtSymbol !== -1 && conversationDetail?.members) {
                                        const query = textBeforeCursor.slice(lastAtSymbol + 1);
                                        // Check if query is valid (no spaces/newlines, not too long)
                                        if (!query.includes('\n') && !query.includes(' ') && query.length < 30) {
                                            setMentionIndex(lastAtSymbol);
                                            setMentionQuery(query);

                                            // Filter members
                                            const filtered = conversationDetail.members.filter(m =>
                                                m.userId !== currentUserId &&
                                                m.fullName.toLowerCase().includes(query.toLowerCase()) &&
                                                !value.includes(`@${m.fullName}`)
                                            );
                                            setSuggestedMembers(filtered);
                                        } else if (mentionQuery !== null) {
                                            setMentionQuery(null);
                                            setSuggestedMembers([]);
                                        }
                                    } else if (mentionQuery !== null) {
                                        setMentionQuery(null);
                                        setSuggestedMembers([]);
                                    }
                                }}
                                onPaste={(e) => {
                                    // Handle paste images from clipboard
                                    const clipboardData = e.clipboardData;
                                    if (!clipboardData) return;

                                    const items = clipboardData.items;
                                    const pastedFiles: File[] = [];

                                    for (let i = 0; i < items.length; i++) {
                                        const item = items[i];
                                        if (item.type.startsWith('image/')) {
                                            const file = item.getAsFile();
                                            if (file) {
                                                // Create a named file from the blob
                                                const timestamp = Date.now();
                                                const ext = item.type.split('/')[1] || 'png';
                                                const namedFile = new File([file], `pasted_image_${timestamp}.${ext}`, { type: item.type });
                                                pastedFiles.push(namedFile);
                                            }
                                        }
                                    }

                                    if (pastedFiles.length > 0) {
                                        setSelectedFiles(prev => [...prev, ...pastedFiles]);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        const form = e.currentTarget.closest('form');
                                        if (form) form.requestSubmit();
                                    }
                                }}
                                placeholder={`Nhắn tin đến #${conversation.name}`}
                                className="flex-1 min-h-[36px] py-2 text-sm text-white bg-transparent outline-none placeholder:text-white/40"
                            />
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                    type="submit"
                                    disabled={isSending || isUploading}
                                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSending || isUploading ? (
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

            {/* Thread View Sidebar */}
            {activeThread && (
                <ThreadView
                    rootMessage={activeThread}
                    onClose={() => setActiveThread(null)}
                    currentUserId={currentUserId}
                    emojis={emojis}
                    onSendReply={async (content, threadId, files, parentMessageId) => {
                        await handleSendMessage(content, files, threadId, parentMessageId);
                    }}
                    onReact={handleReaction}
                    onPin={handlePinMessage}
                    onUnpin={handleUnpinMessage}
                    newReply={latestThreadReply}
                    messageUpdate={messageUpdate}
                    onRevoke={handleRevokeMessage}
                    onDeleteForMe={handleDeleteForMe}
                />
            )}

            {/* Channel Members Dialog */}
            {
                isChannel && conversation && conversationDetail && (
                    <ChannelMembersDialog
                        open={isMembersDialogOpen}
                        onOpenChange={setIsMembersDialogOpen}
                        conversationId={conversation.id}
                        conversationName={conversation.name}
                        members={conversationDetail.members || []}
                        currentUserId={currentUserId}
                        isAdmin={isChannelAdmin}
                        onMembersChange={handleMembersChange}
                    />
                )
            }

            <SearchMessageDialog
                open={isSearchOpen}
                onOpenChange={setIsSearchOpen}
                conversationId={conversation.id}
                onSelectMessage={handleJumpToMessage}
            />

            {/* Edit Message Dialog */}
            <Dialog open={!!editingMessage} onOpenChange={(open) => !open && handleCancelEdit()}>
                <DialogContent className="bg-slate-800 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Chỉnh sửa tin nhắn</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-24 bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="Nội dung tin nhắn..."
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim() || editContent.trim() === editingMessage?.content}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}




