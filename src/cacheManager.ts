import * as vscode from 'vscode';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface CachedItem {
    data: any;
    timestamp: number;
}

export class CacheManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async set(key: string, item: CachedItem): Promise<void> {
        await this.context.globalState.update(key, item);
    }

    async get(key: string): Promise<any | null> {
        const cachedItem = this.context.globalState.get(key) as CachedItem | undefined;
        return cachedItem ? cachedItem.data : null;
    }

    async getTimestamp(key: string): Promise<number> {
        const cachedItem = this.context.globalState.get(key) as CachedItem | undefined;
        return cachedItem ? cachedItem.timestamp : 0;
    }

    async invalidate(key: string): Promise<void> {
        await this.context.globalState.update(key, undefined);
    }
}