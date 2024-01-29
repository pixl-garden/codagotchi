import axios from 'axios';
import admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import * as socialFunctions from './socialFunctions.js';

admin.initializeApp();

const handleGitHubRedirect = functions.runWith({}).https.onRequest(async (request, response) => {
    const code = request.query.code;
    const state = request.query.state;

    if (!code || !state) {
        response.status(400).json({ error: 'Missing code or state parameter' });
        return;
    }

    const clientSecret = functions.config().github.client_secret;

    // Exchange the code for an access token
    try {
        const githubResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: 'a253a1599d7b631b091a',
                client_secret: clientSecret,
                code: code,
                redirect_uri: 'https://us-central1-codagotchi.cloudfunctions.net/handleGitHubRedirect',
            },
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        console.log('GitHub Response:', githubResponse.data);

        const accessToken = githubResponse.data.access_token;

        if (!accessToken) {
            console.error('No access token received from GitHub:', githubResponse.data);
            response.status(500).send('No access token received from GitHub');
            return;
        }

        const githubUserResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `token ${accessToken}`,
                'User-Agent': 'Codagotchi',
            },
        });

        const githubUserId = githubUserResponse.data.id;
        const githubUsername = githubUserResponse.data.login;

        // Create a Firebase custom token
        const firebaseToken = await admin.auth().createCustomToken(githubUserId.toString());
        const token_time = Date.now(); // Current timestamp in milliseconds

        // Update the Realtime Database
        const db = admin.database();
        const ref = db.ref('authTokens/' + state); // 'state' is the UUID
        await ref.set({ token: firebaseToken, githubUsername: githubUsername, status: 'ready', timestamp: token_time });

        response.send('Authentication successful, you can return to the app.');
        // check if token is complete

        const startTime = Date.now();
        const timeout = 60000; // Timeout after 60 seconds
        let statusComplete = false;

        while (Date.now() - startTime < timeout && !statusComplete) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1 second

            const tokenSnapshot = await ref.once('value');
            const tokenData = tokenSnapshot.val();

            if (tokenData && tokenData.status === 'complete') {
                statusComplete = true;
                const userRef = db.ref(`users/${githubUserId}`);
                await userRef.set({
                    public: {
                        uid: githubUserId.toString(),
                        displayName: githubUsername,
                        githubUsername: githubUsername,
                        photoURL: `https://avatars.githubusercontent.com/u/${githubUserId}?v=4`,
                        githubUserId: githubUserId,
                        createdAt: token_time,
                        lastLoginAt: token_time,
                        lastSeenAt: token_time,
                        level: 1,
                        experience: 0,
                        friends: {}, 
                        status: "Hey there! I'm using WhatsApp.",
                    },
                    private: {
                        inbox: {}, 
                        friendRequests: {}, 
                    },
                });
                console.log('User profile created');
            }
        }
        if (statusComplete) {
            response.send('Authentication and user profile creation successful.');
            await ref.remove();
            console.log(`Token for ${state} deleted after successful profile creation`);
        } else {
            response.status(408).send('Request timed out. User profile not created.');
        }
    } catch (error) {
        console.error('GitHub authentication error:', error);
        response.status(500).send('GitHub authentication error: ', error);
    }
});

const deleteOldTokens = functions
    .runWith({
        /* your settings */
    })
    .pubsub.schedule('0 0 * * *')
    .timeZone('America/Los_Angeles')
    .onRun(async (context) => {
        // ... your existing code ...
        const db = admin.database();
        const ref = db.ref('authTokens');
        const now = Date.now();

        const snapshot = await ref.once('value');
        const tokens = snapshot.val();

        if (tokens) {
            for (const [key, value] of Object.entries(tokens)) {
                // Check if the token is older than 10 minutes
                if (now - value.timestamp > 86400000) {
                    // 600000 milliseconds = 10 minutes
                    console.log(`Deleting old token: ${key}`);
                    await ref.child(key).remove();
                }
            }
        }
        return null;
    });

export { handleGitHubRedirect, deleteOldTokens };
export const searchUsers = socialFunctions.searchUsers;
export const sendFriendRequest = socialFunctions.sendFriendRequest;
export const handleFriendRequest = socialFunctions.handleFriendRequest;
export const removeFriend = socialFunctions.removeFriend;
