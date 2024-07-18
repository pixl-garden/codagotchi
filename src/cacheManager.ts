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

    async set(key: string, data: any): Promise<void> {
        const cachedItem: CachedItem = {
            data,
            timestamp: Date.now(),
        };
        await this.context.globalState.update(key, cachedItem);
    }

    async get(key: string): Promise<any | null> {
        const cachedItem = this.context.globalState.get(key) as CachedItem | undefined;
        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
            return cachedItem.data;
        }
        return null;
    }

    async invalidate(key: string): Promise<void> {
        await this.context.globalState.update(key, undefined);
    }
}
