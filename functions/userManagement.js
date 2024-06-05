import { db } from './firebaseConfig.js';

const createUserProfile = async (githubUserId, githubUsername, tokenTime) => {
    const userRef = db.ref(`users/${githubUserId}`);
    await userRef.set({
        public: {
            uid: githubUserId.toString(), // Matches the GitHub user ID
            username: githubUsername,
            profile: {
                photoURL: `https://avatars.githubusercontent.com/u/${githubUserId}?v=4`,
                createdAt: new Date().getDate(),
                lastLoginAt: tokenTime,
                level: 1,
                experience: 0,
            },
            friends: {},
            owned: {
                 // default inventory
                inventory: {
                    
                },
                // equipped: {
                //     // default equipped items
                //     pet: {
                //         id: 
                //         name:
                //         hat:
                //     }
                // },
                // pets: {
                //     // default pets
                //     pet: {
                //         id: 
                //         name:
                //         hat:
                //     }
                    
                // }
            },
        },
        
        private: {
            inbox: {},
            friendRequests: {},
        }
    });
    console.log('User profile created');
};

export { createUserProfile };
