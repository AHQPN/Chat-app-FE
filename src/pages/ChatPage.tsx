import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { conversationService } from '@/services/conversationService';
import { webSocketService } from '@/services/websocketService';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageView } from '@/components/chat/MessageView';
import { UserSidebar } from '@/components/chat/UserSidebar';
import { JoinChannelView } from '@/components/chat/JoinChannelView';
import { CreateChannelDialog } from '@/components/chat/CreateChannelDialog';
import { CreateDMDialog } from '@/components/chat/CreateDMDialog';
import type { Conversation } from '@/types';
import type { UserItem } from '@/services/userService';

export default function ChatPage() {
    const { user, logout } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isJoining, setIsJoining] = useState(false);

    // Dialog states
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isCreateDMOpen, setIsCreateDMOpen] = useState(false);

    // Refs to access latest values in WebSocket callbacks
    const selectedConversationRef = useRef<Conversation | null>(null);
    const userRef = useRef(user);

    // Keep refs updated
    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Fetch conversations for current user on mount & Connect WebSocket
    useEffect(() => {
        console.log('[ChatPage] EFFECT START - Fetching convo & Connecting WS');
        fetchConversations();

        // Connect WebSocket
        const token = localStorage.getItem('accessToken');
        console.log('[ChatPage] Token:', token ? 'Yes' : 'No');

        if (token) {
            // Register callback BEFORE connecting (or after, doesn't matter as long as it's set)
            webSocketService.setUserNotificationCallback((packet) => {
                console.log('[ChatPage] Notification Callback:', packet);
                if (packet.type === 'NEW_CONVERSATION' && packet.data) {
                    const newConversation = packet.data;
                    setConversations(prev => {
                        if (prev.some(c => c.id === newConversation.id)) return prev;
                        return [newConversation, ...prev];
                    });
                }
            });

            webSocketService.connect(token);
        }

        return () => {
            console.log('[ChatPage] Cleanup WS');
            webSocketService.unsubscribe('/user/queue/notifications', 'chatpage_notifs');
            webSocketService.disconnect();
        };
    }, []);

    // Subscribe to ALL conversations when the list changes
    const subscribedIdsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (conversations.length === 0) return;

        const currentIds = new Set(conversations.filter(c => c.isJoined !== false).map(c => c.id));
        const prevIds = subscribedIdsRef.current;

        // Unsubscribe from conversations we're no longer part of
        prevIds.forEach(id => {
            if (!currentIds.has(id)) {
                webSocketService.unsubscribe(`/topic/conversation/${id}`, 'chatpage');
                prevIds.delete(id);
            }
        });

        // Subscribe to new conversations (with listenerId 'chatpage')
        currentIds.forEach(id => {
            if (!prevIds.has(id)) {
                webSocketService.subscribe(`/topic/conversation/${id}`, 'chatpage', (packet: any) => {
                    handleGlobalMessage(id, packet);
                });
                prevIds.add(id);
            }
        });

        // Update ref (no state update to avoid re-render loop)
        subscribedIdsRef.current = prevIds;
    }, [conversations.map(c => c.id).join(',')]); // Only re-run when conversation IDs change

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            subscribedIdsRef.current.forEach(id => {
                webSocketService.unsubscribe(`/topic/conversation/${id}`, 'chatpage');
            });
            subscribedIdsRef.current.clear();
        };
    }, []);

    // Handle messages from ANY conversation (for sidebar updates)
    const handleGlobalMessage = (conversationId: number, packet: any) => {
        // Skip non-critical events for sidebar updates
        if (packet.type === 'TYPING' || packet.type === 'USER_STATUS') return;
        if (packet.type?.startsWith('REACTION_')) return;

        // Handle MEMBER_REMOVED - if current user is removed from a conversation
        if (packet.type === 'MEMBER_REMOVED') {
            const currentUserId = userRef.current?.id;
            if (packet.userId === currentUserId) {
                console.log('[ChatPage] Current user was removed from conversation:', conversationId);

                // Remove conversation from sidebar
                setConversations(prev => prev.filter(conv => conv.id !== conversationId));

                // If currently viewing this conversation, deselect it
                if (selectedConversationRef.current?.id === conversationId) {
                    setSelectedConversation(null);
                    // Could also show a toast/notification here
                }

                // Unsubscribe from this conversation's topic
                webSocketService.unsubscribe(`/topic/conversation/${conversationId}`, 'chatpage');
                webSocketService.unsubscribe(`/topic/conversation/${conversationId}`, 'messageview');
                subscribedIdsRef.current.delete(conversationId);
            }
            return;
        }

        // Check if this is a new message (has id and content)
        if (packet.id && packet.content !== undefined) {
            // Don't increment unseen count for own messages
            const isOwnMessage = packet.senderId === userRef.current?.id;

            setConversations(prev => prev.map(conv => {
                if (conv.id === conversationId) {
                    // Use ref to get latest selectedConversation
                    const isCurrentConversation = selectedConversationRef.current?.id === conversationId;

                    return {
                        ...conv,
                        lastMessage: packet.content,
                        lastMessageAt: packet.createdAt || Date.now(),
                        // Increment unseen count if not the selected conversation AND not own message
                        unseenCount: (!isCurrentConversation && !isOwnMessage)
                            ? (conv.unseenCount || 0) + 1
                            : conv.unseenCount
                    };
                }
                return conv;
            }));
        }
    };

    // Clear unseen count when selecting a conversation
    useEffect(() => {
        if (selectedConversation) {
            setConversations(prev => prev.map(conv =>
                conv.id === selectedConversation.id
                    ? { ...conv, unseenCount: 0 }
                    : conv
            ));
        }
    }, [selectedConversation?.id]);

    const fetchConversations = async () => {
        setIsLoadingConversations(true);
        try {
            // GET /conversations/user/me
            const data = await conversationService.getMyConversations();
            setConversations(data);
            if (data.length > 0 && !selectedConversation) {
                // Default select the first joined channel if available, or just the first one
                const joined = data.find(c => c.isJoined !== false);
                setSelectedConversation(joined || data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            setConversations([]);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
    };

    const handleJoinChannel = async (conversationId: number) => {
        setIsJoining(true);
        try {
            await conversationService.joinConversation(conversationId);

            // Update local state to reflect joined status
            const updatedConversations = conversations.map(c =>
                c.id === conversationId ? { ...c, isJoined: true } : c
            );
            setConversations(updatedConversations);

            // Update selected conversation as well
            if (selectedConversation && selectedConversation.id === conversationId) {
                setSelectedConversation({ ...selectedConversation, isJoined: true });
            }
        } catch (error) {
            console.error('Failed to join channel:', error);
        } finally {
            setIsJoining(false);
        }
    };

    // Tạo Channel mới
    // POST /conversations với { workspaceId: 5, name, type: 'CHANNEL', isPrivate, memberIds }
    const handleCreateChannel = async (name: string, isPrivate: boolean, memberIds: number[]) => {
        await conversationService.createConversation({
            workspaceId: 5,
            name,
            type: 'CHANNEL',
            isPrivate,
            memberIds: memberIds.length > 0 ? memberIds : undefined,
        });

        // Refresh conversations list sau khi tạo
        await fetchConversations();
    };

    // Tạo DM với user được chọn hoặc mở DM đã tồn tại
    // POST /conversations với { workspaceId, name, type: 'DM', isPrivate: true, memberIds: [userId] }
    // DM bắt buộc có memberIds với đúng 1 userId (tổng 2 người: creator + 1 member)
    const handleCreateDM = async (selectedUser: UserItem) => {
        // Kiểm tra xem DM với user này đã tồn tại chưa
        const existingDM = conversations.find(
            conv => conv.type === 'DM' && conv.name === selectedUser.fullName
        );

        if (existingDM) {
            // DM đã tồn tại - chỉ cần chọn nó
            setSelectedConversation(existingDM);
            return;
        }

        // Tạo DM mới
        await conversationService.createConversation({
            workspaceId: 5,
            name: selectedUser.fullName, // Tên DM = tên user
            type: 'DM',
            isPrivate: true,
            memberIds: [selectedUser.userId], // BẮT BUỘC: userId của người được nhắn tin
        });

        // Refresh conversations list sau khi tạo
        await fetchConversations();
    };

    return (
        <>
            <div className="h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
                {/* User Sidebar - Left */}
                <UserSidebar user={user} onLogout={logout} />

                {/* Conversation List - Middle */}
                <ConversationList
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={handleSelectConversation}
                    workspaceName="ChatApp"
                    isLoading={isLoadingConversations}
                    onCreateChannel={() => setIsCreateChannelOpen(true)}
                    onCreateDM={() => setIsCreateDMOpen(true)}
                    currentUser={user}
                />

                {/* Message View - Right */}
                {selectedConversation?.isJoined === false ? (
                    <JoinChannelView
                        conversation={selectedConversation}
                        onJoin={() => handleJoinChannel(selectedConversation.id)}
                        isJoining={isJoining}
                    />
                ) : (
                    <MessageView
                        conversation={selectedConversation}
                        currentUserId={user?.id}
                    />
                )}
            </div>

            {/* Create Channel Dialog */}
            <CreateChannelDialog
                open={isCreateChannelOpen}
                onOpenChange={setIsCreateChannelOpen}
                onCreateChannel={handleCreateChannel}
            />

            {/* Create DM Dialog */}
            <CreateDMDialog
                open={isCreateDMOpen}
                onOpenChange={setIsCreateDMOpen}
                onSelectUser={handleCreateDM}
            />
        </>
    );
}
