import {admin} from "./firebaseConfig.js";

// Middleware to verify ID token
export async function verifyToken(req, res, next) {
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        return res.status(401).send('No ID token provided');
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("decodedToken: ", decodedToken)

        req.user = decodedToken;

        next();  // Proceed to the actual Cloud Function
    } catch (error) {
        return res.status(401).send('Invalid ID token');
    }
}

export default verifyToken;