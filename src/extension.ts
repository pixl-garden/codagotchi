import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { Logger } from './logger';

const MAX_ELAPSED_TIME_IN_SECONDS = 10 * 60 // cap to 10 min
let sidebarProvider: SidebarProvider;
let logger: Logger;

export function activate(context: vscode.ExtensionContext) {
    logger = new Logger(context);

    try {
        sidebarProvider = new SidebarProvider(context.extensionUri, context);
        listenForDocumentSave(context);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider('codagotchiView', sidebarProvider));
        context.subscriptions.push(
            vscode.commands.registerCommand('codagotchi.clearGlobalInfo', () => {
                clearGlobalState(context);
            }),
        );

        // Add a command to view logs
        context.subscriptions.push(
            vscode.commands.registerCommand('codagotchi.viewLogs', () => {
                const logs = logger.getLogContent();
                vscode.workspace.openTextDocument({ content: logs }).then((doc) => {
                    vscode.window.showTextDocument(doc);
                });
            }),
        );

        // Add a command to clear logs
        context.subscriptions.push(
            vscode.commands.registerCommand('codagotchi.clearLogs', () => {
                logger.clearLog();
                vscode.window.showInformationMessage('Codagotchi logs cleared.');
            }),
        );

        // Set up global error handling
        process.on('uncaughtException', (error) => {
            logger.log('Uncaught Exception', error);
            vscode.window.showErrorMessage(`Codagotchi encountered an error. Please check the logs.`);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.log('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
            vscode.window.showErrorMessage(`Codagotchi encountered an error. Please check the logs.`);
        });
    } catch (error) {
        if (error instanceof Error) {
            logger.log('Activation Error', error);
            vscode.window.showErrorMessage(`Codagotchi failed to activate. Error: ${error.message}`);
        }
    }
}

function clearGlobalState(context: vscode.ExtensionContext): Thenable<void> {
    return context.globalState.update('globalInfo', {});
}

function getElapsedTimeInSeconds(lastSaveTime: Date | undefined): number{
    let now = new Date();
    if (lastSaveTime) {
        let elapsedTime = now.getTime() - lastSaveTime.getTime();
        let elapsedTimeInSeconds = Math.floor(elapsedTime / 1000);
        return lastSaveTime ? Math.min(elapsedTimeInSeconds, MAX_ELAPSED_TIME_IN_SECONDS) : 0;
    }
    return 0;
}

function getLastSaveTime(context: vscode.ExtensionContext): Date | undefined {
    return context.globalState.get<Date>('lastSaveTime');
}

function setLastSaveTime(context: vscode.ExtensionContext, date: Date = new Date()){
    context.globalState.update('lastSaveTime', date);
}

function listenForDocumentSave(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            const lastSaveTime = getLastSaveTime(context);
            const lastSaveDate = lastSaveTime ? new Date(lastSaveTime) : undefined; // Restores to original format (date object)
            setLastSaveTime(context); // Sets the global to the current time after retrieved
            const elapsedTimeInSeconds = getElapsedTimeInSeconds(lastSaveDate);
            console.log(elapsedTimeInSeconds + " Seconds");

            // Use postMessage to communicate with the webview
            if (sidebarProvider._view?.webview) {
                sidebarProvider._view?.webview.postMessage({
                    type: 'documentSaved',
                    value: elapsedTimeInSeconds,
                });
            }
        }),
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    logger.log('Extension deactivated');
}
