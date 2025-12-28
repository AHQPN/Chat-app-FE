const CACHE_KEY = 'chat_user_status_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes validity

interface CacheEntry {
    isOnline: boolean;
    lastActive?: number;
    timestamp: number;
}

interface StatusCache {
    [userId: number]: CacheEntry;
}

const loadCache = (): StatusCache => {
    if (typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const saveCache = (cache: StatusCache) => {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to save user status cache to localStorage', e);
    }
};

export const updateUserStatusCache = (userId: number, isOnline: boolean, lastActive?: number) => {
    const cache = loadCache();
    cache[userId] = {
        isOnline,
        lastActive,
        timestamp: Date.now()
    };
    saveCache(cache);
};

export const getUserStatusFromCache = (userId: number) => {
    const cache = loadCache();
    const entry = cache[userId];

    if (!entry) return undefined;

    // Check expiration (TTL)
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        // Expired -> Clean up and return undefined
        delete cache[userId];
        saveCache(cache);
        return undefined;
    }

    return { isOnline: entry.isOnline, lastActive: entry.lastActive };
};
