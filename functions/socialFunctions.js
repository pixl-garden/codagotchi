import admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const searchUsers = functions.https.onCall(async (data, context) => {
    const displayName = data.displayName;
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.orderByChild('public/displayName').equalTo(displayName).once('value');
    return snapshot.val();
});

export const sendFriendRequest = functions.https.onCall(async (data, context) => {
    const { toUserId, fromUserId, fromUsername } = data;

    // check if it's been send already, if yes, do nothing
    const friendRequestRef = admin.database().ref(`users/${toUserId}/private/friendRequests`);
    const snapshot = await friendRequestRef.orderByChild('fromUserId').equalTo(fromUserId).once('value');
    if (snapshot.val()) {
        return { success: true,
            message: 'Friend request already sent'};
    }

    // Generate a new key for the friend request
    const friendRequestKey = admin.database().ref().child(`users/${toUserId}/private/friendRequests`).push().key;
    const updates = {};
    updates[`users/${toUserId}/private/friendRequests/${friendRequestKey}`] = { fromUserId, fromUsername };

    // Add a message to the recipient's inbox
    const inboxKey = admin.database().ref().child(`users/${toUserId}/private/inbox`).push().key;
    updates[`users/${toUserId}/private/inbox/${inboxKey}`] = { message: `${fromUsername} wants to be your friend`, timestamp: Date.now() };

    try {
        await admin.database().ref().update(updates);
        return { success: true };
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to send friend request', error);
    }
});

export const handleFriendRequest = functions.https.onCall(async (data, context) => {
    const { action, toUserId, fromUserId } = data; // action: 'accept' or 'reject'

    if (action === 'accept') {
        // Add each user to the other's friends list
        const toUserFriendsKey = admin.database().ref().child(`users/${toUserId}/public/friends`).push().key;
        const fromUserFriendsKey = admin.database().ref().child(`users/${fromUserId}/public/friends`).push().key;
        const updates = {};
        updates[`users/${toUserId}/public/friends/${toUserFriendsKey}`] = fromUserId;
        updates[`users/${fromUserId}/public/friends/${fromUserFriendsKey}`] = toUserId;

        // Update inbox for both users
        const toUserInboxKey = admin.database().ref().child(`users/${toUserId}/private/inbox`).push().key;
        const fromUserInboxKey = admin.database().ref().child(`users/${fromUserId}/private/inbox`).push().key;
        updates[`users/${toUserId}/private/inbox/${toUserInboxKey}`] = { message: `You are now friends with ${fromUserId}`, timestamp: Date.now() };
        updates[`users/${fromUserId}/private/inbox/${fromUserInboxKey}`] = { message: `You are now friends with ${toUserId}`, timestamp: Date.now() };

        try {
            await admin.database().ref().update(updates);
            return { success: true };
        } catch (error) {
            console.error('Error accepting friend request:', error);
            throw new functions.https.HttpsError('unknown', 'Failed to accept friend request', error);
        }
    } 

    // Remove the friend request
    const friendRequestRef = admin.database().ref(`users/${toUserId}/private/friendRequests`);
    const snapshot = await friendRequestRef.orderByChild('fromUserId').equalTo(fromUserId).once('value');
    try {
        snapshot.forEach((childSnapshot) => {
        childSnapshot.ref.remove();
    });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to reject friend request', error);
    }


    return { success: true };
});

export const removeFriend = functions.https.onCall(async (data, context) => {
    const { toUserId, fromUserId } = data;

    // Remove each user from the other's friends list
    const updates = {};
    const toUserFriendsRef = admin.database().ref(`users/${toUserId}/public/friends`);
    const fromUserFriendsRef = admin.database().ref(`users/${fromUserId}/public/friends`);
    const toUserFriendsSnapshot = await toUserFriendsRef.once('value');
    const fromUserFriendsSnapshot = await fromUserFriendsRef.once('value');
    toUserFriendsSnapshot.forEach((childSnapshot) => {
        if (childSnapshot.val() === fromUserId) {
            childSnapshot.ref.remove();
        }
    });
    fromUserFriendsSnapshot.forEach((childSnapshot) => {
        if (childSnapshot.val() === toUserId) {
            childSnapshot.ref.remove();
        }
    });

    // Update inbox for both users
    const toUserInboxKey = admin.database().ref().child(`users/${toUserId}/private/inbox`).push().key;
    const fromUserInboxKey = admin.database().ref().child(`users/${fromUserId}/private/inbox`).push().key;
    updates[`users/${toUserId}/private/inbox/${toUserInboxKey}`] = { message: `You are no longer friends with ${fromUserId}`, timestamp: Date.now() };
    updates[`users/${fromUserId}/private/inbox/${fromUserInboxKey}`] = {
        message: `You are no longer friends with ${toUserId}`,
        timestamp: Date.now(),
    };

    try {
        await admin.database().ref().update(updates);
        return { success: true };
    }
    catch (error) {
        console.error('Error removing friend:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to remove friend', error);
    }
});
