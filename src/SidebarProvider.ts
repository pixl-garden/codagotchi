import * as vscode from 'vscode';
import { last, merge, update } from 'lodash';
import { getNonce } from './getNonce';
import * as fs from 'fs';
import * as path from 'path';
import { initializeFirebase } from './firebaseInit';
import { CacheManager } from './cacheManager';
import * as apiClient from './apiClient';
import { generateOAuthURL, generateState, BASE_URL} from './config';
import axios from 'axios';
export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    private readonly _onDidViewReady: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidViewReady: vscode.Event<void> = this._onDidViewReady.event;

    private readonly context: vscode.ExtensionContext;
    private readonly cacheManager: CacheManager;

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

                    const refreshToken = (await this.context.secrets.get('refreshToken')) ?? '';
                    await apiClient.refreshToken(refreshToken, this.context);

                    const cachedUserInbox = await this.cacheManager.get('userInbox');
                    console.log('Cached userInbox:', cachedUserInbox);

                    webviewView.webview.postMessage({
                        type: 'cached-user-inbox',
                        userInbox: cachedUserInbox,
                    });

                    // const cachedUserInventory = await this.cacheManager.get('userInventory');
                    // console.log('Cached userInventory:', cachedUserInventory);

                    // webviewView.webview.postMessage({
                    //     type: 'cached-user-inventory',
                    //     userInventory: cachedUserInventory,
                    // });

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
                    // await apiClient.sendFriendRequest(this.context, data.val);
                    sendFriendRequest(this.context, data.val);
                    break;
                }
                case 'handleFriendRequest': {
                    handleFriendRequest(this.context, data.requestId, data.action);
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
                        console.log('Updated inbox:', getGlobalState(this.context).inbox);
                    }
                    break;
                }
                case 'retrieveInventory': {
                    const { receivedInventory } = await apiClient.retrieveInventory(this.context);
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
                    sendPostcard(this.context, data.recipientUsername, data.postcardJSON);
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
function removeItemFromState(context: vscode.ExtensionContext, key: string, itemToRemove: string): Thenable<void> {
    const currentGlobalState = context.globalState.get<{ [key: string]: any }>('globalInfo', {});

    if (currentGlobalState.hasOwnProperty(key) && 
        typeof currentGlobalState[key] === 'object' && 
        !Array.isArray(currentGlobalState[key])) {
        
        const keys = itemToRemove.split('.');
        const lastKey = keys.pop();
        let current = currentGlobalState[key];

        // Navigate to the parent of the item to remove
        for (const element of keys) {
            if (!current?.hasOwnProperty(element)) {
                return context.globalState.update('globalInfo', currentGlobalState);
            }
            current = current[element];
        }

        // Remove the item if it exists
        if (lastKey && current?.hasOwnProperty(lastKey)) {
            delete current[lastKey];
        }
    }

    return context.globalState.update('globalInfo', currentGlobalState);
}

function getGlobalState(context: vscode.ExtensionContext): { [key: string]: any } {
    console.log('----Getting globalState----');
    printJsonObject(context.globalState.get<{ [key: string]: any }>('globalInfo', {}));
    // printJsonObject(context.globalState)
    return context.globalState.get<{ [key: string]: any }>('globalInfo', {});
}

function clearGlobalState(context: vscode.ExtensionContext): Thenable<void> {
    context.globalState.update('lastSync', 0);
    return context.globalState.update('globalInfo', {});
}

function printJsonObject(jsonObject: { [key: string]: any }): void {
    for (const key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
            // console.log(`Key: ${key}, Value: ${jsonObject[key]}`);
        }
    }
}

function updateDatabase(context: vscode.ExtensionContext, partialUpdate: Partial<Omit<DatabaseUpdates, 'lastSync'>>): void {
    const lastSync = Date.now();
    
    const databaseUpdate: DatabaseUpdates = {
        bedroomUpdates: partialUpdate.bedroomUpdates ?? "",
        inventoryUpdates: partialUpdate.inventoryUpdates ?? {},
        petUpdates: partialUpdate.petUpdates ?? {},
        gameUpdates: partialUpdate.gameUpdates ?? {},
        lastSync: lastSync,
        socialUpdates: partialUpdate.socialUpdates ?? {
            sentPostcards: {},
            outgoingFriendRequests: [],
            removedFriends: [],
            handledFriendRequests: {}
        }
    };

    handleDatabaseUpdates(context, databaseUpdate);
}

function handleDatabaseUpdates(context: vscode.ExtensionContext, updatesJSON: DatabaseUpdates): void {
    const currentState = getGlobalState(context).databaseUpdates as DatabaseUpdates;
    const lastSyncTimestamp = context.globalState.get('lastSync') || 0;
    
    // Only update bedroomUpdates if a non-empty value is provided
    if (updatesJSON.bedroomUpdates) {
        currentState.bedroomUpdates = updatesJSON.bedroomUpdates;
    }

    // Handle inventory updates
    if (updatesJSON.inventoryUpdates !== undefined) {
        currentState.inventoryUpdates = currentState.inventoryUpdates || {};
        Object.keys(updatesJSON.inventoryUpdates).forEach(key => {
            currentState.inventoryUpdates[key] = updatesJSON.inventoryUpdates[key];
        });
    }

    // Initialize if undefined
    if (!currentState.socialUpdates) {
        currentState.socialUpdates = {
            sentPostcards: {},
            outgoingFriendRequests: [],
            removedFriends: [],
            handledFriendRequests: {}
        };
    }
    
    // Handle social updates
    if (updatesJSON.socialUpdates !== undefined) {
        // Handle sent postcards (combine objects)
        if (updatesJSON.socialUpdates.sentPostcards) {
            currentState.socialUpdates.sentPostcards = {
                ...currentState.socialUpdates.sentPostcards,
                ...updatesJSON.socialUpdates.sentPostcards
            };
        }

        // Handle friend requests (combine arrays)
        if (updatesJSON.socialUpdates.outgoingFriendRequests) {
            currentState.socialUpdates.outgoingFriendRequests = [
                ...currentState.socialUpdates.outgoingFriendRequests,
                ...updatesJSON.socialUpdates.outgoingFriendRequests
            ];
        }

        // Handle removed friends (combine arrays)
        if (updatesJSON.socialUpdates.removedFriends) {
            currentState.socialUpdates.removedFriends = [
                ...currentState.socialUpdates.removedFriends,
                ...updatesJSON.socialUpdates.removedFriends
            ];
        }

        // Handle friend request responses (combine objects)
        if (updatesJSON.socialUpdates.handledFriendRequests) {
            currentState.socialUpdates.handledFriendRequests = {
                ...currentState.socialUpdates.handledFriendRequests,
                ...updatesJSON.socialUpdates.handledFriendRequests
            };
        }
    }

    // Update global state
    updateGlobalState(context, {
        databaseUpdates: {
            bedroomUpdates: updatesJSON.bedroomUpdates,
            inventoryUpdates: currentState.inventoryUpdates || {},
            socialUpdates: currentState.socialUpdates || {},
            petUpdates: updatesJSON.petUpdates,
            gameUpdates: updatesJSON.gameUpdates,
            lastSync: lastSyncTimestamp
        }
    });
}

function handleFriendRequest(context: vscode.ExtensionContext, requestId: string, action: 'accept' | 'reject') {
    updateDatabase(context, {
        socialUpdates: {
            sentPostcards: {},
            outgoingFriendRequests: [],
            removedFriends: [],
            handledFriendRequests: {
                [requestId]: action
            }
        }
    });
}

// Example function to send a postcard
function sendPostcard(context: vscode.ExtensionContext, recipientUsername: string, postcardData: any) {
    const timestamp = Date.now(); // Unique key for the postcard
    
    updateDatabase(context, {
        socialUpdates: {
            sentPostcards: {
                [timestamp]: {
                    recipientUsername,
                    postcardJSON: postcardData
                }
            },
            outgoingFriendRequests: [],
            removedFriends: [],
            handledFriendRequests: {}
        }
    });
}

// Example function to send a friend request
function sendFriendRequest(context: vscode.ExtensionContext, username: string) {
    updateDatabase(context, {
        socialUpdates: {
            sentPostcards: {},
            outgoingFriendRequests: [username],  // Single username or you could spread existing ones
            removedFriends: [],
            handledFriendRequests: {}
        }
    });
}

// Example function to remove a friend
function removeFriend(context: vscode.ExtensionContext, username: string) {
    updateDatabase(context, {
        socialUpdates: {
            sentPostcards: {},
            outgoingFriendRequests: [],
            removedFriends: [username],  // Single username
            handledFriendRequests: {}
        }
    });
}

function startPeriodicSync(context: vscode.ExtensionContext, interval = 10000) {
    const baseJSON = createEmptyDatabaseUpdates();
   
    setInterval(() => {
        let databaseUpdates = getGlobalState(context).databaseUpdates as DatabaseUpdates;
        if (JSON.stringify(databaseUpdates) !== JSON.stringify(baseJSON)) {
            syncUserData(context, databaseUpdates).then(() => {
                overwriteFieldInState(context, "databaseUpdates", baseJSON);
            })
        }
    }, interval);
}

function createEmptyDatabaseUpdates(): DatabaseUpdates {
    return {
        bedroomUpdates: "",
        inventoryUpdates: {},
        petUpdates: {},
        gameUpdates: {},
        lastSync: 0,
        socialUpdates: {
            sentPostcards: {},
            outgoingFriendRequests: [],
            removedFriends: [],
            handledFriendRequests: {}
        }
    };
}

export interface PostcardData {
    recipientUsername: string;
    postcardJSON: any; // Or maybe define a specific PostcardJSON interface??
}

export interface SocialUpdates {
    sentPostcards: Record<number, PostcardData>;
    outgoingFriendRequests: string[];  // array of usernames
    removedFriends: string[];  // array of usernames
    handledFriendRequests: Record<string, 'accept' | 'reject'>;  // requestId -> action
}

// Update your DatabaseUpdates interface
export interface DatabaseUpdates {
    bedroomUpdates: string;
    inventoryUpdates: Record<string, number>;
    petUpdates: any;
    lastSync: number;
    socialUpdates: SocialUpdates;
    gameUpdates: any;
}

export async function syncUserData(context: vscode.ExtensionContext, databaseUpdates: DatabaseUpdates ) {
    if(databaseUpdates){
        const idToken = await context.secrets.get('idToken');
        console.log("databaseUpdates", JSON.stringify(databaseUpdates));
        const inventoryUpdates = databaseUpdates.inventoryUpdates || {};
        const petUpdates = databaseUpdates.petUpdates || {};
        const gameUpdates = databaseUpdates.gameUpdates || {};
        const bedroomUpdates = databaseUpdates.bedroomUpdates || '';
        const socialUpdates = databaseUpdates.socialUpdates || {};
        const lastSync = databaseUpdates.lastSync || 0;


        console.log('inventoryUpdates:', inventoryUpdates, 'petUpdates:', petUpdates, 'gameUpdates:', gameUpdates, 'bedroomUpdates:', bedroomUpdates, 'socialUpdates:', socialUpdates, 'lastSync:', lastSync);
        try {
            const response = await axios.post(
                `${BASE_URL}/syncUserData`,
                { inventoryUpdates, petUpdates, gameUpdates, bedroomUpdates, socialUpdates, lastSync },
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
            if (response.data.responseJSON) {
                context.globalState.update('lastSync', response.data.responseJSON.lastSync);
                console.log('Received JSON:', response.data.responseJSON);
                handleDatabaseResponses(context, response.data.responseJSON);
            }
            
            console.log('User Data Synced');
            return response.data.message;
        } catch (error) {
            console.error('Error syncing user data:', error);
            throw error;
        }
    }
}

function handleDatabaseResponses(context: vscode.ExtensionContext, responseJSON: any) {
    if(responseJSON.fullReplace === true){
        updateGlobalState(context, { inventory: responseJSON.replacements.inventory });
        updateGlobalState(context, { bedroomData: responseJSON.replacements.bedroom });
    }
}