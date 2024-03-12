import { app, database } from './firebaseConfig.js';
import { ref, set, onValue, update, push } from 'firebase/database';

// Helper to get a reference to the user's data
const getUserRef = (userId) => ref(database, `users/${userId}`);

// Helper to listen to the public data of a user
const listenToUserPublicData = (userId, callback) => {
  const userPublicRef = ref(database, `users/${userId}/public`);
  onValue(userPublicRef, (snapshot) => {
    callback(snapshot.val());
  });
};


// Helper to update the user's data
const updateUser = (userId, updates) => {
  const userRef = ref(database, `users/${userId}`);
  return update(userRef, updates);
};

// Helper to add to a user's inbox
const pushToUserInbox = (userId, message) => {
  const inboxRef = ref(database, `users/${userId}/protected/inbox`);
  const newInboxRef = push(inboxRef);
  return set(newInboxRef, message);
};

export { listenToUserPublicData, updateUser, pushToUserInbox };
