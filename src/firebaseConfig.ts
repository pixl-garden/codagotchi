
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDFc92UaOqBvW8x0jgPLyYMThFajvsHx08",
  authDomain: "codagotchi.firebaseapp.com",
  databaseURL: "https://codagotchi-default-rtdb.firebaseio.com",
  projectId: "codagotchi",
  storageBucket: "codagotchi.appspot.com",
  messagingSenderId: "906441550178",
  appId: "1:906441550178:web:e5cb32c275f5aba305643b",
  measurementId: "G-VFZ7XW9BGH"
};
export { initializeApp, getDatabase, ref, push };



/* import { initializeApp, getDatabase, ref, push, firebaseConfig } from "./firebaseConfig"; */

// const app = initializeApp(firebaseConfig);
// const dbRef = ref(getDatabase(app), 'your_data_nodes');
// const newData = {
//   name: 'me',
//   age: 12
// };
// push(dbRef, newData);