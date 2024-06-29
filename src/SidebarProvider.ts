import * as vscode from 'vscode';
import { merge } from 'lodash';
import { getNonce } from './getNonce';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Ensure you have the 'uuid' package installed.
import { database, firebaseConfig } from './firebaseInit';
import axios from 'axios';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getDatabase, ref, set, get, onValue, off } from 'firebase/database';

const CLIENT_ID = 'a253a1599d7b631b091a';
const REDIRECT_URI = encodeURIComponent('https://us-central1-codagotchi.cloudfunctions.net/handleGitHubRedirect');
const REQUESTED_SCOPES = 'user,read:user';
let githubUsername = '';

// Generate a unique state value
const state = uuidv4();

const O_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${REQUESTED_SCOPES}&state=${state}`;

async function signInWithCustomTokenViaREST(customToken: string, context: vscode.ExtensionContext) {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseConfig.apiKey}`;
    const auth = getAuth();
    console.log("Signing in with custom token")
    try {
        const response = await axios.post(signInUrl, {
            token: customToken,
            returnSecureToken: true  // Must be true to get a refresh token
        });
        const { idToken, refreshToken } = response.data;
        console.log("ID Token:", idToken);
        console.log("Refresh Token:", refreshToken);

        // Store the refresh token in VSCode's secret storage
        await context.secrets.store("refreshToken", refreshToken);

        // Set Firebase Auth state in the SDK
        // await signInWithCustomToken(auth, idToken);

        return { idToken, refreshToken };
    } catch (error) {
        console.error("Error signing in with custom token:", error);
        throw error;
    }
}

// Function to refresh the ID token using the refresh token

async function refreshToken(refreshToken: string, context: vscode.ExtensionContext) {
    const refreshTokenUrl = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
    // const auth = getAuth();
    try {
        const response = await axios.post(refreshTokenUrl, {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        });
        const { id_token, refresh_token } = response.data;
        console.log("New ID Token:", id_token);
        console.log("New Refresh Token:", refresh_token);

        // Update the refresh token in the secret storage
        await context.secrets.store("refreshToken", refresh_token);
        await context.secrets.store("idToken", id_token);

        // Update Firebase Auth state with the new ID token
        // auth.currentUser?.getIdToken(/* forceRefresh */ true).then(updatedToken => {
        //     console.log('Updated Firebase Auth Token:', updatedToken);
        //     // Optionally, use the updatedToken as needed in your application
        // }).catch(error => {
        //     console.error('Error updating Firebase Auth Token:', error);
        // });

        return { idToken: id_token, refreshToken: refresh_token };
    } catch (error) {
        console.error("Error refreshing token:", error);
        throw error;
    }
}


// Set the Global State (with merging)
// ---- Example usage: ----
// setCurrentState(context, {
//     inventory: {
//         apple: { quantity: 7 }
//     }
// });
// if apple already exists in the inventory, it will overwrite the new quantity with the existing quantity 
// and will not delete other keys in the inventory object

function setCurrentState(context: vscode.ExtensionContext, partialUpdate: { [key: string]: any }): Thenable<void> {
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

// Remove an item from the Global State
// ---- Example usage: ----
// removeItemFromState(context, 'inventory', 'apple');

function removeItemFromState(context: vscode.ExtensionContext, key: string, itemToRemove: string): Thenable<void> {
    // Retrieve the existing global state
    const currentGlobalState = context.globalState.get<{ [key: string]: any }>('globalInfo', {});

    // Check if the key exists and is an object
    if (currentGlobalState.hasOwnProperty(key) && typeof currentGlobalState[key] === 'object' && !Array.isArray(currentGlobalState[key])) {
        // Remove the specified item from the object
        delete currentGlobalState[key][itemToRemove];
    }

    // Update the global state with the modified result
    return context.globalState.update('globalInfo', currentGlobalState);
}

function getCurrentState(context: vscode.ExtensionContext): { [key: string]: any } {
    // Retrieve and return the global state
    return context.globalState.get<{ [key: string]: any }>('globalInfo', {});
}

function clearGlobalState(context: vscode.ExtensionContext): Thenable<void> {
    // Clear the global state by setting it to an empty object
    return context.globalState.update('globalInfo', {});
}

function printJsonObject(jsonObject: { [key: string]: any }): void {
    for (const key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
            console.log(`Key: ${key}, Value: ${jsonObject[key]}`);
        }
    }
}

// async function printUserPublicData(userId: string) {
//     const dbRef = ref(database, `users/${userId}/public`);
//     try {
//         const snapshot = await get(dbRef);
//         if (snapshot.exists()) {
//             console.log("Public user data:", snapshot.val());
//         } else {
//             console.log("No public user data found.");
//         }
//     } catch (error) {
//         console.error("Error fetching public user data:", error);
//     }
// }

async function printUserPublicData(context: vscode.ExtensionContext): Promise<void> {
    const userId = await context.secrets.get("userId");
    const idToken = await context.secrets.get("idToken");

    if (!userId || !idToken) {
        console.error("User ID or ID Token is missing.");
        return;
    }

    const url = `${firebaseConfig.databaseURL}/users/${userId}/public.json?auth=${idToken}`;

    try {
        const response = await axios.get(url);
        if (response.data) {
            console.log("Public user data:", response.data);
        } else {
            console.log("No public user data found.");
        }
    } catch (error) {
        console.error("Error fetching public user data:", error);
    }
}
export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    private _onDidViewReady: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidViewReady: vscode.Event<void> = this._onDidViewReady.event;

    private webviewImageUris: { [key: string]: string } = {}; // Store the image URIs

    private context: vscode.ExtensionContext;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
    ) {
        this.context = context;
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
            // Allow scripts in the webview
            enableScripts: true,

            // Include the folder containing the images in localResourceRoots
            localResourceRoots: [
                vscode.Uri.file(path.join(this._extensionUri.fsPath, 'images')),
                vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media')),
                vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'compiled')),
            ],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        this._onDidViewReady.fire();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {

                // send the image URIs to the webview
                case 'webview-ready': {
                    // Convert the image URIs using webview.asWebviewUri
                    const imageUris = this.getImageUris();
                    const webviewImageUris: { [key: string]: string } = {};
                    for (const key in imageUris) {
                        webviewImageUris[key] = webviewView.webview.asWebviewUri(imageUris[key]).toString();
                    }

                    // Send the converted URIs to the webview
                    webviewView.webview.postMessage({
                        type: 'image-uris',
                        uris: webviewImageUris,
                    });
                    refreshToken(await this.context.secrets.get("refreshToken") || '', this.context).then(() => {
                        printUserPublicData(this.context);
                    })

                    break;
                }

                case 'getGlobalState': {
                    console.log('----Getting globalState----');
                    printJsonObject(getCurrentState(this.context));
                    this._view?.webview.postMessage({
                        type: 'currentState',
                        value: getCurrentState(this.context),
                    });
                    break;
                }

                case 'pushToGlobalState': {
                    console.log('****Setting globalState****');
                    // printJsonObject(data.value)
                    setCurrentState(this.context, data.value);
                    break;
                }

                case 'removeItemFromState': {
                    console.log('****Removing item from globalState****');
                    // printJsonObject(data.value)
                    removeItemFromState(this.context, data.key, data.itemIdToRemove);
                    break;
                }

                case 'clearGlobalState': {
                    console.log('****Clearing globalState****');
                    clearGlobalState(this.context);
                    break;
                }

                case 'openOAuthURL': {
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(O_AUTH_URL));
                    // console.log('openOAuthUrl');

                    const tokenRef = ref(database, 'authTokens/' + state);
                    const tokenListener = onValue(
                        tokenRef,
                        (snapshot) => {
                            const data = snapshot.val();
                            // console.log(`Snapshot received for state ${state}:`, data);

                            if (data && data.status === 'ready') {
                                const firebaseToken = data.token;
                                githubUsername = data.githubUsername;
                                console.log('Received token:', firebaseToken);
                                console.log('Received username:', githubUsername);

                                // Sign in to Firebase with the token
                                const auth = getAuth();

                                signInWithCustomToken(auth, firebaseToken)
                                    .then(async (userCredential) => {
                                        // Signed in
                                        const user = userCredential.user;
                                        const userId = user.uid;
                                        console.log('Firebase user:', userId);
                                        console.log('userID:', userId);
                                        await this.context.secrets.store("userId", userId);


                                        // Store the GitHub username in the database under the user's UID
                                        const authRef = ref(getDatabase(), `authTokens/${state}`);
                                        try {
                                            await set(authRef, {
                                                status: 'complete',
                                            });
                                            console.log('User data stored in the database.');
                                        } catch (error) {
                                            console.error('Error storing user data in the database:', error);
                                        }

                                        // printUserPublicData('103673149');
                                        signInWithCustomTokenViaREST(firebaseToken, this.context);

                                        // Remove the listener after successful authentication
                                        off(tokenRef, 'value', tokenListener);
                                    })
                                    .catch((error) => {
                                        const errorCode = error.code;
                                        const errorMessage = error.message;
                                        console.error('Firebase signInWithCustomToken error:', errorCode, errorMessage);

                                        // Remove the listener due to authentication error
                                        off(tokenRef, 'value', tokenListener);

                                        // Inform the user of the error
                                        vscode.window.showErrorMessage(`Error signing in: ${errorMessage}`);
                                    });
                            } else {
                                console.log(`No token found for state ${state}`);
                            }
                        },
                        (error) => {
                            // Handle any errors that occur during the `onValue` listener registration.
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

                    // Now you have the dimensions of the WebView
                    console.log(`WebView dimensions: ${width}x${height}`);
                    break;
                }
                case 'getUserData': {
                    // get from db
                    let dbData = await get(ref(database, 'users/' + githubUsername));
                    console.log("from DB: ", dbData);
                    this._view?.webview.postMessage({
                        type: 'userData',
                        value: dbData.val(),
                    });
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

    // private handleOAuthCallback(state: string, code: string) {
    //     if (state !== this.currentIdentifier) {
    //         console.error("State does not match! Possible CSRF attack.");
    //         return;
    //     }
    //     // Continue with the OAuth process using the provided code
    // }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'codagotchi.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out/compiled', 'sidebar.js'));

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="img-src vscode-webview-resource: https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        
        <script nonce="${nonce}">
        
        const tsvscode = acquireVsCodeApi();

        window.addEventListener('resize', () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          
          // Send a message to the extension
          tsvscode.postMessage({
            type: 'resize',
            width: width,
            height: height
          });
        });
        
        window.addEventListener('click', (event) => {
          const x = event.clientX;
          const y = event.clientY;
          
          // Send a message to the extension with the click coordinates
          tsvscode.postMessage({
            type: 'click',
            x: x,
            y: y
          });
        });
        
        // Trigger the resize event manually to get initial dimensions
        window.dispatchEvent(new Event('resize'));
        </script>
        </head>
        <body>
        <!--
        <button 
            id="github-login" 
            style="padding: 3px; border-radius: 3px; background-color: #4f4f4f; transition: background-color 0.2s; cursor: pointer; color: #c9c9c9;"
            onmouseover="this.style.backgroundColor='#999797';"
            onmousedown="this.style.backgroundColor='#333';" 
            onmouseup="this.style.backgroundColor='#4f4f4f';" 
            onmouseout="this.style.backgroundColor='#4f4f4f';"
        >
            Login with GitHub
        </button>
        -->

        <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
