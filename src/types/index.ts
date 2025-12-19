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
    createdAt?: string;
    // Các fields bổ sung (có thể dùng sau)
    members?: ConversationMember[];
}

export interface ConversationMember {
    id: number;
    userId: number;
    fullName: string;
    avatar?: string;
    role: ConversationRole;
}

export interface CreateConversationRequest {
    workspaceId: number;
    name: string;
    type: ConversationType;
    isPrivate: boolean;
    memberIds?: number[]; // Required for DM (exactly 1 userId), optional for CHANNEL
}

// Message Types
export interface Message {
    id: number;
    content: string;
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
}

export interface Reaction {
    userId: number;
    userName: string;
    emoji: string;
    reactedAt: number;
}

export interface Mention {
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
