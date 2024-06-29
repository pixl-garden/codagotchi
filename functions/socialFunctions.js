import { getUserPublicRef, getUserPrivateRef, getUserProtectedInboxRef, pushToRef, handleError, checkAuthenticated } from './firebaseHelpers.js';
import * as functions from 'firebase-functions';

export const searchUsers = functions.https.onCall(async (data, context) => {
    checkAuthenticated(context);
    const displayName = data.displayName;
    const snapshot = await getUserPublicRef().orderByChild('displayName').equalTo(displayName).once('value');
    return snapshot.val();
});

// add bar
// kitgore -> press send -> request sent
// kitgorrrr -> press send -> user not found

// take username -> send a request with username in headers -> firebase search by username -> append the request in their inbox 

export const sendFriendRequest = functions.https.onCall(async (data, context) => {
    checkAuthenticated(context);
    const { toUsername, fromUserId, fromUsername } = data;

    // First, find the toUserId based on toUsername
    const toUserRef = admin.firestore().collection('users').where('username', '==', toUsername);
    const toUserSnapshot = await toUserRef.get();

    if (toUserSnapshot.empty) {
        return { success: false, message: 'No user found with that username' };
    }

    const toUserId = toUserSnapshot.docs[0].id;

    const friendRequestRef = getUserPrivateRef(toUserId).child('friendRequests');
    const snapshot = await friendRequestRef.orderByChild('fromUserId').equalTo(fromUserId).once('value');
    if (snapshot.exists()) {
        return { success: true, message: 'Friend request already sent' };
    }

    const friendsRef = getUserPublicRef(toUserId).child('friends');
    const friendsSnapshot = await friendsRef.once('value');
    if (friendsSnapshot.child(fromUserId).exists()) {
        return { success: true, message: 'You are already friends' };
    }

    const updates = {};
    updates[friendRequestRef.push().key] = { fromUserId, fromUsername };
    updates[getUserProtectedInboxRef(toUserId).push().key] = { message: `${fromUsername} wants to be your friend`, timestamp: Date.now() };

    try {
        await friendRequestRef.parent.update(updates);
        return { success: true };
    } catch (error) {
        handleError(error, 'Error sending friend request');
    }
});


export const handleFriendRequest = functions.https.onCall(async (data, context) => {
    checkAuthenticated(context);
    const { action, toUserId, fromUserId } = data;

    if (action === 'accept') {
        const updates = {};
        updates[getUserPublicRef(toUserId).child('friends').push().key] = fromUserId;
        updates[getUserPublicRef(fromUserId).child('friends').push().key] = toUserId;
        updates[getUserProtectedInboxRef(toUserId).push().key] = { message: `You are now friends with ${fromUserId}`, timestamp: Date.now() };
        updates[getUserProtectedInboxRef(fromUserId).push().key] = { message: `You are now friends with ${toUserId}`, timestamp: Date.now() };

        try {
            await getUserRef(toUserId).update(updates);
            return { success: true };
        } catch (error) {
            handleError(error, 'Error accepting friend request');
        }
    } else if (action === 'reject') {
        try {
            const friendRequestRef = getUserPrivateRef(toUserId).child('friendRequests');
            const snapshot = await friendRequestRef.orderByChild('fromUserId').equalTo(fromUserId).once('value');
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    childSnapshot.ref.remove();
                });
            }
            return { success: true };
        } catch (error) {
            handleError(error, 'Error rejecting friend request');
        }
    } else {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
    }
});

export const removeFriend = functions.https.onCall(async (data, context) => {
    checkAuthenticated(context);
    const { toUserId, fromUserId } = data;
    const friendsRef = getUserPublicRef(toUserId).child('friends');
    const snapshot = await friendsRef.once('value');
    if (!snapshot.child(fromUserId).exists()) {
        return { success: true, message: 'You are not friends' };
    }

    const updates = {};
    updates[`/public/friends/${fromUserId}`] = null;
    updates[`/public/friends/${toUserId}`] = null;
    updates[getUserProtectedInboxRef(toUserId).push().key] = { message: `You are no longer friends with ${fromUserId}`, timestamp: Date.now() };
    updates[getUserProtectedInboxRef(fromUserId).push().key] = { message: `You are no longer friends with ${toUserId}`, timestamp: Date.now() };

    try {
        await getUserRef(toUserId).update(updates);
        await getUserRef(fromUserId).update(updates);
        return { success: true };
    } catch (error) {
        handleError(error, 'Error removing friend');
    }
});
