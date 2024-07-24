import * as vscode from 'vscode';
import { merge } from 'lodash';
import { getNonce } from './getNonce';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { database, firebaseConfig } from './firebaseInit';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';

import { CacheManager } from './cacheManager';
import * as apiClient from './apiClient';

const CLIENT_ID = 'a253a1599d7b631b091a';
const REDIRECT_URI = encodeURIComponent('https://us-central1-codagotchi.cloudfunctions.net/handleGitHubRedirect');
const REQUESTED_SCOPES = 'user,read:user';
let githubUsername = '';

// Generate a unique state value
const state = uuidv4();

const O_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${REQUESTED_SCOPES}&state=${state}`;

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    private _onDidViewReady: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidViewReady: vscode.Event<void> = this._onDidViewReady.event;

    private webviewImageUris: { [key: string]: string } = {}; // Store the image URIs

    private context: vscode.ExtensionContext;
    private cacheManager: CacheManager;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
    ) {
        this.context = context;
        this.cacheManager = new CacheManager(context);
    }

    private getImageUris(): { [key: string]: vscode.Uri } {
        const imageDir = path.join(this._extensionUri.fsPath, 'images');
        const imageNames = fs.readdirSync(imageDir);
        const uris: { [key: string]: vscode.Uri } = {};

        for (const imageName of imageNames) {
            const uri = vscode.Uri.file(path.join(imageDir, imageName));
            uris[imageName] = uri;
        }

        // Convert the URIs using webview.asWebviewUri
        for (const key in uris) {
            this.webviewImageUris[key] = this._view?.webview.asWebviewUri(uris[key]).toString() || '';
        }

        return uris;
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        // Store the state value temporarily in globalState
        vscode.commands.executeCommand('setContext', 'oauthState', state);

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this._extensionUri.fsPath, 'images')), vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media')), vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'compiled'))],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        this._onDidViewReady.fire();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'webview-ready': {
                    const imageUris = this.getImageUris();
                    const webviewImageUris: { [key: string]: string } = {};
                    for (const key in imageUris) {
                        webviewImageUris[key] = webviewView.webview.asWebviewUri(imageUris[key]).toString();
                    }

                    webviewView.webview.postMessage({
                        type: 'image-uris',
                        uris: webviewImageUris,
                    });
                    const refreshToken = (await this.context.secrets.get('refreshToken')) || '';
                    await apiClient.refreshToken(refreshToken, this.context);

                    const cachedUserInbox = await this.cacheManager.get('userInbox');
                    console.log('Cached userInbox:', cachedUserInbox);

                    webviewView.webview.postMessage({
                        type: 'cached-user-inbox',
                        userInbox: cachedUserInbox,
                    });

                    break;
                }

                case 'syncLocalToGlobalState': {
                    printJsonObject(getGlobalState(this.context));
                    this._view?.webview.postMessage({
                        type: 'fetchedGlobalState',
                        value: getGlobalState(this.context),
                    });
                    break;
                }

                case 'updateGlobalState': {
                    updateGlobalState(this.context, data.value).then(() => {
                        this._view?.webview.postMessage({
                            type: 'fetchedGlobalState',
                            value: getGlobalState(this.context),
                        });
                    });
                    break;
                }

                case 'removeItemFromState': {
                    removeItemFromState(this.context, data.key, data.itemIdToRemove).then(() => {
                        this._view?.webview.postMessage({
                            type: 'fetchedGlobalState',
                            value: getGlobalState(this.context),
                        });
                    });
                    break;
                }

                case 'clearGlobalState': {
                    clearGlobalState(this.context);
                    break;
                }

                case 'openOAuthURL': {
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(O_AUTH_URL));

                    const tokenRef = ref(database, 'authTokens/' + state);
                    const tokenListener = onValue(
                        tokenRef,
                        (snapshot) => {
                            const data = snapshot.val();

                            if (data && data.status === 'ready') {
                                const firebaseToken = data.token;
                                githubUsername = data.githubUsername;
                                console.log('Received token:', firebaseToken);
                                console.log('Received username:', githubUsername);

                                const auth = getAuth();

                                signInWithCustomToken(auth, firebaseToken)
                                    .then(async (userCredential) => {
                                        const user = userCredential.user;
                                        const userId = user.uid;
                                        console.log('Firebase user:', userId);
                                        console.log('userID:', userId);
                                        await this.context.secrets.store('userId', userId);

                                        const authRef = ref(getDatabase(), `authTokens/${state}`);
                                        try {
                                            await set(authRef, {
                                                status: 'complete',
                                            });
                                            console.log('User data stored in the database.');
                                        } catch (error) {
                                            console.error('Error storing user data in the database:', error);
                                        }

                                        apiClient.signInWithCustomTokenViaREST(firebaseToken, this.context);

                                        off(tokenRef, 'value', tokenListener);
                                    })
                                    .catch((error) => {
                                        const errorCode = error.code;
                                        const errorMessage = error.message;
                                        console.error('Firebase signInWithCustomToken error:', errorCode, errorMessage);

                                        off(tokenRef, 'value', tokenListener);

                                        vscode.window.showErrorMessage(`Error signing in: ${errorMessage}`);
                                    });
                            } else {
                                console.log(`No token found for state ${state}`);
                            }
                        },
                        (error) => {
                            console.error('Firebase onValue listener error:', error);
                            vscode.window.showErrorMessage(`Error listening for token: ${error.message}`);
                        },
                    );

                    break;
                }

                case 'onInfo': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case 'onError': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
                case 'resize': {
                    const width = data.width;
                    const height = data.height;
                    console.log(`WebView dimensions: ${width}x${height}`);
                    break;
                }
                case 'sendFriendRequest': {
                    await apiClient.sendFriendRequest(this.context, data.val);
                    break;
                }
                case 'handleFriendRequest': {
                    await apiClient.handleFriendRequest(this.context, data.requestId, data.action);
                    break;
                }
                case 'retrieveInbox': {
                    const {updatedInbox} = await apiClient.retrieveInbox(this.context, this.cacheManager);
                    //console.log("Retrieved inbox data:", updatedInbox);
                    if (updatedInbox) {
                        // set the global state with the updated inbox data
                        await updateGlobalState(this.context, { inbox: updatedInbox });
                        // update the local state with the updated inbox data
                        this._view?.webview.postMessage({
                            type: 'fetchedGlobalState',
                            value: getGlobalState(this.context),
                        });

                    }
                    break;
                }
                case 'sendPostcard': {
                    await apiClient.sendPostcard(this.context, data.recipientUsername, data.postcardJSON);
                    break;
                }
                case 'syncUserData': {
                    await apiClient.syncUserData(this.context, data.userData);
                    break;
                }
            }
        });
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    public setCurrentRoom(roomName: string) {
        this._view?.webview.postMessage({
            type: 'currentRoom',
            value: roomName,
        });
    }

    public getGithubUsername() {
        return githubUsername;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'codagotchi.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out/compiled', 'sidebar.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <mexta http-equiv="Content-Security-Policy" content="img-src vscode-webview-resource: https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        
        <script nonce="${nonce}">
        const tsvscode = acquireVsCodeApi();

        window.addEventListener('resize', () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          tsvscode.postMessage({
            type: 'resize',
            width: width,
            height: height
          });
        });
        
        window.addEventListener('click', (event) => {
          const x = event.clientX;
          const y = event.clientY;
          tsvscode.postMessage({
            type: 'click',
            x: x,
            y: y
          });
        });
        
        window.dispatchEvent(new Event('resize'));
        </script>
        </head>
        <body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

// Update the Global State (with merging)
// ---- Example usage: ----
// updateGlobalState(context, {
//     inventory: {
//         apple: { quantity: 7 }
//     }
// });
// if apple already exists in the inventory, it will overwrite the new quantity with the existing quantity
// and will not delete other keys in the inventory object
function updateGlobalState(context: vscode.ExtensionContext, partialUpdate: { [key: string]: any }): Thenable<void> {
    // Retrieve the existing global state
    const currentGlobalState = context.globalState.get<{ [key: string]: any }>('globalInfo', {});

    // Loop through the keys in the partial update
    for (const key of Object.keys(partialUpdate)) {
        if (currentGlobalState.hasOwnProperty(key) && typeof currentGlobalState[key] === 'object' && !Array.isArray(currentGlobalState[key])) {
            // If the current value is an object, merge it with the new value
            currentGlobalState[key] = merge(currentGlobalState[key], partialUpdate[key]);
        } else {
            // If the current value is not a mergable object, just replace it
            currentGlobalState[key] = partialUpdate[key];
        }
    }

    // Update the global state with the modified result
    return context.globalState.update('globalInfo', currentGlobalState);
}

function overwriteFieldInState(context: vscode.ExtensionContext, field: string, newValue: any): Thenable<void> {
    // Retrieve the existing global state
    const currentGlobalState = context.globalState.get<{ [key: string]: any }>('globalInfo', {});

    // Overwrite the specific field with the new value
    currentGlobalState[field] = newValue;

    // Update the global state with the modified result
    return context.globalState.update('globalInfo', currentGlobalState);
}

// Remove an item from the Global State
// ---- Example usage: ----
// removeItemFromState(context, 'inventory', 'apple');

// Also supports deep deletion using dot notation
// ---- Example usage: ----
// removeItemFromState(context, 'inbox', 'friendRequest.1234');
// TODO: maybe this should be done with one value instead of two? (append the key to the value)
function removeItemFromState(context: vscode.ExtensionContext, key: string, itemToRemove: string): Thenable<void> {
    // Retrieve the existing global state
    const currentGlobalState = context.globalState.get<{ [key: string]: any }>('globalInfo', {});
    console.log('TESTINGLOG');

    // Check if the key exists and is an object
    if (currentGlobalState.hasOwnProperty(key) && typeof currentGlobalState[key] === 'object' && !Array.isArray(currentGlobalState[key])) {
        // Split itemToRemove by dots to support deep deletion
        const keys = itemToRemove.split('.');
        let current = currentGlobalState[key];

        for (let i = 0; i < keys.length; i++) {
            if (current.hasOwnProperty(keys[i]) && typeof current[keys[i]] === 'object') {
                console.log('Current:', current);
                current = current[keys[i]];
            } else {
                // If the path doesn't exist, exit the function
                console.log('Path does not exist:', current);
                return context.globalState.update('globalInfo', currentGlobalState);
            }
        }

        deleteNestedKey(currentGlobalState[key], keys);
    }

    // Update the global state with the modified result
    return context.globalState.update('globalInfo', currentGlobalState);
}

// Helper function that deletes target nested key in removeItemFromState
function deleteNestedKey(obj: any, keys: string[]): void {
    if (keys.length === 0) {
        return;
    }

    const lastKey = keys.pop();
    const parent = keys.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

    if (parent && lastKey && parent[lastKey] !== undefined) {
        delete parent[lastKey];
    }
}

function getGlobalState(context: vscode.ExtensionContext): { [key: string]: any } {
    console.log('----Getting globalState----');
    printJsonObject(context.globalState.get<{ [key: string]: any }>('globalInfo', {}));
    return context.globalState.get<{ [key: string]: any }>('globalInfo', {});
}

function clearGlobalState(context: vscode.ExtensionContext): Thenable<void> {
    return context.globalState.update('globalInfo', {});
}

function printJsonObject(jsonObject: { [key: string]: any }): void {
    for (const key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
            console.log(`Key: ${key}, Value: ${jsonObject[key]}`);
        }
    }
}
