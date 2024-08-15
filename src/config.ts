import { v4 as uuidv4 } from 'uuid';

export const CLIENT_ID = 'a253a1599d7b631b091a';
export const REDIRECT_URI = encodeURIComponent('https://us-central1-codagotchi.cloudfunctions.net/handleGitHubRedirect');
export const REQUESTED_SCOPES = 'user,read:user';
export const BASE_URL = 'https://us-central1-codagotchi.cloudfunctions.net';

export function generateOAuthURL(state: string): string {
    return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${REQUESTED_SCOPES}&state=${state}`;
}

export function generateState(): string {
    return uuidv4();
}
