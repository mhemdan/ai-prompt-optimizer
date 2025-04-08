// src/cache/PromptCache.ts

interface CacheEntry {
    prompt: string;
    response: string;
    timestamp: number;
    context: string;
}

export class PromptCache {
    private cache: Map<string, CacheEntry>;
    private readonly maxEntries: number;
    private readonly ttl: number; // Time to live in milliseconds

    constructor(maxEntries = 100, ttlMinutes = 60) {
        this.cache = new Map();
        this.maxEntries = maxEntries;
        this.ttl = ttlMinutes * 60 * 1000;
    }

    public get(prompt: string, context: string): string | undefined {
        const key = this.generateKey(prompt, context);
        const entry = this.cache.get(key);
        
        if (!entry) {
            return undefined;
        }

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.response;
    }

    public set(prompt: string, response: string, context: string): void {
        const key = this.generateKey(prompt, context);
        
        if (this.cache.size >= this.maxEntries) {
            this.evictOldest();
        }

        this.cache.set(key, {
            prompt,
            response,
            timestamp: Date.now(),
            context
        });
    }

    private generateKey(prompt: string, context: string): string {
        return `${prompt}:${context}`;
    }

    private isExpired(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp > this.ttl;
    }

    private evictOldest(): void {
        let oldestKey: string | undefined;
        let oldestTimestamp = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
}
