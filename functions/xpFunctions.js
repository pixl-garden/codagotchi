import { ref, runTransaction } from 'firebase/database';
import { db } from './firebaseConfig.js';
import levelMap from './level_map.json'; 

const gainExperience = (userId, amount) => {
    const userRef = ref(db, `users/${userId}/public`);

    runTransaction(userRef, (user) => {
        if (user) {
            user.experience = (user.experience || 0) + amount;

            let nextLevelExp = levelMap[user.level.toString()] || 5000; // Default to 5000 if level not found
            while (user.experience >= nextLevelExp) {
                user.level += 1;
                user.experience -= nextLevelExp; 
                nextLevelExp = levelMap[user.level.toString()] || 5000; // Get next level's experience requirement
            }
        }
        return user; 
    })
        .then(() => {
            console.log('Experience gain Transaction successfully committed!');
        })
        .catch((error) => {
            console.log('Experience gain Transaction failed: ', error);
        });
};

export { gainExperience };
