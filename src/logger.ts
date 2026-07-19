export class Logger {
    private tag: string;
    private enabled: boolean;

    constructor(tag: string) {
        this.tag = tag;
        this.enabled = true;
    }
    
    log(...message: unknown[]): void {
        if (this.enabled) {
            console.log(`[kododatchi][${this.tag}]`, ...message);
        }
    }
    
    disable(): void {
        this.enabled = false;
    }
}