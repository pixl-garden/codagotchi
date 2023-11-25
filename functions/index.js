const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
exports.handleGitHubRedirect = functions.https.onRequest(async (request, response) => {
    const code = request.query.code;
    const state = request.query.state;

    if (!code || !state) {
        response.status(400).json({ error: "Missing code or state parameter" });
        return;
    }

    const clientSecret = functions.config().github.client_secret;

    // Exchange the code for an access token
    try {
        const githubResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: "a253a1599d7b631b091a",
            client_secret: clientSecret,
            code: code,
            redirect_uri: 'https://us-central1-codagotchi.cloudfunctions.net/handleGitHubRedirect'
        }, {
            headers: {
                'Accept': 'application/json'
            }
        });        
        console.log("GitHub Response:", githubResponse.data);

        const accessToken = githubResponse.data.access_token;

        if (!accessToken) {
            console.error("No access token received from GitHub:", githubResponse.data);
            response.status(500).send("No access token received from GitHub");
            return;
        }

        const githubUserResponse = await axios.get('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'User-Agent': 'Codagotchi'
            }
        });

        const githubUserId = githubUserResponse.data.id;
        const githubUsername = githubUserResponse.data.login;

        // Create a Firebase custom token
        const firebaseToken = await admin.auth().createCustomToken(githubUserId.toString());

        // Update the Realtime Database
        const db = admin.database();
        const ref = db.ref('authTokens/' + state); // 'state' is the UUID
        await ref.set({ token: firebaseToken, githubUsername: githubUsername, status: 'ready' });

        response.send("Authentication successful, you can return to the app.");
    } 
    catch (error) {
        console.error("Error in GitHub authentication:", error);
        response.status(500).send("Authentication failed");
    }
});
