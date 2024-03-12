
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: 'AIzaSyDFc92UaOqBvW8x0jgPLyYMThFajvsHx08',
    authDomain: 'codagotchi.firebaseapp.com',
    databaseURL: 'https://codagotchi-default-rtdb.firebaseio.com',
    projectId: 'codagotchi',
    storageBucket: 'codagotchi.appspot.com',
    messagingSenderId: '906441550178',
    appId: '1:906441550178:web:e5cb32c275f5aba305643b',
    measurementId: 'G-VFZ7XW9BGH',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const database = getDatabase(app);
const auth = getAuth(app);

export { app, database, analytics, auth };
