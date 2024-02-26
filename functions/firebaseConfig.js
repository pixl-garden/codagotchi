// This file is used to initialize the firebase-admin SDK

import admin from 'firebase-admin';

admin.initializeApp();

const db = admin.database();

export { admin, db };
