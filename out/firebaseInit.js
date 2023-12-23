"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
const app_1 = require("firebase/app");
const database_1 = require("firebase/database");
const firebaseConfig = {
    apiKey: "AIzaSyDFc92UaOqBvW8x0jgPLyYMThFajvsHx08",
    authDomain: "codagotchi.firebaseapp.com",
    databaseURL: "https://codagotchi-default-rtdb.firebaseio.com",
    projectId: "codagotchi",
    storageBucket: "codagotchi.appspot.com",
    messagingSenderId: "906441550178",
    appId: "1:906441550178:web:e5cb32c275f5aba305643b",
    measurementId: "G-VFZ7XW9BGH"
};
const app = (0, app_1.initializeApp)(firebaseConfig);
const database = (0, database_1.getDatabase)(app);
exports.database = database;
//# sourceMappingURL=firebaseInit.js.map