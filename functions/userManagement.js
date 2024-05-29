import { db } from './firebaseConfig.js';

const createUserProfile = async (githubUserId, githubUsername, tokenTime) => {
    const userRef = db.ref(`users/${githubUserId}`);
    await userRef.set({
        public: {
            uid: githubUserId.toString(), // Matches the GitHub user ID
            username: githubUsername,
            photoURL: `https://avatars.githubusercontent.com/u/${githubUserId}?v=4`,
            createdAt: tokenTime,
            lastLoginAt: tokenTime,
            lastSeenAt: tokenTime,
            level: 1,
            experience: 0,
            friends: {},
            status: "Hey there! I'm using WhatsApp.",
        },
        private: {
            inbox: {},
            friendRequests: {},
        },
    });
    console.log('User profile created');
};

export { createUserProfile };
