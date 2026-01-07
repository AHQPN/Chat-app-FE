// Common/Shared Types

export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data?: T;
}

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
