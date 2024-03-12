import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseConfig';

const functions = getFunctions(app);
const auth = getAuth(app);
let accumulatedExperience = 0;

function simulateCodingActivity() {
    // TODO: Replace with actual activity detection
    accumulatedExperience += 1;
}

function updateExperiencePeriodically(userId) {
    if (accumulatedExperience > 0) {
        const gainExperience = httpsCallable(functions, 'gainExperience');
        gainExperience({ userId: userId, amount: accumulatedExperience })
            .then((result) => {
                console.log('Experience updated', result.data);
                accumulatedExperience = 0; 
            })
            .catch((error) => {
                console.error('Error updating experience:', error);
            });
    }
}

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userId = user.uid;
        setInterval(() => updateExperiencePeriodically(userId), 60000);
        setInterval(simulateCodingActivity, 1000);
    } else {

        console.log('User is not logged in.');
       
    }
});

export { simulateCodingActivity };
