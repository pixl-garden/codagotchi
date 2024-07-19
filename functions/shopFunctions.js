import { getUserPublicRef, getUserPrivateRef, getUserProtectedInboxRef, pushToRef, handleError, checkAuthenticated } from './firebaseHelpers.js';
import * as functions from 'firebase-functions';
import {admin} from "./firebaseConfig.js";
import verifyToken from './verifyToken.js';

// General function to do a purchase
// Purchase later will be split into three types: purchase form a shop, purchase from a gatcha machine or crafting (which is buying with not a typical currency)
// The function will be called by the client app

/* 
    Request body:
    {
        from: string, // the user id of the user who is making the purchase
        type: string, // the type of the purchase (shop, gatcha, crafting)
        amount: number, // the amount of the purchase
        idPurchased: string, // the id of the item purchased
        purchasedWith: Object // the currency used to make the purchase, it could be multiple items in case of crafting for example, like a beach ball bought with 5 shells and 2 sand

    }
*/

export const doPurchase = functions.https.onCall(async (req, res) => {
    
    if (req.method !== 'POST') {
        return res.status(403).send({success: false, message: 'Forbidden!'});
    }
    verifyToken(req, res, async () => {
       
         try {
             const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) {
                return res.status(400).send('idToken is required');
            }
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            
            const {from, type, amount, idPurchased, purchasedWith} = req.body;

            // TODO
    
        } catch (error) {
            return res.status(400).send({success: false, message: error.message});
        }
    });
});

