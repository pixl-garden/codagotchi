import * as vscode from 'vscode';
import { SidebarProvider } from "./SidebarProvider";

export function activate(context: vscode.ExtensionContext) {
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	listenForDocumentSave(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("codagotchiView", sidebarProvider)
	);
}

function listenForDocumentSave(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
		console.log("Test!!!");

    }));
}

// This method is called when your extension is deactivated
export function deactivate() {}