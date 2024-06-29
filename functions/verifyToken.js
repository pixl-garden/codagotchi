import { initializeApp, auth } from 'firebase-admin';

// Ensure Firebase is initialized
initializeApp();

// Middleware to verify ID token
async function verifyToken(req, res, next) {
    const idToken = req.body.idToken;

    if (!idToken) {
        return res.status(401).send('No ID token provided');
    }

    try {
        const decodedToken = await auth().verifyIdToken(idToken);
        req.user = decodedToken;  // Attach user information to the request
        next();  // Proceed to the actual Cloud Function
    } catch (error) {
        return res.status(401).send('Invalid ID token');
    }
}

export default verifyToken;
