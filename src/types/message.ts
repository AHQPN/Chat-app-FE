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
