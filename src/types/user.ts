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
