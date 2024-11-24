import * as vscode from 'vscode';
import { merge, update } from 'lodash';
import { getNonce } from './getNonce';
import * as fs from 'fs';
import * as path from 'path';
import { initializeFirebase } from './firebaseInit';
import { CacheManager } from './cacheManager';
import * as apiClient from './apiClient';
import { generateOAuthURL, generateState } from './config';
export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    private _onDidViewReady: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidViewReady: vscode.Event<void> = this._onDidViewReady.event;

    private context: vscode.ExtensionContext;
    private cacheManager: CacheManager;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
    ) {
        this.context = context;
        this.cacheManager = new CacheManager(context);

        try {
            initializeFirebase();
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            vscode.window.showErrorMessage('Failed to initialize Firebase. Some features may not work.');
        }
    }

    private readSpriteData(): string {
        const spriteDataPath = path.join(this._extensionUri.fsPath, 'media', 'spriteData.bin');
        const spriteData = fs.readFileSync(spriteDataPath);
        return spriteData.toString('base64');
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;


        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this._extensionUri.fsPath, 'images')), vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media')), vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'compiled'))],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        this._onDidViewReady.fire();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'webview-ready': {
                    const spriteData = this.readSpriteData();
                    webviewView.webview.postMessage({
                        type: 'sprite-data',
                        data: spriteData,
                    });

                    const refreshToken = (await this.context.secrets.get('refreshToken')) || '';
                    await apiClient.refreshToken(refreshToken, this.context);

                    const cachedUserInbox = await this.cacheManager.get('userInbox');
                    console.log('Cached userInbox:', cachedUserInbox);

                    webviewView.webview.postMessage({
                        type: 'cached-user-inbox',
                        userInbox: cachedUserInbox,
                    });

                    const cachedUserInventory = await this.cacheManager.get('userInventory');
                    console.log('Cached userInventory:', cachedUserInventory);

                    webviewView.webview.postMessage({
                        type: 'cached-user-inventory',
                        userInventory: cachedUserInventory,
                    });

                    startPeriodicSync(this.context);

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
                    const state = generateState();
                    const oauthUrl = generateOAuthURL(state);
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(oauthUrl));

                    // Store the state value temporarily in globalState
                    vscode.commands.executeCommand('setContext', 'oauthState', state);

                    try {
                        const { token: firebaseToken, githubUsername } = await apiClient.listenForAuthToken(state);
                        console.log('Received token:', firebaseToken);
                        console.log('Received username:', githubUsername);

                        const userId = await apiClient.signInWithFirebase(firebaseToken);
                        console.log('Firebase user:', userId);
                        await this.context.secrets.store('userId', userId);

                        await apiClient.completeAuthProcess(state, userId);
                        console.log('User data stored in the database.');

                        await apiClient.signInWithCustomTokenViaREST(firebaseToken, this.context);

                        this._view?.webview.postMessage({ type: 'loginSuccess' });
                    } catch (error: any) {
                        console.error('Error in OAuth process:', error);
                        vscode.window.showErrorMessage(`Error in OAuth process: ${error.message}`);
                    }
                    break;
                }

                case 'logout': {
                    try {
                        await apiClient.logout(this.context);
                        this._view?.webview.postMessage({ type: 'logoutSuccess' });
                    } catch (error) {
                        console.error('Error during logout:', error);
                        vscode.window.showErrorMessage('Error during logout');
                    }
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
                    const { updatedInbox } = await apiClient.retrieveInbox(this.context, this.cacheManager);
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
                case 'retrieveInventory': {
                    const { receivedInventory } = await apiClient.retrieveInventory(this.context, this.cacheManager);
                    //console.log("Retrieved inventory data:", updatedInventory);
                    console.log('Received inventory:', receivedInventory)
                    if (receivedInventory) {
                        // set the global state with the updated inventory data
                        await updateGlobalState(this.context, { inventory: receivedInventory }).then(() => {
                            // update the local state with the updated inventory data
                            this._view?.webview.postMessage({
                                type: 'fetchedGlobalState',
                                value: getGlobalState(this.context),
                            });
                            console.log('Updated inventory:', getGlobalState(this.context).inventory);
                        }
                        );
                    }
                    break;
                }
                case 'sendPostcard': {
                    await apiClient.sendPostcard(this.context, data.recipientUsername, data.postcardJSON);
                    break;
                }
                case 'syncUserData': {
                    // await apiClient.syncUserData(this.context, );
                    break;
                }
                case 'handleDatabaseUpdates': {
                    handleDatabaseUpdates(this.context, data.updates);
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
// if apple already exists in the inventory, it will overwrite the existing quantity with the new quantity
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

function overwriteFieldInState(context: vscode.ExtensionContext, key: string, value: any): Thenable<void> {
    // Retrieve the existing global state
    const currentGlobalState = context.globalState.get<{ [key: string]: any }>('globalInfo', {});

    // Overwrite the specific field with the new value
    currentGlobalState[key] = value;

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
            // console.log(`Key: ${key}, Value: ${jsonObject[key]}`);
        }
    }
}

function handleDatabaseUpdates(context: vscode.ExtensionContext, updatesJSON: apiClient.DatabaseUpdates): void {
    const currentState = getGlobalState(context).databaseUpdates as apiClient.DatabaseUpdates;

    if( updatesJSON.inventoryUpdates !== undefined ) {
        // Update inventory: stack items if they already exist, add new ones if not
        Object.keys(updatesJSON.inventoryUpdates).forEach(key => {
            currentState.inventoryUpdates[key] = updatesJSON.inventoryUpdates[key];
        });
    }

    // Update other parts of the global state
    updateGlobalState(context, { 
        databaseUpdates: { 
            bedroomUpdates: updatesJSON.bedroomUpdates,
            xp: currentState.xp + updatesJSON.xp, // Correct xp addition
            inventoryUpdates: currentState.inventoryUpdates || {} // Ensure inventory is saved with updates
        } 
    });
}

function startPeriodicSync(context: vscode.ExtensionContext, interval = 10000) { // 60000 ms = 1 minute\
    const baseJSON = {
        inventoryUpdates: {},
        xp: 0,
        petUpdates: {},
        customizationUpdates: {},
        bedroomUpdates: "",
        timestamp: 0
    }
    setInterval(() => {
        let databaseUpdates = getGlobalState(context).databaseUpdates as apiClient.DatabaseUpdates;
        if( JSON.stringify(databaseUpdates) !== JSON.stringify(baseJSON) ) {
            apiClient.syncUserData(context, databaseUpdates).then(() => {
                overwriteFieldInState(context, "databaseUpdates", baseJSON);
            })
        }
    }, interval);
}
