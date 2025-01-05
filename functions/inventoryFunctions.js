import { verifyToken } from './verifyToken.js';
import * as functions from 'firebase-functions';
import { admin } from './firebaseConfig.js';
import { log } from "firebase-functions/logger"
import { time } from 'console';
import * as pako from 'pako';

/*
 A function to periodically sync the user's inventory with the database.
 The function timeout is handled by the client. The client will call this function every ? minutes. 
    @param {Object} userRef - The user reference in the database
    @param [{Object}] inventoryUpdates - The inventory updates to be synced from the client
*/

// What could be the updates:
// 1. Adding / Removing / Transaction with items
// 1.1. Adding / Removing / Transaction with currencies (a part of the inventory field, so handled the same as items)
// 2. Owned customization items (like backgrounds or pets, etc.) - these are not part of the inventory field, so they need to be handled separately
// 2.1 Update user customization (bedroom updates) - setting the user's customization data
// 3. Pet updates (hunger, happiness, clothing, etc.) - setting the user's pet data
// 4. XP updates - updating the user's XP

async function processAllUpdates(uid, inventoryUpdates, petUpdates, gameUpdates, bedroomUpdates, socialUpdates, timestamp) {
    const updates = {};

    log("inventory updates", inventoryUpdates, "pet updates", petUpdates, "game updates", gameUpdates, "bedroom updates", bedroomUpdates, "timestamp", timestamp)

    if(timestamp) {
        updates[`/users/${uid}/protected/lastSync`] = timestamp;
    }

    // Process inventory updates
    if (inventoryUpdates && Object.keys(inventoryUpdates).length > 0) {
        for (const [key, value] of Object.entries(inventoryUpdates)) {
            log("inventory updates", inventoryUpdates);
            if(value === 0) {
                log("deleting item", key);
                updates[`/users/${uid}/protected/inventory/${key}`] = null;
            } else {
                log("updating item", key, value);
                updates[`/users/${uid}/protected/inventory/${key}`] = value;
            }
        }
    }

    // Process pet updates
    if (petUpdates) {
        for (const [key, value] of Object.entries(petUpdates)) {
            updates[`/users/${uid}/protected/pet/${key}`] = value;
        }
    }

    // Process customization updates
    if (gameUpdates) {
        for (const [key, value] of Object.entries(gameUpdates)) {
            updates[`/users/${uid}/protected/game/${key}`] = value;
        }
    }

    // Process bedroom updates
    if(bedroomUpdates) {
        log("bedroom updates", bedroomUpdates)
        updates[`/users/${uid}/public/bedroom`] = bedroomUpdates;
    }

    if (socialUpdates) {
        log("social updates", socialUpdates);
        
        // Handle outgoing friend requests
        if (socialUpdates.outgoingFriendRequests?.length > 0) {
            for (const recipientUsername of socialUpdates.outgoingFriendRequests) {
                try {
                    const friendRequestUpdates = await handleFriendRequest(uid, recipientUsername);
                    Object.assign(updates, friendRequestUpdates);
                } catch (error) {
                    console.error(`Failed to process friend request to ${recipientUsername}:`, error);
                }
            }
        }

        // Handle friend request responses
        if (socialUpdates.handledFriendRequests && Object.keys(socialUpdates.handledFriendRequests).length > 0) {
            for (const [requestId, action] of Object.entries(socialUpdates.handledFriendRequests)) {
                try {
                    const responseUpdates = await handleFriendRequestResponse(uid, requestId, action);
                    Object.assign(updates, responseUpdates);
                } catch (error) {
                    console.error(`Failed to handle friend request ${requestId}:`, error);
                }
            }
        }

        // Handle friend removals
        if (socialUpdates.removedFriends?.length > 0) {
            for (const username of socialUpdates.removedFriends) {
                try {
                    const removalUpdates = await handleFriendRemoval(uid, username);
                    Object.assign(updates, removalUpdates);
                } catch (error) {
                    console.error(`Failed to remove friend ${username}:`, error);
                }
            }
        }
    }

    // Perform the update if there are any changes
    if (Object.keys(updates).length > 0) {
        try {
            await admin.database().ref().update(updates);
        } catch (error) {
            console.error('Error updating user data:', error);
            throw new Error('Failed to update user data');
        }
    }
}

export const syncUserData = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({ success: false, message: 'Forbidden! Only POST requests are allowed.' });
    }

    verifyToken(req, res, async () => {
        try {
            // console.log("req user:", req.user);
            const uid = req.user.uid;
            const { inventoryUpdates, petUpdates, gameUpdates, bedroomUpdates, socialUpdates, timestamp } = req.body;

            // Process all updates
            await processAllUpdates(uid, inventoryUpdates, petUpdates, gameUpdates, bedroomUpdates, socialUpdates, timestamp );

            res.status(200).send({ success: true, message: 'User data synced successfully' });
            
        } catch (error) {
            console.error('Sync user data error:', error);
            res.status(500).send({ success: false, message: 'An error occurred while syncing user data' });
        }
    });
});

//TODO: REMOVE THIS FUNCTION

export const retrieveInventory = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(403).send({ success: false, message: 'Forbidden! Only GET requests are allowed.' });
    }

    verifyToken(req, res, async () => {
        const uid = req.user.uid;

        const inventoryRef = admin.database().ref(`users/${uid}/protected/inventory`);
        const timestampRef = admin.database().ref(`users/${uid}/protected/lastSync`);
        try {
            const inventorySnapshot = await inventoryRef.once('value');
            const serverTimeStamp = await timestampRef.once('value'); //TODO: make snapshots into one snapshot (await)
            const inventoryData = inventorySnapshot.val() || {};

            const { timestamp, totalItems } = req.query;
            const lastFetchTime = parseInt(timestamp || 0);
            const clientTotalItems = parseInt(totalItems || 0);

            let responseData = {};

            const serverTotalItems = Object.keys(inventoryData).length;
            console.log(`Server Total Items: ${serverTotalItems}, Client Total Items: ${clientTotalItems}`);

            let flag = 'no-replace';
            if (serverTotalItems !== clientTotalItems || lastFetchTime !== serverTimeStamp.val()) {
                console.log('Mismatch detected in total items. Needs full replace.');
                responseData = pako.deflate(JSON.stringify(inventoryData), { to: 'string' });
                flag = 'replace';
            }
            
            const currentTimestamp = Date.now();
            timestampRef.set(currentTimestamp);

            res.status(200).send({
                success: true,
                flag: flag,
                inventoryData: responseData,
                timestamp: currentTimestamp,
            });
        } catch (error) {
            console.error('Failed to retrieve inventory:', error);
            res.status(500).send({ success: false, message: 'Failed to retrieve inventory' });
        }
    });
});

async function handleFriendRequest(senderUid, recipientUsername) {
    try {
        // Check recipient exists
        const recipientRef = admin.database().ref(`userIdMappings/${recipientUsername}`);
        const recipientSnapshot = await recipientRef.once('value');

        if (!recipientSnapshot.exists()) {
            throw new Error('Recipient not found');
        }

        const recipientUid = recipientSnapshot.val().userId;

        // Check not sending to self
        if (parseInt(recipientUid) === parseInt(senderUid)) {
            throw new Error('Cannot send friend request to yourself');
        }

        // Get sender info
        const senderRef = admin.database().ref(`users/${senderUid}/public`);
        const senderSnapshot = await senderRef.once('value');
        
        if (!senderSnapshot.exists()) {
            throw new Error('Sender not found');
        }
        
        const senderUsername = senderSnapshot.val().username;

        // Check existing requests and friendship
        const recipientSocialRef = admin.database().ref(`users/${recipientUid}/protected/social`);
        const recipientSocialSnapshot = await recipientSocialRef.once('value');

        if (recipientSocialSnapshot.exists()) {
            const friendRequests = recipientSocialSnapshot.child('friendRequests').val() || {};
            const friends = recipientSocialSnapshot.child('friends').val() || {};

            // Check if request already sent
            for (let requestId in friendRequests) {
                if (parseInt(friendRequests[requestId].fromUid) === parseInt(senderUid)) {
                    throw new Error('Friend request already sent');
                }
            }

            // Check if already friends
            if (friends[senderUid]) {
                throw new Error('Already friends');
            }
        }

        // Check for and handle reciprocal request
        const senderInboxRef = admin.database().ref(`users/${senderUid}/protected/social/friendRequests`);
        const senderInboxSnapshot = await senderInboxRef.once('value');
        
        const updates = {};

        let wasAutoAccepted = false;
        senderInboxSnapshot.forEach(async (childSnapshot) => {
            if (parseInt(childSnapshot.val().fromUid) === parseInt(recipientUid)) {
                // Auto-accept the reciprocal request
                updates[`users/${recipientUid}/protected/social/friends/${senderUid}`] = {
                    friendUsername: senderUsername,
                    friendUid: senderUid,
                    addedAt: admin.database.ServerValue.TIMESTAMP
                };

                updates[`users/${senderUid}/protected/social/friends/${recipientUid}`] = {
                    friendUsername: recipientUsername,
                    friendUid: recipientUid,
                    addedAt: admin.database.ServerValue.TIMESTAMP
                };

                // Remove both requests
                updates[`users/${senderUid}/protected/social/friendRequests/${childSnapshot.key}`] = null;
                updates[`users/${recipientUid}/protected/social/friendRequests/${childSnapshot.key}`] = null;
                
                wasAutoAccepted = true;
            }
        });

        if (!wasAutoAccepted) {
            // Send new friend request
            updates[`users/${recipientUid}/protected/social/friendRequests/${senderUid}`] = {
                fromUid: senderUid,
                fromUser: senderUsername,
                type: 'friendRequest',
                createdAt: admin.database.ServerValue.TIMESTAMP
            };
        }

        return updates;
    } catch (error) {
        console.error('Friend request error:', error);
        throw error;
    }
}

async function handleFriendRequestResponse(uid, requestId, action) {
    try {
        // Check if the friend request exists
        const senderInboxRef = admin.database().ref(`users/${uid}/protected/social/friendRequests`);
        const senderInboxSnapshot = await senderInboxRef.once('value');
        
        if (!senderInboxSnapshot.hasChild(requestId)) {
            throw new Error('Friend request not found');
        }

        if (action !== 'accept' && action !== 'reject') {
            throw new Error('Invalid action');
        }

        const updates = {};

        if (action === 'reject') {
            // Simply remove the request
            updates[`users/${uid}/protected/social/friendRequests/${requestId}`] = null;
        } else if (action === 'accept') {
            // Get the recipient's info from the request
            const recipientUid = senderInboxSnapshot.child(requestId).val().fromUid;
            const recipientUsername = senderInboxSnapshot.child(requestId).val().fromUser;

            // Get sender's username
            const senderRef = admin.database().ref(`users/${uid}/public`);
            const senderSnapshot = await senderRef.once('value');
            
            if (!senderSnapshot.exists()) {
                throw new Error('Sender not found');
            }
            
            const senderUsername = senderSnapshot.val().username;

            // Add to both friends lists
            updates[`users/${recipientUid}/protected/social/friends/${uid}`] = {
                friendUsername: senderUsername,
                friendUid: uid,
                addedAt: admin.database.ServerValue.TIMESTAMP
            };

            updates[`users/${uid}/protected/social/friends/${recipientUid}`] = {
                friendUsername: recipientUsername,
                friendUid: recipientUid,
                addedAt: admin.database.ServerValue.TIMESTAMP
            };

            // Remove the request
            updates[`users/${uid}/protected/social/friendRequests/${requestId}`] = null;
        }

        return updates;
    } catch (error) {
        console.error('Friend request response error:', error);
        throw error;
    }
}

async function handleFriendRemoval(uid, username) {
    try {
        // Get the user ID for the username
        const userIdRef = admin.database().ref(`userIdMappings/${username}`);
        const userIdSnapshot = await userIdRef.once('value');
        
        if (!userIdSnapshot.exists()) {
            throw new Error('User not found');
        }
        
        const toUserId = userIdSnapshot.val().userId;

        // Check if they are actually friends
        const friendsRef = admin.database().ref(`users/${uid}/protected/social/friends/${toUserId}`);
        const friendSnapshot = await friendsRef.once('value');
        
        if (!friendSnapshot.exists()) {
            throw new Error('Users are not friends');
        }

        const updates = {};

        // Remove from both users' friend lists
        updates[`users/${uid}/protected/social/friends/${toUserId}`] = null;
        updates[`users/${toUserId}/protected/social/friends/${uid}`] = null;

        return updates;
    } catch (error) {
        console.error('Friend removal error:', error);
        throw error;
    }
}
