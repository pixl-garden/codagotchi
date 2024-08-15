import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private logDir: string;
    private logFile: string;
    private extensionId: string;

    constructor(context: vscode.ExtensionContext) {
        this.extensionId = context.extension.id;
        this.logDir = path.join(context.extensionUri.fsPath, 'crashlogs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.logFile = path.join(this.logDir, `${new Date().toISOString().replace(/:/g, '-')}.log`);
        // this.clearOldLogs();
    }

    public log(message: string, error?: Error): void {
        const timestamp = new Date().toLocaleString();
        let logMessage = `[${timestamp}] ${message}\n`;

        if (error) {
            logMessage += `Error: ${error.message}\n`;
            logMessage += `Stack: ${error.stack}\n`;
        }

        fs.appendFileSync(this.logFile, logMessage);
    }

    public handleUncaughtException(error: Error): void {
        if (this.isRelevantError(error)) {
            this.log('Uncaught Exception', error);
        }
    }

    public handleUnhandledRejection(reason: any): void {
        if (this.isRelevantError(reason)) {
            this.log('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
        }
    }

    private isRelevantError(error: any): boolean {
        const stack = error.stack || '';
        const message = error.message || '';

        const relevantKeywords = ['codagotchi', 'Codagotchi', this.extensionId];
        const irrelevantKeywords = ['Canceled', 'SDK is not initialized', 'InstantiationService has been disposed', 'github.copilot', 'gitlens'];

        return relevantKeywords.some((keyword) => stack.includes(keyword) || message.includes(keyword)) && !irrelevantKeywords.some((keyword) => stack.includes(keyword) || message.includes(keyword));
    }

    public getLogDir(): string {
        return this.logDir;
    }

    public getLogContent(): string {
        if (fs.existsSync(this.logFile)) {
            return fs.readFileSync(this.logFile, 'utf8');
        }
        return 'No logs found.';
    }

    public clearLog(): void {
        if (fs.existsSync(this.logFile)) {
            fs.unlinkSync(this.logFile);
        }
    }

    public clearOldLogs(): void {
        if (fs.existsSync(this.logDir)) {
            const files = fs.readdirSync(this.logDir);
            for (const file of files) {
                fs.unlinkSync(path.join(this.logDir, file));
            }
        }
    }
}
