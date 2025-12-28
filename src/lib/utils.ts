import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN');
}

export function getInitials(name: string): string {
    if (!name) return '??';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function generateAvatarColor(name: string): string {
    const colors = [
        'bg-gradient-to-br from-violet-500 to-purple-600',
        'bg-gradient-to-br from-blue-500 to-cyan-500',
        'bg-gradient-to-br from-emerald-500 to-teal-500',
        'bg-gradient-to-br from-orange-500 to-amber-500',
        'bg-gradient-to-br from-pink-500 to-rose-500',
        'bg-gradient-to-br from-indigo-500 to-blue-500',
    ];

    if (!name) return colors[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

// GCS storage base URL
const GCS_BASE_URL = 'https://storage.googleapis.com/chat_app_java/';

/**
 * Build full avatar URL from filename
 * If already a full URL, returns as-is
 * If just a filename (e.g., "avartar1.jpg"), builds full URL
 */
export function getAvatarUrl(avatar?: string | null): string | undefined {
    if (!avatar) return undefined;

    // If already a full URL, return as-is
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }

    // Build full URL from filename
    return `${GCS_BASE_URL}${avatar}`;
}

// File type to extension mapping
const mimeToExtension: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/json': '.json',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/x-msdownload': '.exe',
    'application/octet-stream': '',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
};

export function getFileExtension(fileType: string, fileUrl?: string): string {
    // Try to get from MIME type
    if (mimeToExtension[fileType]) {
        return mimeToExtension[fileType];
    }

    // Try to extract from URL
    if (fileUrl) {
        const urlPath = fileUrl.split('?')[0];
        const lastDot = urlPath.lastIndexOf('.');
        if (lastDot !== -1) {
            return urlPath.slice(lastDot);
        }
    }

    // Fallback based on type prefix
    if (fileType.startsWith('image/')) return '.img';
    if (fileType.startsWith('video/')) return '.vid';
    if (fileType.startsWith('audio/')) return '.aud';
    if (fileType.includes('word') || fileType.includes('document')) return '.docx';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '.xlsx';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '.pptx';

    return '';
}

export function getFileName(fileUrl: string, fileType: string, maxLength: number = 25): string {
    // Try to extract filename from URL
    const urlPath = fileUrl.split('?')[0];
    const segments = urlPath.split('/');
    let fileName = segments[segments.length - 1];

    // URL format is: {timestamp}_{originalFilename} (e.g., 1766385636549_SQLQuery1.sql)
    // Extract original filename after the timestamp prefix
    if (fileName) {
        const underscoreIndex = fileName.indexOf('_');
        if (underscoreIndex !== -1) {
            const possibleTimestamp = fileName.substring(0, underscoreIndex);
            // Check if prefix is a timestamp (13 digits)
            if (/^\d{13,}$/.test(possibleTimestamp)) {
                fileName = fileName.substring(underscoreIndex + 1);
            }
        }
    }

    // Decode URL encoded characters
    try {
        fileName = decodeURIComponent(fileName);
    } catch {
        // Ignore decode errors
    }

    // If still no valid filename, generate a friendly name
    if (!fileName || !fileName.includes('.')) {
        const ext = getFileExtension(fileType, fileUrl);
        const typePrefix = fileType.split('/')[0];
        const timestamp = Date.now().toString(36).slice(-4);

        if (typePrefix === 'image') fileName = `image_${timestamp}${ext}`;
        else if (typePrefix === 'video') fileName = `video_${timestamp}${ext}`;
        else if (typePrefix === 'audio') fileName = `audio_${timestamp}${ext}`;
        else if (fileType.includes('word') || fileType.includes('document')) fileName = `document_${timestamp}.docx`;
        else if (fileType.includes('excel') || fileType.includes('spreadsheet')) fileName = `spreadsheet_${timestamp}.xlsx`;
        else if (fileType.includes('pdf')) fileName = `document_${timestamp}.pdf`;
        else fileName = `file_${timestamp}${ext || '.bin'}`;
    }

    // Truncate if too long while preserving extension
    if (fileName.length > maxLength) {
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0) {
            const ext = fileName.slice(lastDot);
            const name = fileName.slice(0, lastDot);
            const maxNameLength = maxLength - ext.length - 3;
            return name.slice(0, maxNameLength) + '...' + ext;
        }
        return fileName.slice(0, maxLength - 3) + '...';
    }

    return fileName;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getFileIconColor(fileType: string): { bg: string; text: string } {
    if (fileType.startsWith('image/')) return { bg: 'bg-green-500/20', text: 'text-green-400' };
    if (fileType.startsWith('video/')) return { bg: 'bg-red-500/20', text: 'text-red-400' };
    if (fileType.startsWith('audio/')) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
    if (fileType.includes('pdf')) return { bg: 'bg-red-500/20', text: 'text-red-400' };
    if (fileType.includes('word') || fileType.includes('document')) return { bg: 'bg-blue-500/20', text: 'text-blue-400' };
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return { bg: 'bg-green-500/20', text: 'text-green-400' };
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
    if (fileType.includes('zip') || fileType.includes('rar')) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
    return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
}
