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

export const sendFriendRequest = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({success: false, message: 'Forbidden!'});
    }

    verifyToken(req, res, async () => {
        // console.log("req.user:", req.user);
        // console.log("req.body:", req.body);

        const senderUid = req.user.uid;
        const { recipientUsername } = req.body;
        const idToken = req.headers.authorization?.split('Bearer ')[1];


        let recipientUid;
        let senderUsername;

        try {
            if (!idToken) {
                return res.status(400).send('idToken is required');
            }

            const recipientRef = admin.database().ref(`userIdMappings/${recipientUsername}`);
            const recipientIdSnapshot = await recipientRef.once('value');


            if (!recipientIdSnapshot.exists()) {
                return res.status(404).send({success: false, message: 'Recipient not found'});
            }

            if (parseInt(recipientIdSnapshot.val().userId) === parseInt(senderUid)) {
                return res.status(400).send({success: false, message: 'You cannot send a friend request to yourself'});
            }

            const recipientProtectedRef = admin.database().ref(`users/${recipientIdSnapshot.val().userId}/protected/social`);
            if ((await recipientProtectedRef.once('value')).exists()) {
                    try {
                    const recipientProtectedSnapshot = await recipientProtectedRef.once('value');
                    const friendRequests = recipientProtectedSnapshot.child('friendRequests').val() || {};
                    const friends = recipientProtectedSnapshot.child('friends').val() || {};

                    if (friendRequests) {
                        for (let requestId in friendRequests) {
                            if (parseInt(friendRequests[requestId].fromUid) === parseInt(senderUid)) {
                                return res.status(400).send({ success: false, message: 'Friend request already sent' });
                            }
                        }
                    }

                    if (friends[senderUid]) {
                        return res.status(400).send({ success: false, message: 'You are already friends' });
                    }
                    
                } catch (error) {
                    console.error('Failed to check if friend request already sent:', error);
                    return res.status(500).send({ success: false, message: 'Failed to check if friend request already sent' });
                }
            }
            
            // if the recipient already sent a request to you, automatically accept it
            const senderInboxRef = admin.database().ref(`users/${senderUid}/protected/social/friendRequests`);
            const senderInboxSnapshot = await senderInboxRef.once('value');
            senderInboxSnapshot.forEach(async (childSnapshot) => {
                if (parseInt(childSnapshot.val().fromUid) === parseInt(recipientIdSnapshot.val().userId)) {
                    try {
                        const recipientUid = childSnapshot.val().fromUid;
                        const recipientUsername = childSnapshot.val().fromUser;

                        // Get sender's username from their public profile
                        const senderRef = admin.database().ref(`users/${senderUid}/public`);
                        const senderSnapshot = await senderRef.once('value');
                        if (!senderSnapshot.exists()) {
                            return res.status(404).send({ success: false, message: 'Sender not found' });
                        }
                        const senderUsername = senderSnapshot.val().username;

                        // Friend references for both sender and recipient
                        const recipientFriendRef = admin.database().ref(`users/${recipientUid}/protected/social/friends/${senderUid}`);
                        const senderFriendRef = admin.database().ref(`users/${senderUid}/protected/social/friends/${recipientUid}`);

                        // Add each other to their friends lists
                        await recipientFriendRef.set({ friendUsername: senderUsername, friendUid: senderUid, addedAt: admin.database.ServerValue.TIMESTAMP});
                        await senderFriendRef.set({ friendUsername: recipientUsername, friendUid: recipientUid, addedAt: admin.database.ServerValue.TIMESTAMP});

                        // Remove the request from both inboxes
                        try {
                            await senderInboxRef.child(childSnapshot.key).remove();
                        } catch (error) {
                            console.error('Error removing friend request:', error);       
                        }
                        try {
                            await admin.database().ref(`users/${recipientUid}/protected/social/friendRequests/${childSnapshot.key}`).remove();
                        } catch (error) {
                            console.error('Error removing friend request:', error);
                        }
                        return res.status(200).send({ success: true, message: "Friend request accepted automatically." });
                    } catch (error) {
                        console.error('Error accepting friend request:', error);
                        return res.status(500).send({ success: false, message: 'Internal server error' });
                    }
                }
            });

            const senderRef = admin.database().ref(`users/${senderUid}/public`);
            const senderSnapshot = await senderRef.once('value');

            if (!senderSnapshot.exists()) {
                return res.status(404).send({success: false, message:'Sender not found'});
            }

            // it's in userId field of the entry
            recipientUid = recipientIdSnapshot.val().userId;
            senderUsername = senderSnapshot.val().username;
            
        } catch (error) {
            console.error('Failed to find recipient:', error);
            return res.status(500).send({success: false, message: 'Failed to find recipient'});
        }

        const inboxRef = admin.database().ref(`users/${recipientUid}/protected/social/friendRequests`);
        try {
            await inboxRef.child(senderUid).set({
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

export const sendPostcard = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({success: false, message: 'Forbidden! Only GET requests are allowed.'});
    }

    let recipientUid;
    let senderUsername;
    // const idToken = req.headers.authorization?.split('Bearer ')[1];


    verifyToken(req, res, async () => {
        const senderUid = req.user.uid;
        const { recipientUsername, postcardJSON } = req.body;

        try {
            const recipientRef = admin.database().ref(`userIdMappings/${recipientUsername}`);
            const recipientIdSnapshot = await recipientRef.once('value');
            recipientUid = recipientIdSnapshot.val().userId

            if (!recipientIdSnapshot.exists()) {
                return res.status(404).send({success: false, message: 'Recipient not found'});
            }

            if (parseInt(recipientIdSnapshot.val().userId) === parseInt(senderUid)) {
                return res.status(400).send({success: false, message: 'You cannot send a postcard to yourself'});
            }

            const recipientProtectedRef = admin.database().ref(`users/${recipientIdSnapshot.val().userId}/protected/social`);
            if ((await recipientProtectedRef.once('value')).exists()) {
                    try {
                    const recipientProtectedSnapshot = await recipientProtectedRef.once('value');
                    const friends = recipientProtectedSnapshot.child('friends').val() || {};

                    if (!friends[senderUid]) {
                        return res.status(400).send({ success: false, message: 'You must be friends with this user to send a postcard' });
                    }
                    
                } catch (error) {
                    return res.status(500).send({ success: false, message: 'Failed to check if friends' });
                }
            }

            const inboxRef = admin.database().ref(`users/${recipientUid}/protected/social/postcards`);
            const senderRef = admin.database().ref(`users/${senderUid}/public`);
            const senderSnapshot = await senderRef.once('value');

            if (!senderSnapshot.exists()) {
                return res.status(404).send({success: false, message:'Sender not found'});
            }

            senderUsername = senderSnapshot.val().username;
            try {
                await inboxRef.push({
                    fromUid: senderUid,
                    fromUser: senderUsername,
                    type: 'postcard',
                    postcard: postcardJSON,
                    createdAt: admin.database.ServerValue.TIMESTAMP
                });
                res.status(200).send({ success: true, message: "Postcard sent successfully." });
            } catch (error) {
                res.status(500).send({success: false, message: 'Failed to send postcard'});
            }
        }
        catch (error) {
            console.error('Failed to find recipient:', error);
        }
    });
});

export const retrieveInbox = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(403).send({success: false, message: 'Forbidden! Only GET requests are allowed.'});
    }

    verifyToken(req, res, async () => {
        const uid = req.user.uid; // User UID from verified token

        // Path to the user's inbox
        const inboxRef = admin.database().ref(`users/${uid}/protected/social`);
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

export const handleFriendRequest = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({success: false, message: 'Forbidden!'});
    }

    verifyToken(req, res, async () => {
        const senderUid = req.user.uid;
        const { requestId, action } = req.body;
        const idToken = req.headers.authorization?.split('Bearer ')[1];

        // Get the recipient's UID from username map
        try {
            if (!idToken) {
                return res.status(400).send({success: false, message: 'idToken is required'});
            }

            // Check if the friend request exists
            const senderInboxRef = admin.database().ref(`users/${senderUid}/protected/social/friendRequests`);
            const senderInboxSnapshot = await senderInboxRef.once('value');
            if (!senderInboxSnapshot.hasChild(requestId)) {
                return res.status(404).send({success: false, message: senderInboxSnapshot});
            }

            if(action !== 'accept' && action !== 'reject') {
                return res.status(400).send({success: false, message: 'Invalid action'});
            }
            else if(action === 'reject') {
                await senderInboxRef.child(requestId).remove();
                return res.status(200).send({ success: true, message: "Friend request rejected successfully." });
            }
            else if(action === 'accept') {
                // Get the recipient's UID and username from the sender's inbox
                const recipientUid = senderInboxSnapshot.child(requestId).val().fromUid;
                const recipientUsername = senderInboxSnapshot.child(requestId).val().fromUser;

                // Get the sender's username from the sender's public profile
                const senderRef = admin.database().ref(`users/${senderUid}/public`);
                const senderSnapshot = await senderRef.once('value');
                if (!senderSnapshot.exists()) {
                    return res.status(404).send({success: false, message:'Sender not found'});
                }
                let senderUsername = senderSnapshot.val().username;

                const recipientFriendRef = admin.database().ref(`users/${recipientUid}/protected/social/friends/${senderUid}`);
                const senderFriendRef = admin.database().ref(`users/${senderUid}/protected/social/friends/${recipientUid}`);
                
                // Add the sender to the recipient's friends list and vice versa
                try {
                    await recipientFriendRef.set({
                        friendUsername: senderUsername,
                        friendUid: senderUid,
                        addedAt: admin.database.ServerValue.TIMESTAMP
                    });
                    await senderFriendRef.set({
                        friendUsername: recipientUsername,
                        friendUid: recipientUid,
                        addedAt: admin.database.ServerValue.TIMESTAMP
                    });
                    // remove the request from the recipient's inbox
                    await senderInboxRef.child(requestId).remove();

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
