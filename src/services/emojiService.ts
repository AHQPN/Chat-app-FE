import api from './api';
import type { ApiResponse } from '@/types';

// Cache for emoji data
let emojiFilenamesCache: string[] | null = null;
let emojiUrlsCache: string[] | null = null;

export const emojiService = {
    // Fetch emoji filenames from backend (for sending reactions)
    // GET /files/emojis -> ["1F565.png", "1F566.png", ...]
    async getEmojiFilenames(): Promise<string[]> {
        if (emojiFilenamesCache) {
            return emojiFilenamesCache;
        }

        try {
            const response = await api.get<ApiResponse<string[]>>('/files/emojis');
            if (response.data.code === 1000 && response.data.data) {
                emojiFilenamesCache = response.data.data;
                return emojiFilenamesCache;
            }
        } catch (error) {
            console.error('Failed to fetch emoji filenames:', error);
        }
        return [];
    },

    // Fetch full emoji URLs from backend (for display)
    // GET /files/emoji-urls -> ["https://storage.googleapis.com/.../1F565.png", ...]
    async getEmojiUrls(): Promise<string[]> {
        if (emojiUrlsCache) {
            return emojiUrlsCache;
        }

        try {
            const response = await api.get<ApiResponse<string[]>>('/files/emoji-urls');
            if (response.data.code === 1000 && response.data.data) {
                emojiUrlsCache = response.data.data;
                return emojiUrlsCache;
            }
        } catch (error) {
            console.error('Failed to fetch emoji URLs:', error);
        }
        return [];
    },

    // Get both filenames and URLs together for picker
    async getEmojisForPicker(): Promise<{ filename: string; url: string }[]> {
        const [filenames, urls] = await Promise.all([
            this.getEmojiFilenames(),
            this.getEmojiUrls(),
        ]);

        // Match by filename
        return filenames.map((filename, index) => ({
            filename,
            url: urls[index] || '',
        }));
    },

    // Clear cache (call when needed to refresh)
    clearCache() {
        emojiFilenamesCache = null;
        emojiUrlsCache = null;
    },

    // Extract filename from full URL (if backend returns full URL in reactions)
    extractFilename(urlOrFilename: string): string {
        if (urlOrFilename.includes('/')) {
            // It's a URL, extract filename
            return urlOrFilename.split('/').pop() || urlOrFilename;
        }
        return urlOrFilename;
    },
};

