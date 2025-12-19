import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { conversationService } from '@/services/conversationService';
import { webSocketService } from '@/services/websocketService';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageView } from '@/components/chat/MessageView';
import { UserSidebar } from '@/components/chat/UserSidebar';
import { CreateChannelDialog } from '@/components/chat/CreateChannelDialog';
import { CreateDMDialog } from '@/components/chat/CreateDMDialog';
import type { Conversation } from '@/types';
import type { UserItem } from '@/services/userService';

export default function ChatPage() {
    const { user, logout } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);

    // Dialog states
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isCreateDMOpen, setIsCreateDMOpen] = useState(false);

    // Fetch conversations for current user on mount & Connect WebSocket
    useEffect(() => {
        fetchConversations();

        // Connect WebSocket
        const token = localStorage.getItem('accessToken');
        if (token) {
            webSocketService.connect(token);
        }

        return () => {
            webSocketService.disconnect();
        };
    }, []);

    const fetchConversations = async () => {
        setIsLoadingConversations(true);
        try {
            // GET /conversations/user/me
            const data = await conversationService.getMyConversations();
            setConversations(data);
            if (data.length > 0 && !selectedConversation) {
                setSelectedConversation(data[0]);
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

    // Tạo DM với user được chọn
    // POST /conversations với { workspaceId, name, type: 'DM', isPrivate: true, memberIds: [userId] }
    // DM bắt buộc có memberIds với đúng 1 userId (tổng 2 người: creator + 1 member)
    const handleCreateDM = async (selectedUser: UserItem) => {
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
                />

                {/* Message View - Right */}
                <MessageView
                    conversation={selectedConversation}
                    currentUserId={user?.id}
                />
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
