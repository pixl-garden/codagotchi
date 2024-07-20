import { getUserPublicRef, getUserPrivateRef, getUserProtectedInboxRef, pushToRef, handleError, checkAuthenticated } from './firebaseHelpers.js';
import * as functions from 'firebase-functions';
import {admin} from "./firebaseConfig.js";
import verifyToken from './verifyToken.js';

// General function to do a purchase
// Purchase later will be split into three types: purchase form a shop, purchase from a gatcha machine or crafting (which is buying with not a typical currency)
// The function will be called by the client app
// !TODO setup SHOP
/* 
    Request body:
    {
        from: string, // the user id of the user who is making the purchase
        type: string, // the type of the purchase (shop, gatcha, crafting)
        amount: number, // the amount of the purchase
        purchaseId: string, // the id of the purchase, it could be the id of the shop item, the id of the gatcha machine or the id of the crafting recipe
        idPurchased: string, // the id of the item purchased
    }
*/

import { verifyToken } from './verifyToken';
import { selectGachaReward } from './gachaModule'; // We'll create this module later
import * as functions from 'firebase-functions';
import { admin } from './firebaseConfig';

export const doPurchase = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({ success: false, message: 'Forbidden!' });
    }

    verifyToken(req, res, async () => {
        try {
            const uid = req.user.uid;
            const { type, purchaseId } = req.body;

            // Validate input
            if (!['regular', 'gacha', 'crafting'].includes(type)) {
                return res.status(400).send({ success: false, message: 'Invalid purchase type' });
            }

            // Get the shop item
            const shopItemRef = admin.database().ref(`shop/${type}/${purchaseId}`);
            const shopItemSnapshot = await shopItemRef.once('value');
            const shopItem = shopItemSnapshot.val();

            if (!shopItem) {
                return res.status(404).send({ success: false, message: 'Shop item not found' });
            }

            const userRef = admin.database().ref(`users/${uid}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val();

            // Check if user has enough currency/items
            if (type === 'regular' || type === 'gacha') {
                const { currency, amount } = shopItem.cost;
                if (!userData.currencies || userData.currencies[currency] < amount) {
                    return res.status(400).send({ success: false, message: 'Insufficient funds' });
                }
            } else if (type === 'crafting') {
                for (const ingredient of shopItem.ingredients) {
                    if (!userData.inventory || !userData.inventory[ingredient.id] || userData.inventory[ingredient.id] < ingredient.amount) {
                        return res.status(400).send({ success: false, message: 'Insufficient ingredients' });
                    }
                }
            }

            // Process the purchase
            let reward;
            if (type === 'regular') {
                reward = shopItem.reward;
            } else if (type === 'gacha') {
                reward = await selectGachaReward(shopItem.possibleRewards);
            } else if (type === 'crafting') {
                reward = shopItem.reward;
            }

            // Update user data
            const updates = {};
            if (type === 'regular' || type === 'gacha') {
                updates[`currencies/${shopItem.cost.currency}`] = admin.database.ServerValue.increment(-shopItem.cost.amount);
            } else if (type === 'crafting') {
                for (const ingredient of shopItem.ingredients) {
                    updates[`inventory/${ingredient.id}`] = admin.database.ServerValue.increment(-ingredient.amount);
                }
            }

            if (reward.type === 'item') {
                updates[`inventory/${reward.id}`] = admin.database.ServerValue.increment(reward.amount);
            } else if (reward.type === 'currency') {
                updates[`currencies/${reward.id}`] = admin.database.ServerValue.increment(reward.amount);
            }

            // Add purchase to history
            const purchaseHistoryRef = userRef.child('purchaseHistory').push();
            updates[`purchaseHistory/${purchaseHistoryRef.key}`] = {
                type,
                purchaseId,
                timestamp: admin.database.ServerValue.TIMESTAMP,
                reward,
            };

            // Perform the update
            await userRef.update(updates);

            return res.status(200).send({ success: true, message: 'Purchase successful', reward });
        } catch (error) {
            console.error('Purchase error:', error);
            return res.status(500).send({ success: false, message: 'An error occurred during the purchase' });
        }
    });
});
