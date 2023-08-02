import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';
import { SidebarProvider } from "./SidebarProvider";

export function activate(context: vscode.ExtensionContext) {
	const sidebarProvider = new SidebarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("codagotchiView", sidebarProvider)
	  );

	context.subscriptions.push(
		vscode.commands.registerCommand('codagotchi.helloWorld', () => {
			HelloWorldPanel.createOrShow(context.extensionUri);
		})
	);


	context.subscriptions.push(
		vscode.commands.registerCommand('codagotchi.addTodo', () => {
			const {activeTextEditor } = vscode.window;

			if(!activeTextEditor){
				vscode.window.showInformationMessage("No active text editor");
				return;
			}

			const text = activeTextEditor.document.getText(activeTextEditor.selection);
			sidebarProvider._view?.webview.postMessage({
				type: "new-todo",
				value: text
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codagotchi.askQuestion', async () => {
			const answer = await vscode.window.showInformationMessage('How was your day?', 'Good', 'Bad');
				if(answer === "Bad"){
					vscode.window.showInformationMessage('Sorry to hear that');
				 }
				 else{
					console.log(answer);
				 }
		})
	);	
}

// This method is called when your extension is deactivated
export function deactivate() {}
