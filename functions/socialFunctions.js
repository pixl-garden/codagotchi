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
    const toUserRef = admin.database().ref(`users/${toUserId}/private/friendRequests`);
    await toUserRef.push({ fromUserId, fromUsername });

    const inboxRef = admin.database().ref(`users/${toUserId}/private/inbox`);
    await inboxRef.push({ message: `${fromUsername} wants to be your friend`, timestamp: Date.now() });
});

export const handleFriendRequest = functions.https.onCall(async (data, context) => {
    const { action, toUserId, fromUserId } = data; // action: 'accept' or 'reject'
    const toUserRef = admin.database().ref(`users/${toUserId}`);
    const fromUserRef = admin.database().ref(`users/${fromUserId}`);

    if (action === 'accept') {
        await toUserRef.child('public/friends').push(fromUserId);
        await fromUserRef.child('public/friends').push(toUserId);
    }

    await toUserRef
        .child('private/friendRequests')
        .orderByChild('fromUserId')
        .equalTo(fromUserId)
        .once('value', (snapshot) => {
            snapshot.ref.remove();
        });

    // Update inbox for both users
    const toUserInboxRef = admin.database().ref(`users/${toUserId}/private/inbox`);
    await toUserInboxRef.push({ message: `You are now friends with ${fromUserId}`, timestamp: Date.now() });

    const fromUserInboxRef = admin.database().ref(`users/${fromUserId}/private/inbox`);
    await fromUserInboxRef.push({ message: `You are now friends with ${toUserId}`, timestamp: Date.now() });

    return { success: true };
});


