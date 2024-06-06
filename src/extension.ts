import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
const MAX_ELAPSED_TIME_IN_SECONDS = 10 * 60 // cap to 10 min

import { SecretStorage } from "vscode";
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

let sidebarProvider: SidebarProvider;

export function activate(context: vscode.ExtensionContext) {

    sidebarProvider = new SidebarProvider(context.extensionUri, context);

    const secrets: SecretStorage = context.secrets;

    listenForDocumentSave(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('codagotchiView', sidebarProvider));
    context.subscriptions.push(vscode.commands.registerCommand('codagotchi.clearGlobalInfo', () => {
        clearGlobalState(context);
    }));
    // context.subscriptions.push(
    //     vscode.commands.registerCommand('codagotchi.checkAuthentication', async () => {
    //         const refreshToken = await getSecretToken(context);
    //         if (refreshToken) {
    //             // Assume checkTokenValidity is a function that checks token validity and refreshes it if needed
    //             checkTokenValidity(refreshToken).then((isValid) => {
    //                 if (isValid) {
    //                     console.log('Token is valid or has been refreshed.');
    //                 } else {
    //                     console.log('Token is invalid. Need re-authentication.');
    //                     // Trigger authentication flow
    //                 }
    //             });
    //         } else {
    //             console.log('No refresh token stored. User needs to authenticate.');
    //             // Trigger authentication flow

    //         }
    //     }),
    // );

    
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

async function checkTokenValidity(refreshToken: string) {
    // Send the refresh token to your server where you can use Firebase Admin SDK to verify and refresh the ID token
    // This would require setting up an endpoint that handles this logic
    // Return true if the token is refreshed or still valid, false if it cannot be refreshed (e.g., token is revoked or expired)

    // Should be done through Firebase
    return true;
}

async function getSecretToken(context: vscode.ExtensionContext): Promise<string | undefined> {
    return await context.secrets.get('refreshToken');
}

async function setSecretToken(context: vscode.ExtensionContext, token: string): Promise<void> {
    await context.secrets.store('refreshToken', token);
    console.log('New token stored successfully');
}

async function signInWithCustomToken(customToken: string) {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`;
    try {
        const response = await axios.post(signInUrl, {
            token: customToken,
            returnSecureToken: true, // This must be true to get a refresh token
        });
        const { idToken, refreshToken } = response.data;
        console.log('ID Token:', idToken);
        console.log('Refresh Token:', refreshToken);
        return { idToken, refreshToken };
    } catch (error) {
        console.error('Error signing in with custom token:', error);
        throw error;
    }
}


// This method is called when your extension is deactivated
export function deactivate() {}
