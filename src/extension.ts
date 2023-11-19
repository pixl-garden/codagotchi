import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
const MAX_ELAPSED_TIME_IN_SECONDS = 10 * 60 // cap to 10 min

export function activate(context: vscode.ExtensionContext) {
    const sidebarProvider = new SidebarProvider(context.extensionUri);
    listenForDocumentSave(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codagotchiView', sidebarProvider));
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
            console.log(getElapsedTimeInSeconds(lastSaveDate) + " Seconds");
        }),
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
