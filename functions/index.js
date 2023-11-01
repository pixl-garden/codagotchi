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

        // Store the access token in Firebase
        const db = admin.database();
        const ref = db.ref('oauthData');

        await ref.child(state).set({ accessToken: accessToken });

        response.status(200).json({ message: "Access token stored successfully" });

    } catch (error) {
        console.error("Failed to exchange code for token:", error);
        response.status(500).json({ error: "Failed to exchange code for token" });
    }
});
