import axios from 'axios';
import * as vscode from 'vscode';
import { merge } from 'lodash';
import { CacheManager } from './cacheManager';
import { firebaseConfig } from './firebaseInit';

const BASE_URL = 'https://us-central1-codagotchi.cloudfunctions.net';

export async function signInWithCustomTokenViaREST(customToken: string, context: vscode.ExtensionContext) {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseConfig.apiKey}`;
    try {
        const response = await axios.post(signInUrl, {
            token: customToken,
            returnSecureToken: true,
        });
        const { idToken, refreshToken } = response.data;
        await context.secrets.store('refreshToken', refreshToken);
        return { idToken, refreshToken };
    } catch (error) {
        console.error('Error signing in with custom token:', error);
        throw error;
    }
}

export async function refreshToken(refreshToken: string, context: vscode.ExtensionContext) {
    const refreshTokenUrl = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
    try {
        const response = await axios.post(refreshTokenUrl, {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });
        const { id_token, refresh_token } = response.data;
        await context.secrets.store('refreshToken', refresh_token);
        await context.secrets.store('idToken', id_token);
        return { idToken: id_token, refreshToken: refresh_token };
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
}

export async function sendFriendRequest(context: vscode.ExtensionContext, recipientUsername: string) {
    const idToken = await context.secrets.get('idToken');
    try {
        const response = await axios.post(
            `${BASE_URL}/sendFriendRequest`,
            { recipientUsername },
            {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        console.log('Friend Request Sent');
        return response.data.message;
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
}

export async function handleFriendRequest(context: vscode.ExtensionContext, requestId: string, action: string) {
    const idToken = await context.secrets.get('idToken');
    try {
        const response = await axios.post(
            `${BASE_URL}/handleFriendRequest`,
            { requestId, action },
            {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        return response.data.message;
    } catch (error) {
        console.error('Error handling friend request:', error);
        throw error;
    }
}

// 
export async function retrieveInbox(context: vscode.ExtensionContext, cacheManager: CacheManager) {
    const cacheKey = 'userInbox';
    const lastFetchTimestamp = (await cacheManager.getTimestamp(cacheKey)) || 0;
    const cachedInbox = (await cacheManager.get(cacheKey)) || {};

    const lengths = {} as { [key: string]: number };
    for (const key in cachedInbox) {
        if (typeof cachedInbox[key] === 'object') {
            lengths[key] = Object.keys(cachedInbox[key] || {}).length;
        }
    }

    const idToken = await context.secrets.get('idToken');
    try {
        const response = await axios.get(`${BASE_URL}/retrieveInbox`, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json',
            },
            params: {
                timestamp: lastFetchTimestamp,
                ...lengths,
            },
        });

        const { flag, inboxData, timestamp: currentTimestamp } = response.data;

        let updatedInbox = flag === 'merge' ? merge({}, cachedInbox, inboxData) : inboxData;

        flag === 'merge' ? console.log('Inbox Merged') : console.log('Inbox Replaced');

        await cacheManager.set(cacheKey, {
            data: updatedInbox,
            timestamp: currentTimestamp,
        });

        return { updatedInbox, flag };
    } catch (error) {
        console.error('Error retrieving inbox:', error);
        throw error;
    }
}

export async function sendPostcard(context: vscode.ExtensionContext, recipientUsername: string, postcardJSON: JSON) {
    const idToken = await context.secrets.get('idToken');
    try {
        const response = await axios.post(
            `${BASE_URL}/sendPostcard`,
            { recipientUsername, postcardJSON },
            {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        console.log('Postcard Sent');
        return response.data.message;
    } catch (error) {
        console.error('Error sending postcard:', error);
        throw error;
    }
}

// TEST the TYPES
export async function syncUserData(context: vscode.ExtensionContext, userData: { inventoryUpdates: JSON; petUpdates: JSON; customizationUpdates: JSON }) {
    const idToken = await context.secrets.get('idToken');
    const { inventoryUpdates, petUpdates, customizationUpdates } = userData;
    try {
        const response = await axios.post(
            `${BASE_URL}/syncUserData`,
            { inventoryUpdates, petUpdates, customizationUpdates },
            {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        console.log('User Data Synced');
        return response.data.message;
    } catch (error) {
        console.error('Error syncing user data:', error);
        throw error;
    }
}
