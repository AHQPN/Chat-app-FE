// API Response Types
export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data?: T;
}

// Auth Types
export interface LoginRequest {
    identifier: string;
    password: string;
}

export interface SignupRequest {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    role: string;
    userId: number;
}

// User Types
export type UserRole = 'Admin' | 'User';

export interface User {
    id: number;
    fullName: string;
    email?: string;
    phoneNumber?: string;
    avatar?: string;
    role: UserRole;
}

// Workspace Types
export interface Workspace {
    id: number;
    name: string;
    createdAt?: string;
}

export interface WorkspaceMemberRequest {
    workspaceId: number;
    newMemberId: number;
    role: 'ADMIN' | 'MEMBER' | 'GUEST';
}

// Conversation Types
export type ConversationType = 'DM' | 'CHANNEL';
export type ConversationRole = 'ADMIN' | 'MEMBER';

// Response từ GET /conversations/user/me
export interface Conversation {
    id: number;
    name: string;
    type: ConversationType;
    isPrivate: boolean;
    isJoined: boolean; // New field
    totalMembers?: number; // New field
    createdAt?: string;
    // Các fields từ GET /conversations/{id}
    members?: ConversationMember[];
    // Fields for unread tracking and sidebar preview
    unseenCount?: number; // Number of unseen messages from API
    lastMessage?: string; // Latest message content (for sidebar preview)
    lastMessageAt?: number; // Timestamp of latest message
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

// Message Types
export type MessageStatus = 'SENT' | 'REVOKED' | 'DELETED';

export interface Message {
    id: number;
    content: string;
    status?: MessageStatus;
    isDeleted: boolean;
    createdAt: number;
    updatedAt: number;
    conversationId: number;
    senderId: number;
    senderName: string;
    senderAvatar?: string;
    parentMessageId?: number;
    parentContent?: string;
    reactions?: Reaction[];
    mentions?: Mention[];
    isPinned?: boolean;
    attachments?: Attachment[];
    threadId?: number;
    threadReplyCount?: number;
}

export interface SendMessageRequest {
    content: string;
    urls?: number[]; // list of attachment IDs
    memberIds?: number[]; // list of mentioned user IDs
    parentMessageId?: number; // for Quote
    threadId?: number; // for Thread Reply
}

export interface Reaction {
    userId: number;
    userName: string;
    emoji: string; // Unicode emoji or filename (without .png)
    reactedAt: number;
}

export interface Mention {
    memberId: number; // ConversationMember ID
    userId: number;
    userName: string;
}

export interface Attachment {
    id: number;
    fileUrl: string;
    fileType: string;
    fileSize: number;
}

export interface SendMessageRequest {
    content: string;
    urls?: number[];
    memberIds?: number[];
    parentMessageId?: number;
}

// Paginated Response
export interface PaginatedResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
    };
    totalPages: number;
    totalElements: number;
    first: boolean;
    last: boolean;
}
