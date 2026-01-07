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
