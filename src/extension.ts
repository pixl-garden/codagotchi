import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
const MAX_ELAPSED_TIME_IN_SECONDS = 10 * 60; // cap to 10 min

let sidebarProvider: SidebarProvider;

export function activate(context: vscode.ExtensionContext) {
    sidebarProvider = new SidebarProvider(context.extensionUri, context);
    listenForDocumentSave(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codagotchiView', sidebarProvider));
    context.subscriptions.push(
        vscode.commands.registerCommand('codagotchi.clearGlobalInfo', () => {
            clearGlobalState(context);
        }),
    );
}

function clearGlobalState(context: vscode.ExtensionContext): Thenable<void> {
    return context.globalState.update('globalInfo', {});
}

function getElapsedTimeInSeconds(lastSaveTime: Date | undefined): number {
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

function setLastSaveTime(context: vscode.ExtensionContext, date: Date = new Date()) {
    context.globalState.update('lastSaveTime', date);
}

function listenForDocumentSave(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            const lastSaveTime = getLastSaveTime(context);
            const lastSaveDate = lastSaveTime ? new Date(lastSaveTime) : undefined; // Restores to original format (date object)
            setLastSaveTime(context); // Sets the global to the current time after retrieved
            const elapsedTimeInSeconds = getElapsedTimeInSeconds(lastSaveDate);
            console.log(elapsedTimeInSeconds + ' Seconds');

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
export function deactivate(context: vscode.ExtensionContext) {
    // post a syncUserData message to the webview
    if (sidebarProvider._view?.webview) {
        sidebarProvider._view?.webview.postMessage({
            type: 'syncUserData',
            value: context.globalState.get('globalInfo'),
        });
    }
}
