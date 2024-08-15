import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private logFile: string;

    constructor(context: vscode.ExtensionContext) {
        this.logFile = path.join(context.extensionPath, 'codagotchi-crash.log');
    }

    public log(message: string, error?: Error): void {
        // current time on the computer
        const timestamp = new Date().toLocaleString();
        let logMessage = `[${timestamp}] ${message}\n`;

        if (error) {
            logMessage += `Error: ${error.message}\n`;
            logMessage += `Stack: ${error.stack}\n`;
        }

        fs.appendFileSync(this.logFile, logMessage);
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
}
