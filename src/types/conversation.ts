// Conversation Types

export type ConversationType = 'DM' | 'CHANNEL';
export type ConversationRole = 'ADMIN' | 'MEMBER';

export interface Conversation {
    id: number;
    name: string;
    type: ConversationType;
    isPrivate: boolean;
    isJoined: boolean;
    totalMembers?: number;
    createdAt?: string;
    members?: ConversationMember[];
    // Fields for unread tracking and sidebar preview
    unseenCount?: number;
    lastMessage?: string;
    lastMessageAt?: number;
}

export interface ConversationMember {
    id: number;
    userId: number;
    conversationMemberId?: number; // ID used for setMemberRole API
    fullName: string;
    avatar?: string;
    role: ConversationRole;
    isOnline?: boolean;
    lastActive?: number;
}

export interface CreateConversationRequest {
    workspaceId: number;
    name: string;
    type: ConversationType;
    isPrivate: boolean;
    memberIds?: number[]; // Required for DM (exactly 1 userId), optional for CHANNEL
}
