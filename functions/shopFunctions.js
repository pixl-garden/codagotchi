import { verifyToken } from './verifyToken';
import * as functions from 'firebase-functions';
import { admin } from './firebaseConfig';

// !  Needs a lot fo testing
export const doPurchase = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({ success: false, message: 'Forbidden!' });
    }

    verifyToken(req, res, async () => {
        try {
            const uid = req.user.uid;
            const { type, purchaseId } = req.body;

            // Validate input
            if (!['regular', 'crafting'].includes(type)) {
                return res.status(400).send({ success: false, message: 'Invalid purchase type' });
            }

            // Get the shop item
            const shopItemRef = admin.database().ref(`shop/${type}/${purchaseId}`);
            const shopItemSnapshot = await shopItemRef.once('value');
            const shopItem = shopItemSnapshot.val();

            if (!shopItem) {
                return res.status(404).send({ success: false, message: 'Shop item not found' });
            }

            // Get user data
            const userRef = admin.database().ref(`users/${uid}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val();

            // Check if user has enough currency/items
            if (type === 'regular') {
                const { currency, amount } = shopItem.cost;
                if (!userData.protected.currencies || userData.protected.currencies[currency] < amount) {
                    return res.status(400).send({ success: false, message: 'Insufficient funds' });
                }
            } else if (type === 'crafting') {
                for (const ingredient of shopItem.ingredients) {
                    if (!userData.protected.inventory || !userData.protected.inventory[ingredient.id] || userData.protected.inventory[ingredient.id] < ingredient.amount) {
                        return res.status(400).send({ success: false, message: 'Insufficient ingredients' });
                    }
                }
            }

            // Process the purchase
            let reward = shopItem.reward;

            // Update user data
            const updates = {};
            if (type === 'regular') {
                updates[`protected/currencies/${shopItem.cost.currency}`] = admin.database.ServerValue.increment(-shopItem.cost.amount);
            } else if (type === 'crafting') {
                for (const ingredient of shopItem.ingredients) {
                    updates[`protected/inventory/${ingredient.id}`] = admin.database.ServerValue.increment(-ingredient.amount);
                }
            }

            if (reward.type === 'item') {
                updates[`protected/inventory/${reward.id}`] = admin.database.ServerValue.increment(reward.amount);
            } else if (reward.type === 'currency') {
                updates[`protected/currencies/${reward.id}`] = admin.database.ServerValue.increment(reward.amount);
            }

            // Add purchase to history
            const purchaseHistoryRef = userRef.child('protected/purchaseHistory').push();
            updates[`protected/purchaseHistory/${purchaseHistoryRef.key}`] = {
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

export const doGachaRoll = functions.https.onRequest((req, res) => {
    if (req.method !== 'POST') {
        return res.status(403).send({ success: false, message: 'Forbidden!' });
    }

    verifyToken(req, res, async () => {
        try {
            const uid = req.user.uid;
            const { gachaId } = req.body;

            // Get the gacha details
            const gachaRef = admin.database().ref(`gachas/${gachaId}`);
            const gachaSnapshot = await gachaRef.once('value');
            const gachaDetails = gachaSnapshot.val();

            if (!gachaDetails) {
                return res.status(404).send({ success: false, message: 'Gacha not found' });
            }

            // Get user data
            const userRef = admin.database().ref(`users/${uid}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val();

            // Check if user has enough currency
            const { currency, amount } = gachaDetails.cost;
            if (!userData.protected.currencies || userData.protected.currencies[currency] < amount) {
                return res.status(400).send({ success: false, message: 'Insufficient funds for gacha roll' });
            }

            // Perform gacha roll (implement your gacha logic here)
            const reward = performGachaRoll(gachaDetails.possibleRewards);

            // Update user data
            const updates = {};
            updates[`protected/currencies/${currency}`] = admin.database.ServerValue.increment(-amount);

            if (reward.type === 'item') {
                updates[`protected/inventory/${reward.id}`] = admin.database.ServerValue.increment(reward.amount);
            } else if (reward.type === 'currency') {
                updates[`protected/currencies/${reward.id}`] = admin.database.ServerValue.increment(reward.amount);
            }

            // Add gacha roll to history
            const gachaHistoryRef = userRef.child('protected/gachaHistory').push();
            updates[`protected/gachaHistory/${gachaHistoryRef.key}`] = {
                gachaId,
                timestamp: admin.database.ServerValue.TIMESTAMP,
                reward,
            };

            // Perform the update
            await userRef.update(updates);

            return res.status(200).send({ success: true, message: 'Gacha roll successful', reward });
        } catch (error) {
            console.error('Gacha roll error:', error);
            return res.status(500).send({ success: false, message: 'An error occurred during the gacha roll' });
        }
    });
});

function performGachaRoll(possibleRewards) {
    // TODO
}
