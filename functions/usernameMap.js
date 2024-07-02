import * as functions from 'firebase-functions';
import { checkAuthenticated } from './firebaseHelpers.js';

// Update or create a single user mapping
export const updateUserMapping = functions.https.onCall(async (data, context) => {
    checkAuthenticated(context);

    const { userId, username } = data;
    if (!userId || !username) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with two arguments "userId" and "username".');
    }

    // ! Change later from firestore to realtime database
    const mappingRef = admin.firestore().collection('userIdMappings').doc(userId);
    try {
        await mappingRef.set({ username });
        console.log('Mapping updated successfully');
        return { success: true, message: 'Mapping updated successfully' };
    } catch (error) {
        console.error('Failed to update user mapping', error);
        throw new functions.https.HttpsError('unknown', 'Failed to update user mapping', error);
    }
});

// Batch update mappings for all users
export const updateAllUserMappings = functions.https.onRequest(async (req, res) => {
    const usersRef = admin.firestore().collection('users');
    try {
        const usersSnapshot = await usersRef.get();
        const updatePromises = [];
        usersSnapshot.forEach(userDoc => {
            const user = userDoc.data();
            const userId = userDoc.id;
            const { username } = user;
            updatePromises.push(admin.firestore().collection('userIdMappings').doc(userId).set({ username }));
        });
        await Promise.all(updatePromises);
        res.send('All mappings updated successfully');
    } catch (error) {
        console.error('Failed to update all user mappings', error);
        res.status(500).send('Failed to update all user mappings');
    }
});
