import { getUserPublicRef, getUserPrivateRef, getUserProtectedInboxRef, pushToRef, handleError, checkAuthenticated } from './firebaseHelpers.js';
import * as functions from 'firebase-functions';
import {admin} from "./firebaseConfig.js";
import verifyToken from './verifyToken.js';

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

export const sendFriendRequest = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send('Forbidden!');
    }

    verifyToken(req, res, async () => {
        console.log("req.user:", req.user);
        console.log("req.body:", req.body);

        const senderUid = req.user.uid;
        const { recipientUsername } = req.body;
        const idToken = req.headers.authorization?.split('Bearer ')[1];


        let recipientUid;
        let senderUsername;

        // Get the recipient's UID from username map
        try {
            if (!idToken) {
                return res.status(400).send('idToken is required');
            }

            const recipientRef = admin.database().ref(`userIdMappings/${recipientUsername}`);
            const recipientIdSnapshot = await recipientRef.once('value');

            if (!recipientIdSnapshot.exists()) {
                return res.status(404).send('Recipient not found');
            }

            const senderRef = admin.database().ref(`users/${senderUid}/public`);
            const senderSnapshot = await senderRef.once('value');

            if (!senderSnapshot.exists()) {
                return res.status(404).send('Sender not found');
            }

            // it's in userId field of the entry
            console.log("recipientIdSnapshot:", recipientIdSnapshot.val());
            recipientUid = recipientIdSnapshot.val().userId;
            console.log("senderSnapshot:", senderSnapshot.val());
            senderUsername = senderSnapshot.val().username;

            console.log("recipientUid:", recipientUid);

            
        } catch (error) {
            console.error('Failed to find recipient:', error);
            return res.status(500).send('Failed to find recipient');
        }

        // Logic to write the friend request to the recipient's inbox
        const inboxRef = admin.database().ref(`users/${recipientUid}/protected/inbox`);
        try {
            await inboxRef.push({
                fromUid: senderUid,
                fromUser: senderUsername,
                type: 'friendRequest',
                createdAt: admin.database.ServerValue.TIMESTAMP
            });
            res.status(200).send({ result: "Friend request sent successfully." });
        } catch (error) {
            console.error('Failed to send friend request:', error);
            res.status(500).send('Failed to send friend request');
        }
    });
});

export const retrieveInbox = functions.https.onRequest((req, res) => {
    if (req.method !== 'GET') {
        return res.status(403).send('Forbidden! Only GET requests are allowed.');
    }

    verifyToken(req, res, async () => {
        const uid = req.user.uid; // User UID from verified token

        // Path to the user's inbox
        const inboxRef = admin.database().ref(`users/${uid}/protected/inbox`);
        try {
            const inboxSnapshot = await inboxRef.once('value');
            if (inboxSnapshot.exists()) {
                res.status(200).json(inboxSnapshot.val());
            } else {
                res.status(404).send('Inbox is empty');
            }
        } catch (error) {
            console.error('Failed to retrieve inbox:', error);
            res.status(500).send('Failed to retrieve inbox');
        }
    });
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
