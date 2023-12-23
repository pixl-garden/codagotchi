"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const SidebarProvider_1 = require("./SidebarProvider");
const MAX_ELAPSED_TIME_IN_SECONDS = 10 * 60; // cap to 10 min
function activate(context) {
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, context);
    listenForDocumentSave(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codagotchiView', sidebarProvider));
    context.subscriptions.push(vscode.commands.registerCommand('codagotchi.clearGlobalInfo', () => {
        clearGlobalState(context);
    }));
}
exports.activate = activate;
function clearGlobalState(context) {
    return context.globalState.update('globalInfo', {});
}
function getElapsedTimeInSeconds(lastSaveTime) {
    let now = new Date();
    if (lastSaveTime) {
        let elapsedTime = now.getTime() - lastSaveTime.getTime();
        let elapsedTimeInSeconds = Math.floor(elapsedTime / 1000);
        return lastSaveTime ? Math.min(elapsedTimeInSeconds, MAX_ELAPSED_TIME_IN_SECONDS) : 0;
    }
    return 0;
}
function getLastSaveTime(context) {
    return context.globalState.get('lastSaveTime');
}
function setLastSaveTime(context, date = new Date()) {
    context.globalState.update('lastSaveTime', date);
}
function listenForDocumentSave(context) {
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
        const lastSaveTime = getLastSaveTime(context);
        const lastSaveDate = lastSaveTime ? new Date(lastSaveTime) : undefined; // Restores to original format (date object)
        setLastSaveTime(context); // Sets the global to the current time after retrieved
        console.log(getElapsedTimeInSeconds(lastSaveDate) + " Seconds");
    }));
}
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map