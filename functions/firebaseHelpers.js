import admin from 'firebase-admin';

const db = admin.database();

const getUserRef = (userId) => db.ref(`users/${userId}`);

const getUserPublicRef = (userId) => getUserRef(userId).child('public');

const getUserPrivateRef = (userId) => getUserRef(userId).child('private');

const getUserProtectedInboxRef = (userId) => getUserRef(userId).child('protected/inbox');

const pushToRef = (ref, value) => {
    const newRef = ref.push();
    newRef.set(value);
    return newRef.key;
};

const handleError = (error, message) => {
    console.error(message, error);
    throw new admin.functions.HttpsError('unknown', message, error);
};

const checkAuthenticated = (context) => {
    if (!context.auth) {
        throw new admin.functions.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
};

export { getUserRef, getUserPublicRef, getUserPrivateRef, getUserProtectedInboxRef, pushToRef, handleError, checkAuthenticated };
