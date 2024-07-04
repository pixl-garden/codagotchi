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

export const sendFriendRequest = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({success: false, message: 'Forbidden!'});
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
                return res.status(404).send({success: false, message: 'Recipient not found'});
            }

            if (recipientIdSnapshot.val().userId === senderUid) {
                return res.status(400).send({success: false, message: 'You cannot send a friend request to yourself'});
            }

            // if the request has been sent already to the recipient
            const recipientInboxRef = admin.database().ref(`users/${recipientIdSnapshot.val().userId}/protected/inbox/friendRequests`);
            const recipientInboxSnapshot = await recipientInboxRef.once('value');
            recipientInboxSnapshot.forEach((childSnapshot) => {
                if (childSnapshot.val().fromUid === senderUid) {
                    return res.status(400).send({success: false, message: 'Friend request already sent'});
                }
            });

            // if the recipient already sent a request to you, automatically accept it, call the accept request function
            const senderInboxRef = admin.database().ref(`users/${senderUid}/protected/inbox/friendRequests`);
            const senderInboxSnapshot = await senderInboxRef.once('value');
            senderInboxSnapshot.forEach((childSnapshot) => {
                if (childSnapshot.val().fromUid === recipientIdSnapshot.val().userId) {
                    //! CHECK AFTER FINISHING friend request handling
                    handleFriendRequest({ requestId: childSnapshot.key, action: 'accept' });
                    return res.status(200).send({ success: true, message: "Friend request accepted automatically." });
                }
            });

            const senderRef = admin.database().ref(`users/${senderUid}/public`);
            const senderSnapshot = await senderRef.once('value');

            if (!senderSnapshot.exists()) {
                return res.status(404).send({success: false, message:'Sender not found'});
            }

            // it's in userId field of the entry
            console.log("recipientIdSnapshot:", recipientIdSnapshot.val());
            recipientUid = recipientIdSnapshot.val().userId;
            console.log("senderSnapshot:", senderSnapshot.val());
            senderUsername = senderSnapshot.val().username;

            console.log("recipientUid:", recipientUid);

            
        } catch (error) {
            console.error('Failed to find recipient:', error);
            return res.status(500).send({success: false, message: 'Failed to find recipient'});
        }

        // Logic to write the friend request to the recipient's inbox
        const inboxRef = admin.database().ref(`users/${recipientUid}/protected/inbox/friendRequests`);
        try {
            await inboxRef.push({
                fromUid: senderUid,
                fromUser: senderUsername,
                type: 'friendRequest',
                createdAt: admin.database.ServerValue.TIMESTAMP
            });
            res.status(200).send({ success: true, message: "Friend request sent successfully." });
        } catch (error) {
            console.error('Failed to send friend request:', error);
            res.status(500).send({success: false, message: 'Failed to send friend request'});
        }
    });
});

export const retrieveInbox = functions.https.onRequest((req, res) => {
    if (req.method !== 'GET') {
        return res.status(403).send({success: false, message: 'Forbidden! Only GET requests are allowed.'});
    }

    verifyToken(req, res, async () => {
        const uid = req.user.uid; // User UID from verified token

        // Path to the user's inbox
        const inboxRef = admin.database().ref(`users/${uid}/protected/inbox`);
        try {
            const inboxSnapshot = await inboxRef.once('value');
            const inboxData = inboxSnapshot.val();
            res.status(200).send({
                success: true,
                inbox: inboxData === null ? {} : inboxData
            });
        } catch (error) {
            console.error('Failed to retrieve inbox:', error);
            res.status(500).send({success: false, message: 'Failed to retrieve inbox'});
        }
    });
});

export const handleFriendRequest = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({success: false, message: 'Forbidden!'});
    }

    verifyToken(req, res, async () => {
        console.log("req.user:", req.user);
        console.log("req.body:", req.body);

        const senderUid = req.user.uid;
        const { requestId, action } = req.body;
        const idToken = req.headers.authorization?.split('Bearer ')[1];

        // Get the recipient's UID from username map
        try {
            if (!idToken) {
                return res.status(400).send({success: false, message: 'idToken is required'});
            }

            // Check if the friend request exists
            const senderInboxRef = admin.database().ref(`users/${senderUid}/protected/inbox`);
            const senderInboxSnapshot = await senderInboxRef.once('value');
            if (!senderInboxSnapshot.hasChild(requestId)) {
                return res.status(404).send({success: false, message: 'Friend request not found'});
            }

            if(action !== 'accept' && action !== 'reject') {
                return res.status(400).send({success: false, message: 'Invalid action'});
            }
            else if(action === 'reject') {
                await senderInboxRef.child(requestId).remove();
                return res.status(200).send({ success: true, message: "Friend request rejected successfully." });
            }
            else if(action === 'accept') {
                const recipientUid = senderInboxSnapshot.child(requestId).val().fromUid;
                const recipientUsername = senderInboxSnapshot.child(requestId).val().fromUser;

                const senderRef = admin.database().ref(`users/${senderUid}/public`);
                const senderSnapshot = await senderRef.once('value');
    
                if (!senderSnapshot.exists()) {
                    return res.status(404).send({success: false, message:'Sender not found'});
                }
                let senderUsername = senderSnapshot.val().username;

                const recipientFriendRef = admin.database().ref(`users/${recipientUid}/protected/friends/${senderUid}`);
                const senderFriendRef = admin.database().ref(`users/${senderUid}/protected/friends/${recipientUid}`);
                try {
                    await recipientFriendRef.set({
                        friendUsername: senderUsername,
                        friendUid: senderUid
                    });
                    await senderFriendRef.set({
                        friendUsername: recipientUsername,
                        friendUid: recipientUid
                    });
                    res.status(200).send({ success: true, message: "Friend request accepted successfully." });
                } catch (error) {
                    res.status(500).send({success: false, message: 'Failed to accept friend request'});
                }
            }

        } catch (error) {
            return res.status(500).send({success: false, message: 'Failed to handle friend request'});
        }
    });
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
